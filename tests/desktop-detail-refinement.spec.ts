import {test,expect} from '@playwright/test'
import {detailFixture} from './detail-aesthetics-fixture'
import {nodes} from '../scripts/fixtures.mjs'
import {bytes} from '../src/lib/format'

test('daily traffic reads upload before download',async({page})=>{
 await detailFixture(page)
 const node={...nodes()[0],day_tx:1048576,day_rx:9437184}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[node]}}))
 await page.goto('/node/1')
 const row=page.locator('.detail-facts>div').filter({has:page.locator('dt',{hasText:'今日流量'})})
 await expect(row.locator('dd')).toHaveText(`↑ ${bytes(node.day_tx)} · ↓ ${bytes(node.day_rx)}`)
})

for(const width of [721,900,1199])test(`named desktop metric controls at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await detailFixture(page)
 await page.goto('/node/1')
 const controls=page.locator('.detail-chart-toolbar .detail-resource-metric-desktop')
 for(const [name,metric] of [['CPU','cpu'],['内存','mem_used'],['硬盘','disk_used']] as const){
  const button=controls.getByRole('button',{name,exact:true})
  await expect(button.locator('span')).toBeVisible()
  await button.click()
  await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric',metric)
 }
 const selection=(await page.locator('.detail-toolbar-selection').boundingBox())!
 const actions=(await page.locator('.detail-toolbar-actions').boundingBox())!
 const range=(await page.locator('.detail-chart-toolbar .detail-ranges').boundingBox())!
 const status=(await page.locator('.detail-chart-toolbar .detail-update').boundingBox())!
 expect(actions.y).toBeGreaterThanOrEqual(selection.y+selection.height)
 expect(range.x+range.width).toBeLessThanOrEqual(status.x)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
