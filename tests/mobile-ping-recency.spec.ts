import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

const now=Date.UTC(2026,9,1,12)
const ts=now/1000
const routes={1:'Retired route',2:'Active route',3:'Backup route'}
const history=(ping:{task_id:number;ts:number;latency:number|null}[])=>({metrics:[],ping,probes:routes,loss:{1:0,2:0,3:0}})
async function setup(page:Page,width=390){
 await page.setViewportSize({width,height:844})
 await page.clock.install({time:new Date(now)})
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
}

for(const [width,language] of [[320,'zh'],[320,'en'],[390,'zh'],[390,'en']] as const)test(`stale mobile sample exposes age and refresh recovery at ${width}px in ${language}`,async({page})=>{
 await setup(page,width)
 if(language==='en')await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'))
 let fresh=false
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:history([{task_id:1,ts:fresh?ts:ts-300,latency:fresh?42:20}])}))
 await page.goto('/')
 const card=page.locator('.ma-node')
 const caption=card.locator('.ma-route-caption')
 await expect(caption).toContainText(language==='zh'?'最近采样：5 分钟前':'Latest sample: 5 minutes ago')
 await expect(card.locator('.ma-network-value')).toContainText('—')
 const sampled=caption.locator('time')
 await expect(sampled).toHaveAttribute('dateTime',new Date(now-300000).toISOString())
 await expect(sampled).toHaveAttribute('title',/.+/)
 await expect(sampled).toContainText(await page.evaluate(({ts,language})=>new Date((ts-300)*1000).toLocaleString(language==='en'?'en-US':'zh-CN'),{ts,language}))
 const refresh=card.getByRole('button',{name:language==='zh'?'刷新延迟数据':'Refresh latency data',exact:true})
 await expect(refresh).toBeVisible()
 expect(await refresh.evaluate(el=>el.closest('.ma-node > button'))).toBeNull()
 expect(await refresh.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44)
 expect(await sampled.evaluate(el=>{
  const card=el.closest('.ma-node')!.getBoundingClientRect()
  return [...el.getClientRects()].every(rect=>rect.left>=card.left&&rect.right<=card.right)
 })).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.screenshot({path:`artifacts/mobile-ping/stale-${width}-${language}.png`})
 // A successful read of the same old bucket must not make it current.
 const unchanged=page.waitForResponse(response=>response.url().includes('series=ping'))
 await refresh.click()
 await (await unchanged).finished()
 await expect(caption).toContainText(language==='zh'?'5 分钟前':'5 minutes ago')
 fresh=true
 await refresh.click()
 await expect(card.locator('.ma-network-value')).toContainText('42ms')
 await expect(caption).toHaveCount(0)
 await expect(refresh).toHaveCount(0)
})

test('automatic mobile route moves from a retired probe to an active one and opens that route',async({page})=>{
 await setup(page)
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:history([
  {task_id:1,ts:ts-600,latency:10},{task_id:2,ts:ts-30,latency:80},{task_id:3,ts,latency:90},
 ])}))
 await page.goto('/')
 const card=page.locator('.ma-node')
 await expect(card.locator('.ma-network-name')).toHaveText('Active route')
 await expect(card.locator('.ma-network-value')).toContainText('80ms')
 await expect(card.locator('.ma-route-footer')).toHaveCount(0)
 await card.getByRole('button',{name:'查看线路：Active route',exact:true}).click()
 await expect(page).toHaveURL(url=>url.searchParams.get('routes')==='2'&&url.hash==='#latency')
})

test('explicit mobile route retains the old probe even when another route has a recent sample',async({page})=>{
 await setup(page)
 await page.addInitScript(()=>localStorage.setItem('monitor-next-node-probes-v1',JSON.stringify({1:'1'})))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:history([
  {task_id:1,ts:ts-600,latency:10},{task_id:2,ts,latency:80},
 ])}))
 await page.goto('/')
 const card=page.locator('.ma-node')
 await expect(card.locator('.ma-network-name')).toHaveText('Retired route')
 await expect(card.locator('.ma-route-caption')).toContainText('最近采样：10 分钟前')
 await expect(card.locator('.ma-network-value')).toContainText('—')
})

test('automatic mobile route falls back to the most recent old sample and keeps timeouts visible',async({page})=>{
 await setup(page)
 let current=false
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:history([
  {task_id:1,ts:ts-600,latency:10},{task_id:2,ts:current?ts:ts-180,latency:null},{task_id:3,ts:ts-300,latency:30},
 ])}))
 await page.goto('/')
 const card=page.locator('.ma-node')
 await expect(card.locator('.ma-network-name')).toHaveText('Active route')
 await expect(card.locator('.ma-route-caption')).toContainText('最近采样：3 分钟前')
 current=true
 await card.getByRole('button',{name:'刷新延迟数据',exact:true}).click()
 await expect(card.locator('.ma-network-value')).toContainText('超时')
 await expect(card.locator('.ma-route-footer')).toHaveCount(0)
})

for(const width of [390,1440])test(`opening latency without a pinned URL follows the current automatic route at ${width}px`,async({page})=>{
 await setup(page,width)
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:history([
  {task_id:1,ts:ts-600,latency:10},{task_id:2,ts,latency:80},
 ])}))
 await page.goto('/node/1#latency')
 const selected=page.locator('.latency-route-controls').getByLabel('查看线路',{exact:true})
 await expect(selected).toContainText('Active route')
 // An explicit history URL must still retain the retired route.
 await page.goto('/node/1?routes=1#latency')
 await expect(selected).toContainText('Retired route')
})

for(const width of [390,1440])test(`a globally pinned route with no samples retains its name and empty state at ${width}px`,async({page})=>{
 await setup(page,width)
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,probe:'3'})))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:history([{task_id:2,ts,latency:80}])}))
 await page.goto('/node/1#latency')
 await expect(page.locator('.latency-route-controls').getByLabel('查看线路',{exact:true})).toContainText('Backup route')
 await expect(page.locator('.detail-chart-frame')).toContainText('这段时间没有延迟数据')
 await expect(page.locator('.route-chips button[aria-label="Backup route"]')).toHaveAttribute('aria-pressed','true')
})

test('desktop card uses the same automatic route as mobile',async({page})=>{
 await setup(page,1440)
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:history([
  {task_id:1,ts:ts-600,latency:10},{task_id:2,ts,latency:80},
 ])}))
 await page.goto('/')
 const card=page.locator('.node-card')
 await expect(card.locator('.route-select')).toContainText('Active route')
 await expect(card.locator('.latency-link')).toContainText('80')
 await expect(card.locator('.ping-stale')).toHaveCount(0)
})
