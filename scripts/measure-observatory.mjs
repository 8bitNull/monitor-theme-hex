import {chromium} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import {gzipSync} from 'node:zlib'
import {base,root,loadFixture,prepare} from './capture-observatory.mjs'

const observationMs=10_000
const fixture=await loadFixture(),out=process.env.OBS_PERF_DIR||`${root}/baseline`,runs=[]
await mkdir(out,{recursive:true})
const browser=await chromium.launch()
try{
 for(let run=0;run<5;run++){
  const page=await browser.newPage({viewport:{width:1024,height:768},reducedMotion:'reduce'}),requests=[],assets=[],errors=[],pending=[]
  page.on('pageerror',error=>errors.push(String(error)))
  page.on('request',request=>requests.push({url:request.url(),method:request.method(),type:request.resourceType()}))
  page.on('response',response=>{
   if(/\.(js|css)(?:\?|$)/.test(response.url()))pending.push(response.body().then(body=>assets.push({url:response.url(),bytes:body.length,gzipBytes:gzipSync(body).length})))
  })
  await prepare(page,fixture)
  await page.addInitScript(()=>{
   window.__observatory={lcp:0,cls:0,longtasks:[]}
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.__observatory.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true})
   new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)window.__observatory.cls+=e.value}).observe({type:'layout-shift',buffered:true})
   new PerformanceObserver(list=>{for(const e of list.getEntries())window.__observatory.longtasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask',buffered:true})
  })
  await page.goto(base);await page.locator('.node-card').first().waitFor();await page.waitForTimeout(observationMs)
  const load=await page.evaluate(()=>({...window.__observatory,requests:performance.getEntriesByType('resource').length}))
  await Promise.all(pending)
  const loadRequests=[...requests],homeAssets=[...assets]
  // Measure from DOM input/click dispatch through two animation frames, including React render/paint opportunity.
  const interactions=await page.evaluate(async()=>{
   const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
   const measure=async(action)=>{const start=performance.now();action();await frame();return performance.now()-start}
   const input=document.querySelector('input[type=search]'),set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set
   const filterMs=await measure(()=>{set.call(input,'Tokyo');input.dispatchEvent(new Event('input',{bubbles:true}))})
   const filteredCards=document.querySelectorAll('.node-card').length
   await measure(()=>{set.call(input,'');input.dispatchEvent(new Event('input',{bubbles:true}))})
   const viewMs=await measure(()=>document.querySelectorAll('.view-switch button')[1].click())
   return {filterMs,viewMs,filteredCards,tableVisible:!!document.querySelector('.table-scroll')}
  })
  const interactionRequests=requests.slice(loadRequests.length),detailRequestStart=requests.length,detailAssetStart=assets.length
  await page.goto(`${base}/node/${fixture.nodes[0].id}`)
  await page.locator('.detail-live').waitFor();await page.locator('.recharts-area-curve').first().waitFor();await page.waitForTimeout(observationMs)
  const detailLoad=await page.evaluate(()=>({...window.__observatory,requests:performance.getEntriesByType('resource').length}))
  await Promise.all(pending)
  const detailAssets=assets.slice(detailAssetStart)
  runs.push({run:run+1,load,assets:homeAssets,gzipBytes:homeAssets.reduce((sum,a)=>sum+a.gzipBytes,0),requests:loadRequests,interactionRequests,interactions,detail:{load:detailLoad,assets:detailAssets,gzipBytes:detailAssets.reduce((sum,a)=>sum+a.gzipBytes,0),requests:requests.slice(detailRequestStart)},errors})
  await page.close()
 }
}finally{await browser.close()}
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]
const summary={lcpMedian:median(runs.map(r=>r.load.lcp)),clsMax:Math.max(...runs.map(r=>r.load.cls)),detailLcpMedian:median(runs.map(r=>r.detail.load.lcp)),detailClsMax:Math.max(...runs.map(r=>r.detail.load.cls)),detailGzipBytes:runs[0].detail.gzipBytes,filterMedian:median(runs.map(r=>r.interactions.filterMs)),viewMedian:median(runs.map(r=>r.interactions.viewMs)),gzipBytes:runs[0].gzipBytes,requestCounts:runs.map(r=>r.requests.length)}
await writeFile(`${out}/performance.json`,JSON.stringify({base,viewport:{width:1024,height:768},fixtureNodes:fixture.nodes.length,observationMs,method:'5 cold browser contexts; fixed fixture; 10-second observation after ready content on each load; home then full-document detail navigation in same context; input/click to two animation frames',summary,runs},null,2))
console.log(JSON.stringify(summary,null,2))
if(runs.some(r=>r.errors.length||r.interactions.filteredCards!==1||!r.interactions.tableVisible))throw new Error('Page errors or interaction verification failed')
