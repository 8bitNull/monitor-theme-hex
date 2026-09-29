// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const width of [768,800])test(`compact desktop history status and controls fit at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:metrics()}))
 await page.goto('/node/1')
 const toolbar=page.locator('.detail-chart-toolbar'),status=toolbar.locator('.detail-update')
 await expect(status).toContainText(/更新于 \d{2}:\d{2}:\d{2}/)
 for(const tab of ['resources','latency'] as const){
  if(tab==='latency')await page.getByRole('button',{name:'网络延迟',exact:true}).click()
  const control=tab==='resources'?toolbar.locator('.detail-resource-metric-desktop'):toolbar.getByRole('checkbox',{name:'抑制尖峰'})
  await expect(control).toBeVisible()
  if(tab==='resources')for(const name of ['CPU','内存','硬盘'])await expect(control.getByRole('button',{name,exact:true}).locator('span')).toBeVisible()
  const selection=(await toolbar.locator('.detail-toolbar-selection').boundingBox())!,actions=(await toolbar.locator('.detail-toolbar-actions').boundingBox())!,top=(await toolbar.locator('.detail-tabs').boundingBox())!,right=(await control.boundingBox())!,time=(await status.boundingBox())!
  const ranges=(await toolbar.locator('.detail-ranges').boundingBox())!,refresh=(await toolbar.getByRole('button',{name:'刷新历史'}).boundingBox())!,bar=(await toolbar.boundingBox())!
  expect(right.x).toBeGreaterThanOrEqual(top.x+top.width)
  expect(right.x+right.width).toBeLessThanOrEqual(selection.x+selection.width+1)
  expect(actions.y).toBeGreaterThanOrEqual(selection.y+selection.height)
  expect(time.x).toBeGreaterThanOrEqual(actions.x)
  expect(refresh.x+refresh.width).toBeLessThanOrEqual(actions.x+actions.width+1)
  expect(time.x).toBeGreaterThanOrEqual(ranges.x+ranges.width)
  expect(refresh.x).toBeGreaterThanOrEqual(time.x+time.width)
  if(tab==='latency'){
   const route=(await page.locator('.latency-route-controls').getByLabel('查看线路',{exact:true}).boundingBox())!
   expect(route.y).toBeGreaterThanOrEqual(bar.y+bar.height)
   expect(route.x).toBeGreaterThanOrEqual(bar.x)
   expect(route.x+route.width).toBeLessThanOrEqual(bar.x+bar.width+1)
  }
  expect(time.x+time.width).toBeLessThanOrEqual(width)
  expect(await toolbar.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
 }
 await page.unroute('**/api/nodes/*/metrics?*')
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({status:503}))
 await toolbar.getByRole('button',{name:'刷新历史'}).click()
 await expect(status).toContainText(/上次成功更新：\d{2}:\d{2}:\d{2}/)
 expect(await toolbar.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
})

test('English last-success status fits compact desktop toolbar',async({page})=>{
 await page.setViewportSize({width:768,height:844})
 await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'))
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:metrics()}))
 await page.goto('/node/1')
 const toolbar=page.locator('.detail-chart-toolbar'),status=toolbar.locator('.detail-update')
 await expect(status).toContainText('Updated')
 await page.getByRole('button',{name:'Network latency',exact:true}).click()
 const checkbox=(await toolbar.getByRole('checkbox',{name:'Suppress spikes'}).boundingBox())!,route=(await page.locator('.latency-route-controls').getByLabel('View route',{exact:true}).boundingBox())!,toolbarBox=(await toolbar.boundingBox())!,selection=(await toolbar.locator('.detail-toolbar-selection').boundingBox())!,actions=(await toolbar.locator('.detail-toolbar-actions').boundingBox())!,ranges=(await toolbar.locator('.detail-ranges').boundingBox())!
 expect(route.y).toBeGreaterThanOrEqual(toolbarBox.y+toolbarBox.height)
 expect(checkbox.x+checkbox.width).toBeLessThanOrEqual(selection.x+selection.width+1)
 expect(actions.y).toBeGreaterThanOrEqual(selection.y+selection.height)
 expect(ranges.x).toBeGreaterThanOrEqual(actions.x)
 expect(route.x+route.width).toBeLessThanOrEqual(toolbarBox.x+toolbarBox.width)
 await page.unroute('**/api/nodes/*/metrics?*')
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({status:503}))
 await toolbar.getByRole('button',{name:'Refresh history'}).click()
 await expect(status).toContainText('Last successful update:')
 const bar=(await toolbar.boundingBox())!,text=(await status.boundingBox())!
 expect(text.x).toBeGreaterThanOrEqual(bar.x)
 expect(text.x+text.width).toBeLessThanOrEqual(bar.x+bar.width)
 expect(text.x).toBeGreaterThanOrEqual(actions.x)
 expect(text.y+text.height).toBeLessThanOrEqual(bar.y+bar.height)
 expect(await toolbar.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
})

