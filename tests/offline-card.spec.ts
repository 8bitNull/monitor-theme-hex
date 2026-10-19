import {test,expect,type Locator} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'

// Firefox's protocol boundingBox may round differently after compositing. Read DOM dimensions directly.
const cardSize=(card:Locator)=>card.evaluate(el=>{const {width,height}=el.getBoundingClientRect();return {width,height}})

for(const width of [320,390,768,1440])for(const detailed of [false,true])for(const appearance of ['light','dark']){
 test(`${width}px ${detailed?'detailed':'compact'} ${appearance} card preserves its size offline and recovers`,async({page})=>{
  await page.setViewportSize({width,height:1000})
  await page.clock.install()
  await page.addInitScript(({detailed,appearance})=>{
   localStorage.setItem('hex-desktop-v1',JSON.stringify({cardDensity:detailed?'detailed':'compact'}))
   localStorage.setItem('hex-mobile-v1',JSON.stringify({detailed}))
   localStorage.setItem('monitor-next',JSON.stringify({appearance}))
  },{detailed,appearance})
  let online=true
  const node={...nodes()[0],remark:'4T；1Gbps；国际线路',price:7.9}
  await page.route('**/api/me',r=>r.fulfill({json:{authed:true,public_page:true,site_name:'HEX'}}))
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...node,online,last_seen:Math.floor(Date.now()/1000)-(online?0:3600)}]}}))
  await page.route('**/api/nodes/*/metrics?*',r=>{const data=metrics();return r.fulfill({json:{...data,ping:data.ping.map(row=>({...row,latency:37})),loss:{1:12.5}}})})
  await page.goto('/')
  const mobile=width<721,card=page.locator(mobile?'.ma-node':'.node-card')
  await expect(card.locator(mobile?'.ma-network-link':'.latency-link')).toBeVisible()
  await expect(card.locator(mobile?'.ma-network-value':'.latency-link')).toHaveText(/37\s*ms/)
  if(!mobile)await expect(card.locator('.loss-reading b')).toHaveText('12.5%')
  await expect(card.locator(mobile?'.ma-meter b':'.bar-number').first()).toContainText('28.0')
  const layout=()=>card.evaluate((el,mobile)=>{const card=el.getBoundingClientRect();return [...el.querySelectorAll(mobile?'.ma-node-head,.ma-meters,.ma-net,.ma-route-footer,.ma-node-notes':'.node-heading,.resources,.card-network,.route-matrix,.node-supplementary')].map(section=>{const box=section.getBoundingClientRect();return {className:section.className,x:box.x-card.x,y:box.y-card.y,width:box.width,height:box.height}})},mobile)
  const onlineLayout=await layout()
  const before=await cardSize(card)
  online=false
  await page.clock.runFor(5100)
  await expect(card).toHaveAttribute(mobile?'data-state':'data-metric-state','offline')
  const after=await cardSize(card)
  expect(after.width).toBe(before.width)
  expect(after.height).toBe(before.height)
  expect(await layout()).toEqual(onlineLayout)
  expect(await card.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeLessThan(1)
  await expect(card.locator(mobile?'.ma-meter b':'.bar-number')).toHaveText(mobile?['0.0%','0.0%']:['0.0%','0.0%','0.0%','0.00'])
  expect(await card.locator(mobile?'.ma-track i':'.resource-bar i').evaluateAll(els=>els.every(el=>(el as HTMLElement).style.width==='0%'))).toBe(true)
  await expect(card.locator(mobile?'.ma-net>span b':'.speed-amount')).toHaveText(mobile?['0.0 Kbps','0.0 Kbps']:['0.0','0.0'])
  await expect(card.locator(mobile?'.ma-network-value':'.latency-link')).toHaveText(/0\s*ms/)
  if(!mobile){
   if(detailed){
    await expect(card.locator('.node-connections b')).toHaveText(['0','0'])
    await expect(card.locator('.card-uptime .offline-value-zero')).toHaveText('0 分')
   }else await expect(card.locator('.node-connections,.card-uptime')).toHaveCount(0)
   await expect(card.locator('.loss-reading b')).toHaveText('0.0%')
   await expect(card.locator('.resource-columns .filled,.latency-timeout,.speed-trend circle')).toHaveCount(0)
  }
  await expect(card.getByLabel('备注',{exact:true})).toContainText('国际线路')
  await expect(card.locator('.node-price')).toContainText('$7.90')
  await expect(card.locator('[data-node-id]')).toHaveAttribute('title',/最近上报时间/)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const scroll=await page.evaluate(()=>({left:scrollX,top:scrollY}))
  await card.screenshot({path:`tests/artifacts/offline-card/${width}-${detailed?'detailed':'compact'}-${appearance}.png`})
  // Screenshots scroll the card into view; compare recovery in the original coordinate frame.
  await page.evaluate(position=>scrollTo({...position,behavior:'instant'}),scroll)
  online=true
  await page.clock.runFor(5100)
  await expect(card).toHaveAttribute(mobile?'data-state':'data-metric-state','live')
  await expect(card.locator(mobile?'.ma-meter b':'.bar-number').first()).toContainText('28.0')
  expect((await cardSize(card)).height).toBe(before.height)
  await expect(card).toHaveCSS('opacity','1')
  await expect(card.locator(mobile?'.ma-network-value':'.latency-link')).toHaveText(/37\s*ms/)
  await expect(card.locator(mobile?'.ma-net>span b':'.speed-amount').first()).toHaveText(mobile?'305.6 Kbps':'305.6')
  if(!mobile)await expect(card.locator('.loss-reading b')).toHaveText('12.5%')
  expect(await layout()).toEqual(onlineLayout)
 })
}

