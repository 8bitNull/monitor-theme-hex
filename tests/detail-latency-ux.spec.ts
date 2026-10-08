import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

test('selected lines stay identifiable and node switching starts with its own route',async({page})=>{
 await page.setViewportSize({width:320,height:720})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().slice(0,2)}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{
  const d=metrics(),second=r.request().url().includes('/nodes/2/')
  const ids=second?[5,6]:[1,2,3]
  return r.fulfill({json:{...d,probes:Object.fromEntries(ids.map(id=>[id,`线路 ${id}`])),ping:d.ping.flatMap(p=>ids.map(id=>({...p,task_id:id,latency:p.latency+id*10})))}})
 })
 await page.goto('/node/1?routes=1,2&lh=24#latency')
 await expect(page.getByRole('button',{name:'比较线路',exact:true})).toHaveCount(0)
 const routes=page.locator('.latency-view>.route-chips')
 await expect(routes.locator('button[aria-pressed=true]')).toHaveCount(2)
 await expect(page.locator('.latency-view .recharts-line-curve')).toHaveCount(2)
 const list=(await routes.boundingBox())!,compare=(await page.locator('.latency-route-controls').boundingBox())!
 expect(list.y).toBeGreaterThanOrEqual(compare.y+compare.height)
 const overflow=await page.evaluate(()=>({viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,elements:[...document.querySelectorAll('*')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).slice(0,10).map(el=>({tag:el.tagName,className:typeof el.className==='string'?el.className:'',right:el.getBoundingClientRect().right}))}))
 expect(overflow.scrollWidth,JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewport)
 await page.getByRole('button',{name:'切换节点'}).click()
 await page.getByRole('dialog',{name:'切换节点'}).getByRole('button',{name:/Hong Kong/}).click()
 await expect(page).not.toHaveURL(/routes=/)
 await expect(page).toHaveURL(/lh=24/)
 await expect(routes.locator('button[aria-pressed=true]')).toHaveCount(1)
 await expect(page.locator('.latency-route-controls').getByLabel('查看线路',{exact:true})).toContainText('线路 5')
 await expect(page.locator('.latency-view .recharts-line-curve')).toHaveCount(1)
})

for(const width of [320,390])test(`mobile ${width} latency sample panel leaves the chart visible`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await page.goto('/node/1#latency')
 const frame=page.locator('.latency-view .detail-chart-frame')
 await frame.locator('.recharts-line-curve').waitFor()
 const chart=(await frame.boundingBox())!
 await frame.click({position:{x:Math.min(120,chart.width/2),y:100}})
 const tip=frame.locator('.recharts-tooltip-wrapper')
 await expect(tip).toBeVisible()
 const panel=(await tip.boundingBox())!,after=(await frame.boundingBox())!
 expect(panel.y).toBeGreaterThanOrEqual(after.y+after.height)
 expect(panel.x).toBeGreaterThanOrEqual(0)
 expect(panel.x+panel.width).toBeLessThanOrEqual(width)
 expect(panel.height).toBeLessThan(180)
 const range=(await page.locator('.latency-range-caption').boundingBox())!
 expect(range.y).toBeGreaterThanOrEqual(panel.y+panel.height)
 await page.getByRole('button',{name:'关闭图表提示'}).click()
 await expect(tip).toBeHidden()
 expect((await frame.boundingBox())!.height).toBe(chart.height)
})

test('history failure gives a localized retry message',async({page})=>{
 await page.goto('/node/1#latency')
 await page.locator('.latency-view .recharts-line-curve').waitFor()
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}))
 await page.getByRole('button',{name:'刷新历史'}).click()
 const notice=page.locator('.history-notice')
 await expect(notice).toContainText('历史服务暂时不可用，请稍后重试。')
 await expect(notice).not.toContainText('Service Unavailable')
 await expect(notice.getByRole('button',{name:'重试'})).toBeVisible()
 await expect(page.locator('.latency-view .recharts-line-curve')).toBeVisible()
})

test('touch can zoom the mobile time sliders and restore the full range',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,viewport:{width:390,height:844},isMobile:true,hasTouch:true})
 const page=await context.newPage()
 try{
  await page.goto('/node/1#latency')
  await expect(page.locator('#ma-chart-zoom')).toBeVisible()
  const slider=page.getByRole('slider',{name:'结束时间',exact:true})
  await slider.scrollIntoViewIfNeeded();const box=(await slider.boundingBox())!
  await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2)
  await expect(page.getByRole('button',{name:'恢复全范围',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'恢复全范围',exact:true}).click()
  await expect(slider).toHaveValue(await slider.getAttribute('max')||'')
 }finally{await context.close()}
})
