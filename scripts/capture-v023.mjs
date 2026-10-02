import {chromium} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const baseURL=process.env.THEME_CAPTURE_URL||'http://127.0.0.1:4173'
const browser=await chromium.launch({channel:'chrome'})
mkdirSync('archive/screenshots/v0.1.23',{recursive:true})
try{for(const [label,width] of [['desktop',1440],['mobile',390]]){
 const page=await browser.newPage({viewport:{width,height:1200},deviceScaleFactor:1})
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:'light'})))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],traffic_limit:500e9,month_used:220e9,traffic_reset_day:15,expires_at:'2026-09-28',remark:'2.5Gbps;国际线路;Anti-DDoS'}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:{1:'浙江电信',2:'浙江联通',3:'浙江移动'},ping:[1,2,3].flatMap(id=>metrics().ping.map(p=>({...p,task_id:id,latency:p.latency===null?null:p.latency+id*8,band:p.latency===null?undefined:[p.latency+id*8-2,p.latency+id*8+4],loss:0}))) }}))
 await page.goto(`${baseURL}/node/1?routes=1#latency`)
 await page.locator('.loss-track').waitFor()
 await page.locator('.detail-history').screenshot({path:`archive/screenshots/v0.1.23/latency-${label}.png`,style:'header{visibility:hidden}'})
 if(width===390){await page.goto(baseURL);await page.locator('.latency-bars').waitFor();await page.locator('.node-card').screenshot({path:'archive/screenshots/v0.1.23/card-mobile.png',style:'header{visibility:hidden}'})}
 await page.close()
}}finally{await browser.close()}
