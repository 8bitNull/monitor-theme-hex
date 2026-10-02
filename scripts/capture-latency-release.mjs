import {chromium} from '@playwright/test'
import {mkdirSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'
const baseURL=process.env.THEME_CAPTURE_URL||'http://127.0.0.1:4173'
const browser=await chromium.launch({channel:'chrome'})
mkdirSync('archive/screenshots/v0.1.22',{recursive:true})
try{for(const [label,width] of [['desktop',1440],['mobile',390]]){
 const page=await browser.newPage({viewport:{width,height:1200},deviceScaleFactor:1})
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:'light'})))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:{1:'浙江电信',2:'浙江联通',3:'浙江移动'},ping:[1,2,3].flatMap(id=>metrics().ping.map(p=>({...p,task_id:id,latency:p.latency===null?null:p.latency+id*8,band:p.latency===null?undefined:[p.latency+id*8-2,p.latency+id*8+4],loss:0}))) }}))
 await page.goto(`${baseURL}/node/1?routes=1#latency`)
 await page.locator('.loss-track').waitFor()
 await page.locator('.detail-history').screenshot({path:`archive/screenshots/v0.1.22/latency-${label}.png`,style:'header{visibility:hidden}'})
 await page.close()
}}finally{await browser.close()}
