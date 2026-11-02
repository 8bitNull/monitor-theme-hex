import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

const now=Date.UTC(2026,9,1,12)
async function setup(page:Page,width=390){
 await page.setViewportSize({width,height:844})
 await page.clock.install({time:new Date(now)})
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
}
function history(ts:number,latency:number|null){
 return {metrics:[],ping:[{task_id:1,ts,latency}],probes:{1:'Primary'},loss:{1:0}}
}
for(const width of [320,390,1440])test(`visible latency keeps updating automatically across three cycles at ${width}px`,async({page})=>{
 await setup(page,width)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{
  calls++
  return route.fulfill({json:history(now/1000+(calls-1)*5,20+calls)})
 })
 await page.goto('/')
 const value=page.locator(width<720?'.ma-network-value':'.node-card .latency-link')
 await expect(value).toContainText('21')
 for(const expected of [22,23,24]){
  await page.clock.fastForward(5100)
  await expect(value).toContainText(String(expected))
 }
 expect(calls).toBe(4)
})

for(const width of [320,390,1440])test(`five-second reads accept changed bucket values and returned timeouts at ${width}px`,async({page})=>{
 await setup(page,width)
 let calls=0
 const values=[21,47,null,23]
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:history(now/1000,values[calls++])}))
 await page.goto('/')
 const value=page.locator(width<720?'.ma-network-value':'.node-card .latency-link')
 await expect(value).toContainText('21')
 for(const expected of ['47','超时','23']){
  await page.clock.fastForward(5100)
  await expect(value).toContainText(expected)
 }
 expect(calls).toBe(4)
})

test('unchanged old samples stay stale after an automatic read and recover on new samples without a click',async({page})=>{
 await setup(page)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{
  calls++
  return route.fulfill({json:history(calls<3?now/1000-300:now/1000+10,calls<3?21:42)})
 })
 await page.goto('/')
 const card=page.locator('.ma-node'),value=card.locator('.ma-network-value')
 await expect(card.locator('.ma-route-caption')).toContainText('5 分钟前')
 await page.clock.fastForward(5100)
 await expect(card.locator('.ma-route-caption')).toContainText('5 分钟前')
 await expect(value).toContainText('—')
 expect(calls).toBe(2)
 await page.clock.fastForward(5100)
 await expect(value).toContainText('42')
 await expect(card.locator('.ma-route-footer')).toHaveCount(0)
 expect(calls).toBe(3)
})

test('a manual refresh between polls does not postpone the next automatic update past five seconds',async({page})=>{
 await setup(page)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{
  calls++
  return route.fulfill({json:history(calls===1?now/1000-300:now/1000+(calls-2)*5,20+calls)})
 })
 await page.goto('/')
 const card=page.locator('.ma-node'),value=card.locator('.ma-network-value')
 await expect(card.locator('.ma-route-caption')).toContainText('5 分钟前')
 await page.clock.fastForward(2000)
 await card.getByRole('button',{name:'刷新延迟数据',exact:true}).click()
 await expect(value).toContainText('22')
 // The original t=5s timer hits the renewed cache, which expires at t≈7s.
 await page.clock.fastForward(3100)
 expect(calls).toBe(2)
 await page.clock.fastForward(2100)
 await expect(value).toContainText('23')
 expect(calls).toBe(3)
 await page.clock.fastForward(5100)
 await expect(value).toContainText('24')
 expect(calls).toBe(4)
})

for(const event of ['focus','online','pageshow'])test(`expired latency refreshes on ${event} after browser suspension`,async({page})=>{
 await setup(page)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{
  calls++
  return route.fulfill({json:history(now/1000+(calls-1)*180,20+calls)})
 })
 await page.goto('/')
 const value=page.locator('.ma-network-value')
 await expect(value).toContainText('21')
 // Sleeping mobile browsers may resume a page without a visibility transition.
 // Advance wall time without firing timers, then deliver the actual resume signal.
 await page.clock.setSystemTime(new Date(now+180000))
 await page.evaluate(event=>window.dispatchEvent(new Event(event)),event)
 await expect(value).toContainText('22')
 expect(calls).toBe(2)
 // Bursts of resume events must still reuse the fresh result.
 await page.evaluate(event=>{for(let i=0;i<3;i++)window.dispatchEvent(new Event(event))},event)
 await page.clock.runFor(100)
 expect(calls).toBe(2)
})

test('background cards pause polling and immediately catch up when visible again',async({page})=>{
 await setup(page)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{
  calls++
  return route.fulfill({json:history(now/1000+(calls-1)*180,20+calls)})
 })
 await page.goto('/')
 const value=page.locator('.ma-network-value')
 await expect(value).toContainText('21')
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:true})
  document.dispatchEvent(new Event('visibilitychange'))
  for(const event of ['focus','online','pageshow'])window.dispatchEvent(new Event(event))
 })
 await page.clock.fastForward(180000)
 expect(calls).toBe(1)
 await page.evaluate(()=>{
  Object.defineProperty(document,'hidden',{configurable:true,value:false})
  document.dispatchEvent(new Event('visibilitychange'))
 })
 await expect(value).toContainText('22')
 expect(calls).toBe(2)
})

