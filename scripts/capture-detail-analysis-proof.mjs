import {chromium} from '@playwright/test'
import {mkdirSync,copyFileSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const dest='archive/screenshots/v0.0.20',root='tests/artifacts/detail-analysis';mkdirSync(dest,{recursive:true})
const copies={
 'home-1440-light.png':'../home-light.png','home-1440-dark.png':'../home-dark.png','home-390-light.png':'../mobile-light.png','home-390-dark.png':'../mobile-dark.png',
 'current-1440-light-detail.png':'../detail-light.png','current-1440-dark-latency.png':'../latency-dark.png',
 'current-390-light-detail.png':'mobile-detail-light.png','current-390-dark-detail.png':'mobile-detail-dark.png','current-390-dark-latency.png':'mobile-latency-dark.png','current-1440-dark-detail.png':'desktop-detail-dark.png',
 'presets-390-light.png':'presets-390-light.png','presets-390-dark.png':'presets-390-dark.png','card-390-light.png':'card-full-light.png','slim-390-light.png':'slim-390-light-card.png',
 'compare-1440-light-detail.png':'compare-desktop-detail.png','compare-390-light-detail.png':'compare-mobile-detail.png'
}
for(const [a,b] of Object.entries(copies))copyFileSync(`${root}/${a}`,`${dest}/${b}`)
const browser=await chromium.launch({channel:'chrome'})
try{
 for(const mode of ['light','dark']){
  const page=await browser.newPage({viewport:{width:320,height:900},reducedMotion:'reduce'})
  await page.addInitScript(mode=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:mode})),mode)
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],cpu_name:'AMD EPYC 9754 128-Core Processor / Dedicated Compute Node',ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd',remark:'国际线路;Production;Backup;Dedicated'}]}}))
  await page.route('**/api/nodes/*/metrics?*',r=>{const d=metrics();return r.fulfill({json:{...d,probes:{1:'Tokyo gateway',2:'Singapore gateway',3:'Hong Kong gateway'},ping:d.ping.flatMap(p=>[p,{...p,task_id:2,latency:p.latency+30},{...p,task_id:3,latency:p.latency+60}])}})})
  await page.goto('http://127.0.0.1:4286/node/1');await page.locator('.recharts-area-curve').waitFor();await page.locator('.detail-facts-toggle').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${dest}/long-mobile-${mode}.png`,fullPage:true})
  await page.getByRole('button',{name:'网络延迟',exact:true}).click();await page.getByRole('button',{name:'显示全部线路',exact:true}).click();await page.locator('.detail-probe-legend>summary').click();await page.getByRole('button',{name:'仅看：Singapore gateway',exact:true}).click();await page.locator('.detail-history').screenshot({path:`${dest}/solo-${mode}.png`})
  await page.getByRole('button',{name:'恢复之前选择',exact:true}).click();await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}));await page.getByRole('button',{name:'刷新历史',exact:true}).click();await page.locator('.history-retained-time').waitFor();await page.locator('.detail-history').screenshot({path:`${dest}/retained-${mode}.png`});await page.close()
 }
}finally{await browser.close()}