for(const width of [900,1199])test(`failed refresh remains visible on medium desktop at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844})
 let fail=false
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill(fail?{status:503}:{json:metrics()}))
 await page.goto('/node/1')
 const toolbar=page.locator('.detail-chart-toolbar'),status=toolbar.locator('.detail-update')
 await expect(status).toContainText(/更新于 \d{2}:\d{2}:\d{2}/)
 for(const tab of ['resources','latency'] as const){
  if(tab==='latency')await page.getByRole('button',{name:'网络延迟',exact:true}).click()
  fail=true
  await toolbar.getByRole('button',{name:'刷新历史'}).click()
  await expect(status).toHaveAttribute('data-failed','true')
  await expect(status).toBeVisible()
  await expect(status).toContainText(/上次成功更新：\d{2}:\d{2}:\d{2}/)
  const bar=(await toolbar.boundingBox())!,message=(await status.boundingBox())!
  const actions=(await toolbar.locator('.detail-toolbar-actions').boundingBox())!
  expect(message.x).toBeGreaterThanOrEqual(actions.x)
  expect(message.y).toBeGreaterThanOrEqual(actions.y)
  expect(message.y+message.height).toBeLessThanOrEqual(actions.y+actions.height+1)
  expect(message.x).toBeGreaterThanOrEqual(bar.x)
  expect(message.x+message.width).toBeLessThanOrEqual(bar.x+bar.width)
  expect(message.y+message.height).toBeLessThanOrEqual(bar.y+bar.height)
  expect(await toolbar.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  fail=false
  await toolbar.getByRole('button',{name:'刷新历史'}).click()
  await expect(status).toHaveAttribute('data-failed','false')
  await expect(status).toBeVisible()
  const restored=(await toolbar.boundingBox())!,restoredMessage=(await status.boundingBox())!
  expect(restoredMessage.y+restoredMessage.height).toBeLessThanOrEqual(restored.y+restored.height)
  expect(await toolbar.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
 }
})

test('English failed update stays clear of controls at 1200px',async({page})=>{
 await page.setViewportSize({width:1200,height:844})
 await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'))
 let fail=false
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill(fail?{status:503}:{json:metrics()}))
 await page.goto('/node/1')
 const toolbar=page.locator('.detail-chart-toolbar')
 await expect(toolbar.locator('.detail-update')).toContainText('Updated')
 for(const tab of ['resources','latency'] as const){
  if(tab==='latency')await page.getByRole('button',{name:'Network latency',exact:true}).click()
  fail=true
  await toolbar.getByRole('button',{name:'Refresh history'}).click()
  const status=toolbar.locator('.detail-update')
  await expect(status).toHaveAttribute('data-failed','true')
  await expect(status).toContainText('Last successful update:')
  const bounds=await toolbar.evaluate(element=>{
   const rect=(selector:string)=>element.querySelector(selector)!.getBoundingClientRect()
   const status=rect('.detail-update'),range=rect('.detail-ranges'),refresh=rect('.detail-refresh'),bar=element.getBoundingClientRect()
   const overlaps=(a:DOMRect,b:DOMRect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top
   return {statusInside:status.left>=bar.left&&status.right<=bar.right&&status.bottom<=bar.bottom,
    rangeOverlap:overlaps(status,range),refreshOverlap:overlaps(status,refresh),overflow:element.scrollWidth>element.clientWidth||document.documentElement.scrollWidth>innerWidth}
  })
  expect(bounds).toEqual({statusInside:true,rangeOverlap:false,refreshOverlap:false,overflow:false})
  fail=false
  await toolbar.getByRole('button',{name:'Refresh history'}).click()
  await expect(status).toHaveAttribute('data-failed','false')
 }
})
