import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

// Exercise normal motion too; existing navigation/loading suites use reduced motion.
test.use({reducedMotion:'no-preference'})
const history='**/api/nodes/*/metrics?*'
async function fleet(page:Page,count=4){
 await page.routeWebSocket('**/api/ws',socket=>socket.close())
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:Array.from({length:count},(_,i)=>({...nodes()[0],id:i+1,name:`Node ${i+1}`}))}}))
 await page.route('**/theme-config.json',route=>route.fulfill({json:{modules:{map:false}}}))
}

for(const width of [900,1440])test(`desktop cards stay in place when route history arrives at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await fleet(page)
 let release!:()=>void
 const held=new Promise<void>(resolve=>{release=resolve})
 await page.route(history,async route=>{await held;await route.fulfill({json:metrics()})})
 await page.goto('/')
 const card=page.locator('.node-card').first()
 await expect(card.locator('.ping-loading')).toBeVisible()
 const before=(await card.boundingBox())!
 release()
 await expect(card.locator('.latency-bars')).toBeVisible()
 const after=(await card.boundingBox())!
 expect(Math.abs(after.height-before.height)).toBeLessThanOrEqual(2)
})

for(const width of [900,1440])test(`detail preview keeps the main chart steady during initial load and refresh at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await fleet(page,1)
 let release!:()=>void
 let held=new Promise<void>(resolve=>{release=resolve})
 await page.route(history,async route=>{await held;await route.fulfill({json:metrics()})})
 await page.goto('/node/1')
 const panel=page.locator('.detail-history'),trend=page.locator('.resource-trend').first()
 await expect(trend).toContainText('读取中')
 const before=(await panel.boundingBox())!
 release()
 await expect(trend.locator('svg')).toBeVisible()
 const ready=(await panel.boundingBox())!
 expect(Math.abs(ready.y-before.y)).toBeLessThanOrEqual(2)
 held=new Promise<void>(resolve=>{release=resolve})
 await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(trend).toContainText('读取中')
 await expect(page.locator('.resource-chart-panel .recharts-surface')).toBeVisible()
 expect(Math.abs((await panel.boundingBox())!.y-ready.y)).toBeLessThanOrEqual(2)
 release()
 await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeEnabled()
})

for(const width of [320,390,1024,1440])test(`live rate unit changes keep following nodes steady at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await fleet(page,4);await page.clock.install()
 let fast=false
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes().slice(0,4).map(node=>({...node,last_seen:Math.floor(Date.now()/1000),metrics:{...node.metrics!,net_tx:fast?1234567890:1234,net_rx:fast?987654321:12}}))}}))
 await page.route(history,route=>route.fulfill({json:metrics()}))
 await page.goto('/')
 const cards=page.locator(width<=720?'.ma-node':'.node-card')
 await expect(cards).toHaveCount(4)
 const before=await cards.evaluateAll(elements=>elements.map(el=>{const box=el.getBoundingClientRect();return {height:box.height,y:box.y}}))
 fast=true;await page.clock.runFor(5100)
 await expect(cards.first()).toContainText('Gbps')
 const after=await cards.evaluateAll(elements=>elements.map(el=>{const box=el.getBoundingClientRect();return {height:box.height,y:box.y}}))
 for(let i=0;i<4;i++){
  expect(Math.abs(after[i].height-before[i].height)).toBeLessThanOrEqual(2)
  expect(Math.abs(after[i].y-before[i].y)).toBeLessThanOrEqual(2)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

for(const [width,height,language,appearance,count] of [
 [1440,900,'zh','light',1], [1440,900,'en','dark',24],
 [1024,768,'zh','light',24], [390,844,'zh','light',24], [320,844,'en','dark',24],
] as const)test(`fleet composition ${count} nodes at ${width} ${language} ${appearance}`,async({page})=>{
 await page.setViewportSize({width,height})
 await page.addInitScript(({language,appearance})=>{
  localStorage.setItem('monitor-next-language',language)
  localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance}))
 },{language,appearance})
 await page.routeWebSocket('**/api/ws',socket=>socket.close())
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:Array.from({length:count},(_,i)=>{
  const node=nodes()[i%6]
  return {...node,id:i+1,name:i===0?'Production · 东京主节点 · LongRegionalGatewayNameWithFailoverAndIPv6':`${node.name} ${i+1}`,expires_at:i===0?'2026-01-01':null,traffic_limit:i===0?1:0,metrics:node.metrics?{...node.metrics,cpu:i===0?96:node.metrics.cpu}:null}
 })}}))
 await page.route(history,route=>route.fulfill({json:metrics()}))
 await page.goto('/')
 const cards=page.locator(width<=720?'.ma-node':'.node-card')
 await expect(cards).toHaveCount(count)
 const first=cards.first()
 await expect(first).toContainText(language==='en'?'High load':'高负载')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const core=first.locator(width<=720?'.ma-meters':'.resources')
 await page.screenshot({path:`artifacts/experience-audit-2026-09-30/fleet-${count}-${width}-${appearance}.png`})
 expect((await core.boundingBox())!.y).toBeLessThan(height-60)
 // Returning from a distant node should retain the node's viewport position.
 const target=cards.nth(Math.min(count-1,15)).locator('button[data-node-id]')
 await target.scrollIntoViewIfNeeded()
 const targetY=(await target.boundingBox())!.y
 await target.click()
 await page.getByRole('button',{name:language==='en'?'Back to overview':'返回总览',exact:true}).click()
 await expect(target).toBeVisible()
 await expect.poll(async()=>Math.abs((await target.boundingBox())!.y-targetY)).toBeLessThanOrEqual(90)
})
