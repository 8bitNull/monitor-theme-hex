import {chromium} from '@playwright/test'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {dirname} from 'node:path'
import {nodes,metrics} from './fixtures.mjs'

const out=process.env.DETAIL_CAPTURE_DIR||'artifacts/detail-aesthetics/after'
const base=process.env.DETAIL_BASE_URL||'http://127.0.0.1:4231'
const fixturePath=process.env.DETAIL_FIXTURE_PATH||'artifacts/detail-aesthetics/fixture.json'
const widths=process.env.DETAIL_CAPTURE_WIDTHS?.split(',').map(Number)||[320,390,430,721,768,900,1024,1279,1280,1440,1920]
const languages=process.env.DETAIL_CAPTURE_LANGUAGES?.split(',')||['zh','en']
const appearances=process.env.DETAIL_CAPTURE_APPEARANCES?.split(',')||['light','dark']
await mkdir(out,{recursive:true})
await mkdir(dirname(fixturePath),{recursive:true})
let fixture
try{fixture=JSON.parse(await readFile(fixturePath,'utf8'))}
catch(error){
 if(error.code!=='ENOENT')throw error
 fixture={now:Date.now(),nodes:[nodes()[0]],history:metrics()}
 await writeFile(fixturePath,JSON.stringify(fixture))
}
if(!fixture.now||!fixture.nodes?.length||!fixture.history?.metrics?.length)throw new Error(`Incomplete detail fixture: ${fixturePath}`)
const browser=await chromium.launch()
for(const width of widths){
 for(const lang of languages)for(const appearance of appearances){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'})
  await page.clock.setFixedTime(fixture.now)
  await page.addInitScript(({lang,appearance})=>{
   localStorage.setItem('monitor-next-language',lang)
   localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:2,appearance}))
  },{lang,appearance})
  await page.routeWebSocket('**/api/ws',s=>s.close())
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:fixture.nodes}}))
  await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:fixture.history}))
  await page.goto(`${base}/node/1`)
  await page.locator(width<=720?'.ma-detail-overview':'.detail-live').waitFor()
  if(width>720){
   await page.locator('.recharts-area-curve').first().waitFor()
   await page.locator('.resource-trend[data-metric=cpu] svg path').waitFor()
  }
  const stem=`${width}-${lang}-${appearance}`
  await page.screenshot({path:`${out}/${stem}-overview.png`,fullPage:true})
  if(width<=720){
   for(const name of (lang==='zh'?['资源','网络','资料']:['Resources','Network','Info'])){
    await page.locator('.ma-detail-tabs').getByRole('button',{name,exact:true}).click()
    const selector=['资源','Resources'].includes(name)?'.detail-resource-charts':['网络','Network'].includes(name)?'.latency-view':'.detail-facts'
    await page.locator(selector).first().waitFor()
    if(['资源','Resources'].includes(name))await page.locator('.recharts-area-curve').first().waitFor()
    await page.screenshot({path:`${out}/${stem}-${name}.png`,fullPage:true})
   }
  }
  await page.close()
 }
}
await browser.close()