test('an initially offline node with no metrics retains the full card',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[5]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/')
 const card=page.locator('.node-card.node-offline')
 await expect(card.locator('.resources,.card-network,.node-connections,.card-uptime')).toHaveCount(4)
 await expect(card.locator('.bar-number')).toHaveText(['0.0%','0.0%','0.0%','0.00'])
 await expect(card.locator('.traffic-summary')).toBeVisible()
 await expect(card.locator('.latency-link')).toHaveText(/0\s*ms/)
 await card.locator('.node-open').click()
 await expect(page).toHaveURL(/\/node\/6/)
})

for(const width of [768])test(`${width}px high-load card keeps its alert space when offline metrics are absent`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await page.clock.install()
 let online=true
 await page.route('**/api/nodes',r=>{
  const node=nodes()[0]
  return r.fulfill({json:{nodes:[{...node,name:'High load node · 高负载节点名称',online,metrics:online?{...node.metrics,cpu:95}:null}]}})
 })
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/')
 const card=page.locator(width<721?'.ma-node':'.node-card')
 await card.locator(width<721?'.ma-net':'.route-matrix').scrollIntoViewIfNeeded()
 await expect(card.locator(width<721?'.ma-network-link':'.latency-link')).toBeVisible()
 await expect(card.getByText(/高负载.*CPU/)).toBeVisible()
 const before=await cardSize(card)
 online=false;await page.clock.runFor(5100)
 await expect(card).toHaveAttribute(width<721?'data-state':'data-metric-state','offline')
 expect((await cardSize(card)).height).toBe(before.height)
 await expect(card.getByText(/高负载.*CPU/)).toBeHidden()
 online=true;await page.clock.runFor(5100)
 await expect(card.getByText(/高负载.*CPU/)).toBeVisible()
 expect((await cardSize(card)).height).toBe(before.height)
})

for(const initial of ['stale','missing'])test(`mobile detailed ${initial} card keeps its size on offline transition`,async({page})=>{
 await page.setViewportSize({width:390,height:1000})
 await page.clock.install()
 await page.addInitScript(()=>localStorage.setItem('hex-mobile-v1',JSON.stringify({detailed:true})))
 let online=true
 await page.route('**/api/nodes',r=>{
  const node=nodes()[0]
  return r.fulfill({json:{nodes:[{...node,online,last_seen:Math.floor(Date.now()/1000)-120,metrics:initial==='missing'||!online?null:node.metrics}]}})
 })
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/')
 const card=page.locator('.ma-node')
 await expect(card).toHaveAttribute('data-state',initial)
 await expect(card.locator('.ma-network-link')).toBeVisible()
 const height=(await cardSize(card)).height
 online=false;await page.clock.runFor(5100)
 await expect(card).toHaveAttribute('data-state','offline')
 expect((await cardSize(card)).height).toBe(height)
 await expect(card.locator('.ma-status-notice')).toBeHidden()
})
