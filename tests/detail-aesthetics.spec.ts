import {test,expect} from '@playwright/test'
import {detailFixture} from './detail-aesthetics-fixture'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const width of [320,390,430])test(`mobile detail stays usable at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await detailFixture(page)
 await page.goto('/node/1')
 await expect(page.locator('.ma-big-metric[data-kind=cpu]')).toBeVisible()
 await expect(page.locator('.ma-big-metric[data-kind=load]')).toBeVisible()
 await expect(page.locator('.desktop-detail-metrics')).toHaveCount(0)
 for(const name of ['资源','网络','资料','总览']){
  await page.getByRole('button',{name,exact:true}).click()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await page.getByRole('button',{name:'流量与账单',exact:false}).click()
 await expect(page.locator('#ma-billing-details')).toBeVisible()
})

test('mobile resource totals preference preserves CPU and load context',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await page.addInitScript(()=>localStorage.setItem('hex-mobile-v1',JSON.stringify({totals:false})))
 await detailFixture(page)
 await page.goto('/node/1')
 for(const kind of ['cpu','load'])await expect(page.locator(`.ma-big-metric[data-kind=${kind}] p`)).toBeVisible()
 for(const kind of ['mem_used','disk_used'])await expect(page.locator(`.ma-big-metric[data-kind=${kind}] p`)).toHaveCount(0)
 await expect(page.locator('.ma-big-metric[data-kind=load] .ma-track')).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('desktop toolbar groups controls and retains failed-update feedback',async({page})=>{
 await page.setViewportSize({width:900,height:1000})
 await detailFixture(page)
 await page.goto('/node/1')
 const toolbar=page.locator('.detail-chart-toolbar')
 await expect(toolbar.locator('.detail-toolbar-selection')).toBeVisible()
 await expect(toolbar.locator('.detail-toolbar-actions')).toBeVisible()
 await toolbar.getByRole('button',{name:'内存',exact:true}).click()
 await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','mem_used')
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}))
 await toolbar.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(page.locator('.history-notice')).toBeVisible()
 await expect(toolbar.locator('.detail-update')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

for(const width of [721,900,1279,1280,1440])test(`desktop metrics ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 const counts=await detailFixture(page)
 await page.goto('/node/1')
 const cards=page.locator('.desktop-detail-metrics>.detail-metric-card')
 await expect(cards).toHaveCount(4)
 const boxes=await cards.evaluateAll(es=>es.map(e=>{
  const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}
 }))
 const columns=width>=1280?4:2
 expect(Math.abs(boxes[0].y-boxes[1].y)).toBeLessThanOrEqual(1)
 if(columns===4)expect(Math.abs(boxes[0].y-boxes[3].y)).toBeLessThanOrEqual(1)
 else expect(boxes[2].y).toBeGreaterThan(boxes[0].y)
 expect(Math.abs(boxes[0].w-boxes[1].w)).toBeLessThanOrEqual(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const disk=page.getByRole('button',{name:'查看硬盘历史趋势',exact:true})
 await expect(disk.locator('path')).toHaveAttribute('d',/L/)
 const before=counts.resourceRequests()
 await disk.click()
 await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','disk_used')
 await expect(page.getByRole('region',{name:'历史图表'})).toBeFocused()
 expect(counts.resourceRequests()).toBe(before)
})

test('network card reveals a real trend after two live reports',async({page})=>{
 await page.clock.install()
 let count=0
 const ts=Math.floor(Date.now()/1000)
 await page.routeWebSocket('**/api/ws',s=>s.close())
 await page.route('**/api/nodes',r=>{
  const n=nodes()[0]
  return r.fulfill({json:{nodes:[{...n,last_seen:ts+count*5,metrics:{...n.metrics,net_tx:0,net_rx:1024*count}}]}})
 })
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/1')
 const network=page.locator('.detail-metric-network')
 await expect(network.locator('.micro-empty')).toHaveCount(2)
 await expect(network.locator('.speed-trend').first()).toBeVisible()
 const reading=(await network.locator('.upload strong').boundingBox())!
 const trend=(await network.locator('.upload .speed-trend').boundingBox())!
 expect(trend.y).toBeGreaterThanOrEqual(reading.y+reading.height)
 count++
 await page.clock.runFor(5100)
 await expect(network.locator('.micro-empty')).toHaveCount(0)
 await expect(network.locator('.upload .micro-trend path').first()).toHaveAttribute('d',/L/)
 await expect(network.locator('.upload .speed-amount')).toHaveText('0.0')
})

for(const width of [721,900,1280])test(`network directions fit side by side at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'))
 await detailFixture(page)
 await page.goto('/node/1')
 const network=page.locator('.detail-metric-network'),upload=network.locator('.upload'),download=network.locator('.download')
 const up=(await upload.boundingBox())!,down=(await download.boundingBox())!
 expect(Math.abs(up.y-down.y)).toBeLessThanOrEqual(1)
 expect(down.x).toBeGreaterThanOrEqual(up.x+up.width)
 for(const direction of [upload,download]){
  const value=(await direction.locator('strong').boundingBox())!,trend=(await direction.locator('.speed-trend').boundingBox())!
  expect(trend.y).toBeGreaterThanOrEqual(value.y+value.height)
  expect(await direction.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
