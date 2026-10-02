import {chromium} from '@playwright/test'
import {nodes,metrics} from './fixtures.mjs'
import {mkdirSync} from 'node:fs'
const url=process.env.THEME_CAPTURE_URL||'http://127.0.0.1:4173'
mkdirSync('screenshots',{recursive:true})
const browser=await chromium.launch({channel:'chrome'})
try{
 for(const appearance of ['light','dark']){
  const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'})
  await page.clock.install();let tick=0;const now=Math.floor(Date.now()/1000)
  await page.addInitScript(appearance=>localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,appearance,homeRoutes:1,modules:{map:false}})),appearance)
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map(n=>({...n,last_seen:now+tick*5,expires_at:'2026-09-28',metrics:n.metrics?{...n.metrics,net_tx:1024**2*(8+2*Math.sin(tick*.5)),net_rx:1024**2*(20+5*Math.cos(tick*.4))}:null}))}}))
  await page.route('**/api/nodes/*/metrics?*',r=>{const d=metrics();return r.fulfill({json:{...d,loss:{1:1.2},ping:d.ping.map((p,i)=>({...p,latency:i===46?null:i===42?240:i>=34&&i<=38?95+(i-34)*13:p.latency,loss:i===46?100:i===52?12:0}))}})})
  await page.goto(url);await page.locator('.latency-link').first().waitFor()
  await page.locator('.node-card').first().screenshot({path:`archive/screenshots/network-home-${appearance}.png`})
  await page.locator('.node-open').first().click();await page.locator('.detail-live').waitFor()
  await page.locator('.detail-information').screenshot({path:`archive/screenshots/network-facts-${appearance}.png`})
  for(tick=1;tick<=12;tick++)await page.clock.runFor(5100)
  await page.locator('.detail-live').screenshot({path:`archive/screenshots/network-live-${appearance}.png`})
  await page.getByRole('button',{name:'网络延迟',exact:true}).click();await page.locator('.loss-track').waitFor()
  await page.locator('.detail-history').screenshot({path:`archive/screenshots/network-history-${appearance}.png`})
  await page.close()
 }
}finally{await browser.close()}
