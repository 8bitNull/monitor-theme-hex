// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'

test('compact card keeps billing below latency and three equal columns and remarks beside price',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[1],expires_at:'2026-10-07',remark:'国际线路;Backup;这是一段较长的备注用于验证标签自动换行',metrics:{...nodes()[1].metrics,tcp:12345678,udp:87654321}}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 for(const language of ['zh','en'])for(const width of [768,800,1440]){
  await page.setViewportSize({width,height:1000})
  await page.addInitScript(({language})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,designVersion:1,infoDensity:'overview'}))},{language})
  await page.goto('/')
  const card=page.locator('.node-card')
  await expect(card.locator('.node-secondary-disclosure')).toHaveCount(0)
  await expect(card.locator('.card-billing')).toBeVisible()
  await expect(card.locator('.card-expiry')).toContainText('2026.10.07')
  await expect(card.locator('.node-connections')).toBeVisible()
  await expect(card.locator('.node-remarks')).toBeVisible()
  await expect(card.locator('.node-remarks .detail-remark-tag')).toHaveCount(3)
  await expect(card.locator('.node-remarks .remark-more')).toHaveCount(0)
  expect(await card.locator('.node-remarks').evaluate(el=>{
   const tags=[...el.querySelectorAll('.detail-remark-tag')].map(tag=>tag.getBoundingClientRect())
   const button=el.getBoundingClientRect()
   const fits=tags.every(tag=>tag.left>=button.left-1&&tag.right<=button.right+1&&tag.top>=button.top-1&&tag.bottom<=button.bottom+1)
   return fits&&el.scrollWidth<=el.clientWidth
  })).toBeTruthy()
  expect(await card.locator('.node-remarks').evaluate(el=>[...el.querySelectorAll('.detail-remark-tag')].slice(0,2).every(tag=>tag.scrollWidth<=tag.clientWidth+1))).toBeTruthy()
   const result=await card.evaluate(el=>{
   const box=(s:string)=>el.querySelector(s)!.getBoundingClientRect()
   const billing=box('.card-billing'),route=box('.route-matrix'),footer=box('.node-footer'),price=box('.node-price'),remarks=box('.node-remarks'),traffic=box('.traffic-summary'),expiry=box('.card-expiry'),uptime=box('.card-uptime')
   return {order:route.bottom<=billing.top&&billing.bottom<=footer.top,priceRight:Math.abs(price.right-footer.right)<1,sameRow:Math.abs((price.top+price.bottom)/2-(remarks.top+remarks.bottom)/2)<2,remarksLeft:Math.abs(remarks.left-footer.left)<1,equal:Math.max(traffic.width,expiry.width,uptime.width)-Math.min(traffic.width,expiry.width,uptime.width)<1,columns:traffic.right<=expiry.left&&expiry.right<=uptime.left,overflow:[...el.querySelectorAll('.card-network,.speed-indicators>div,.node-more')].some(e=>e.scrollWidth>e.clientWidth+1)}
   })
   expect(result).toEqual({order:true,priceRight:true,sameRow:true,remarksLeft:true,equal:true,columns:true,overflow:false})
  if(language==='zh'&&(width===800||width===1440))await card.screenshot({path:`tests/artifacts/card-network/${width}.png`})
 }
})

test('hovering card remarks does not fill the whole row',async({page})=>{
 await page.setViewportSize({width:1440,height:900})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],remark:'20T;10Gbps;国际线路'}]}}))
 await page.goto('/')
 const remarks=page.locator('.node-card .node-remarks').first()
 const background=await remarks.evaluate(el=>getComputedStyle(el).backgroundColor)
 await remarks.hover()
 await expect(remarks).toHaveCSS('background-color',background)
 await remarks.click()
 await expect(page.locator('.card-notes-dialog')).toBeVisible()
})

test('home speed curves use new reports and offline cards retain durable facts and routes',async({page})=>{
 await page.clock.install()
 let step=0,online=true
 const ts=Math.floor(Date.now()/1000)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],online,last_seen:ts+step*5,metrics:{...nodes()[0].metrics,net_tx:0,net_rx:step*2048}}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/')
 const card=page.locator('.node-card')
 await expect(card.locator('.speed-pair .micro-empty')).toHaveCount(2)
 step++;await page.clock.runFor(5100)
 await expect(card.locator('.speed-pair .micro-empty')).toHaveCount(0)
 await expect(card.locator('.upload .speed-amount')).toHaveText('0.0')
 expect(await card.locator('.download .micro-trend path').getAttribute('d')).toContain('L')
 online=false;await page.clock.runFor(5100)
 await expect(card.locator('.offline-last-report time')).toHaveAttribute('datetime',/T/)
 await expect(card.locator('.resources,.card-network,.speed-pair,.node-connections,.card-uptime')).toHaveCount(0)
 await expect(card.locator('.card-billing .traffic-summary')).toBeVisible()
 await expect(card.locator('.route-matrix')).toBeVisible()
 await expect(card.locator('.node-footer .node-price')).toBeVisible()
})
