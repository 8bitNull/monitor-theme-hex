import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

const historyUrl='**/api/nodes/*/metrics?*'

async function mobile(page:Page,width:number,items=nodes().slice(0,2)){
 await page.setViewportSize({width,height:844})
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:items}}))
}

async function positions(page:Page){
 const cards=page.locator('.ma-node')
 const first=(await cards.first().boundingBox())!
 const network=(await cards.first().locator('.ma-net').boundingBox())!
 const next=(await cards.nth(1).boundingBox())!
 return {height:first.height,networkY:network.y,nextY:next.y}
}

for(const width of [320,390])test(`online mobile card keeps network and following card in place while history loads at ${width}px`,async({page})=>{
 await mobile(page,width)
 let release!:()=>void
 const held=new Promise<void>(resolve=>{release=resolve})
 await page.route(historyUrl,async route=>{await held;await route.fulfill({json:metrics()})})
 await page.goto('/')
 await expect(page.locator('.ma-node')).toHaveCount(2)
 await expect(page.locator('.ma-node').first()).toContainText('正在读取探测记录')
 const waiting=await positions(page)
 release()
 await expect(page.locator('.ma-node').first().getByRole('button',{name:/查看线路/})).toBeVisible()
 const ready=await positions(page)
 expect(Math.abs(ready.height-waiting.height)).toBeLessThanOrEqual(2)
 expect(Math.abs(ready.networkY-waiting.networkY)).toBeLessThanOrEqual(2)
 expect(Math.abs(ready.nextY-waiting.nextY)).toBeLessThanOrEqual(2)
})

test('failed history offers one deduplicated manual retry outside the node action',async({page})=>{
 await mobile(page,320,[nodes()[0]])
 let calls=0
 let release!:()=>void
 const held=new Promise<void>(resolve=>{release=resolve})
 await page.route(historyUrl,async route=>{
  calls++
  if(calls===1)return route.fulfill({status:503})
  await held
  return route.fulfill({json:metrics()})
 })
 await page.goto('/')
 const card=page.locator('.ma-node')
 const retry=card.getByRole('button',{name:'读取失败 · 重试'})
 await expect(card.locator('.ma-route-caption')).toContainText('暂不可用')
 await expect(retry).toBeVisible()
 expect(await retry.evaluate(el=>el.closest('.ma-node > button'))).toBeNull()
 await retry.click()
 await retry.click()
 expect(calls).toBe(2)
 release()
 await expect(card.getByRole('button',{name:/查看线路/})).toBeVisible()
 await expect(retry).toHaveCount(0)
})

test('failed background refresh retains latency navigation and warns that history is stale',async({page})=>{
 await mobile(page,390,[nodes()[0]])
 await page.clock.install()
 let calls=0
 await page.route(historyUrl,route=>{calls++;return calls===1?route.fulfill({json:metrics()}):route.fulfill({status:503})})
 await page.goto('/')
 const card=page.locator('.ma-node')
 await expect(card.getByRole('button',{name:/查看线路/})).toBeVisible()
 await page.clock.fastForward(61000)
 await expect(card.locator('.ma-route-caption')).toContainText('更新失败 · 上次数据')
 await expect(card.getByRole('button',{name:/查看线路/})).toBeVisible()
 await expect(card.locator('.ma-network-link')).toContainText('—')
 await expect(card.getByRole('button',{name:'读取失败 · 重试'})).toBeVisible()
})

test('empty history is distinct from failure and keeps the route footer',async({page})=>{
 await mobile(page,320,[nodes()[0]])
 await page.route(historyUrl,route=>route.fulfill({json:{ping:[],probes:{},loss:{}}}))
 await page.goto('/')
 const card=page.locator('.ma-node')
 await expect(card.locator('.ma-route-caption')).toHaveText('无该线路记录')
 await expect(card.getByRole('button',{name:'读取失败 · 重试'})).toHaveCount(0)
 await expect(card.locator('.ma-network-placeholder')).toBeVisible()
})

test('long route names wrap without clipping and offline cards omit latency controls',async({page})=>{
 const offline=nodes()[5]
 await mobile(page,320,[nodes()[0],offline])
 const longName='Long route name with several locations and a continuous-token-'.repeat(3)
 await page.route(historyUrl,route=>route.fulfill({json:{...metrics(),probes:{'1':longName}}}))
 await page.goto('/')
 const first=page.locator('.ma-node').first()
 await expect(first.locator('.ma-network-name')).toHaveText(longName)
 expect(await first.locator('.ma-network-name').evaluate(el=>el.scrollHeight>18 && el.scrollWidth<=el.clientWidth)).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await expect(page.locator('.ma-node').nth(1).locator('.ma-route-footer')).toHaveCount(0)
 await expect(page.locator('.ma-node').nth(1).locator('.ma-network-link')).toHaveCount(0)
})

test('English narrow cards keep a localized failure footer and retry control',async({page})=>{
 await mobile(page,320,[nodes()[0]])
 await page.route(historyUrl,route=>route.fulfill({status:503}))
 await page.goto('/')
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'设置',exact:true}).click()
 await page.getByLabel('Language / 语言',{exact:true}).selectOption('en')
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Nodes',exact:true}).click()
 const card=page.locator('.ma-node')
 await expect(card.locator('.ma-route-caption')).toBeVisible()
 await expect(card.locator('.ma-route-retry')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