test('failed automatic refresh retains history and recovers at the next poll without a click',async({page})=>{
 await setup(page)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{
  calls++
  return calls===2?route.fulfill({status:503}):route.fulfill({json:history(now/1000+(calls-1)*60,20+calls)})
 })
 await page.goto('/')
 const card=page.locator('.ma-node'),value=card.locator('.ma-network-value')
 await expect(value).toContainText('21')
 await page.clock.fastForward(5100)
 await expect(card.locator('.ma-route-caption')).toContainText('更新失败 · 上次数据')
 await expect(card.getByRole('button',{name:'查看线路：Primary',exact:true})).toBeVisible()
 await page.clock.runFor(50000)
 expect(calls).toBe(2)
 await page.clock.fastForward(11000)
 await expect(value).toContainText('23')
 await expect(card.locator('.ma-route-footer')).toHaveCount(0)
 expect(calls).toBe(3)
})

test('network recovery can retry a failed node before the automatic failure backoff expires',async({page})=>{
 await setup(page)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{
  calls++
  return calls===2?route.fulfill({status:503}):route.fulfill({json:history(now/1000,20+calls)})
 })
 await page.goto('/')
 const card=page.locator('.ma-node'),value=card.locator('.ma-network-value')
 await expect(value).toContainText('21')
 await page.clock.fastForward(5100)
 await expect(card.locator('.ma-route-caption')).toContainText('更新失败 · 上次数据')
 await page.evaluate(()=>window.dispatchEvent(new Event('online')))
 await expect(value).toContainText('23')
 await expect(card.locator('.ma-route-footer')).toHaveCount(0)
 expect(calls).toBe(3)
})

test('overlapping resume signals share the pending request and keep the next poll alive',async({page})=>{
 await setup(page)
 let calls=0,release!:()=>void
 const held=new Promise<void>(resolve=>{release=resolve})
 await page.route('**/api/nodes/*/metrics?*',async route=>{
  calls++
  if(calls===2)await held
  return route.fulfill({json:history(now/1000+(calls===1?0:calls===2?180:185),20+calls)})
 })
 await page.goto('/')
 const value=page.locator('.ma-network-value')
 await expect(value).toContainText('21')
 await page.clock.setSystemTime(new Date(now+180000))
 await page.evaluate(()=>{for(let i=0;i<3;i++)for(const event of ['focus','online','pageshow'])window.dispatchEvent(new Event(event))})
 await expect.poll(()=>calls).toBe(2)
 release()
 await expect(value).toContainText('22')
 expect(calls).toBe(2)
 await page.clock.fastForward(5100)
 await expect(value).toContainText('23')
 expect(calls).toBe(3)
})

for(const width of [390,1440])test(`detail latency reads backend updates every five seconds at ${width}px`,async({page})=>{
 await setup(page,width)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{
  if(new URL(route.request().url()).searchParams.get('series')==='ping')calls++
  return route.fulfill({json:history(now/1000+(calls-1)*5,20+calls)})
 })
 await page.goto('/node/1?section=latency&routes=1#latency')
 const value=page.getByLabel('查看线路',{exact:true})
 await expect(value).toContainText('21 ms')
 for(const expected of [22,23,24]){
  await page.clock.fastForward(5100)
  await expect(value).toContainText(`${expected} ms`)
 }
 expect(calls).toBe(4)
})

for(const event of ['focus','online','pageshow'])test(`detail latency refreshes on ${event} after browser suspension`,async({page})=>{
 await setup(page,1440)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{
  if(new URL(route.request().url()).searchParams.get('series')==='ping')calls++
  return route.fulfill({json:history(now/1000+(calls-1)*180,20+calls)})
 })
 await page.goto('/node/1?section=latency&routes=1#latency')
 const value=page.getByLabel('查看线路',{exact:true})
 await expect(value).toContainText('21 ms')
 await page.clock.setSystemTime(new Date(now+180000))
 await page.evaluate(event=>window.dispatchEvent(new Event(event)),event)
 await expect(value).toContainText('22 ms')
 expect(calls).toBe(2)
})

test('leaving the node list removes polling and resume listeners',async({page})=>{
 await setup(page)
 let calls=0
 await page.route('**/api/nodes/*/metrics?*',route=>{calls++;return route.fulfill({json:history(now/1000,21)})})
 await page.goto('/')
 await expect(page.locator('.ma-network-value')).toContainText('21')
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'概览',exact:true}).click()
 await expect(page.locator('.ma-node')).toHaveCount(0)
 await page.clock.setSystemTime(new Date(now+180000))
 await page.evaluate(()=>{for(const event of ['focus','online','pageshow'])window.dispatchEvent(new Event(event))})
 await page.clock.fastForward(180000)
 expect(calls).toBe(1)
})
