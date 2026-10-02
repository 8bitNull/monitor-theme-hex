import {test,expect} from './classicTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const width of [768,800,900,1024,1440])test(`latency chart and route controls fit at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),probes:{1:'浙江电信 Primary long route',2:'浙江联通 Backup long route',3:'浙江移动 Mobile route'}}}))
 for(const language of ['zh','en']){
  await page.addInitScript(language=>localStorage.setItem('monitor-next-language',language),language)
  await page.goto('/node/1?routes=1#latency')
  const chips=page.locator('.route-chips'),chart=page.locator('.latency-view>.detail-chart-frame'),loss=page.locator('.loss-track')
  await expect(chips).toHaveCount(0);await expect(chart.locator('.recharts-line-curve')).toHaveCount(1)
  await expect(loss).toBeVisible();await expect(page.locator('.latency-stat-details,.latency-summary,.latency-explanation-panel')).toHaveCount(0)
  const controlsBox=(await page.locator('.latency-route-controls').boundingBox())!,f=(await chart.boundingBox())!,l=(await loss.boundingBox())!
  expect(f.y).toBeGreaterThanOrEqual(controlsBox.y+controlsBox.height)
  expect(l.y).toBeGreaterThanOrEqual(f.y+f.height)
  if(width>=900)expect(f.height).toBe(378)
  await expect(page.locator('.latency-chart-caption .latency-chart-key')).toBeVisible()
  await expect.poll(()=>chart.locator('.recharts-cartesian-axis-tick-value').count()).toBeGreaterThan(1)
  const route=page.locator('.latency-route-controls').getByLabel(language==='zh'?'查看线路':'View route',{exact:true})
  await expect(route).toBeVisible()
  const box=(await route.boundingBox())!,toolbar=(await page.locator('.detail-chart-toolbar').boundingBox())!,controls=(await page.locator('.latency-route-controls').boundingBox())!
  expect(box.y).toBeGreaterThanOrEqual(toolbar.y+toolbar.height)
  expect(box.x).toBeGreaterThanOrEqual(controls.x)
  expect(box.x+box.width).toBeLessThanOrEqual(controls.x+controls.width+1)
  if(width>=900){
   const tabs=(await page.locator('.detail-tabs').boundingBox())!,smooth=(await page.locator('.detail-smooth').boundingBox())!,ranges=(await page.locator('.detail-ranges').boundingBox())!,status=await page.locator('.detail-update').boundingBox(),refresh=(await page.locator('.detail-refresh').boundingBox())!
   expect(tabs.x+tabs.width).toBeLessThanOrEqual(smooth.x)
   expect(smooth.x+smooth.width).toBeLessThanOrEqual(ranges.x)
   expect(ranges.x+ranges.width).toBeLessThanOrEqual(status?.x??refresh.x)
   if(status)expect(status.x+status.width).toBeLessThanOrEqual(refresh.x)
  }
  expect(await page.locator('.detail-history').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 }
})
