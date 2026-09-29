import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const language of ['zh','en'])test(`900px ${language} preview canvases align when captions wrap`,async({page})=>{
 await page.setViewportSize({width:900,height:1000})
 await page.addInitScript(lang=>localStorage.setItem('monitor-next-language',lang),language)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/1')
 const curves=page.locator('.resource-trend svg')
 await expect(curves).toHaveCount(3)
 const a=(await curves.nth(0).boundingBox())!,b=(await curves.nth(1).boundingBox())!
 expect(Math.abs(a.y-b.y)).toBeLessThan(1)
 const disk=page.locator('.detail-metric-card[data-metric="disk_used"]'),diskCurve=(await curves.nth(2).boundingBox())!,diskCard=(await disk.boundingBox())!
 expect(diskCurve.y).toBeGreaterThan(diskCard.y)
})
for(const width of [320,390])test(`mobile settings selects keep their intrinsic width at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/?page=settings')
 const select=page.getByRole('combobox',{name:'节点列表',exact:true})
 await expect(select).toBeVisible()
 const sizes=await select.evaluate(el=>{
  const original=el.getBoundingClientRect().width
  const clone=el.cloneNode(true) as HTMLElement
  clone.style.cssText='position:fixed;visibility:hidden;max-width:none;flex-shrink:0'
  el.parentElement!.append(clone);const natural=clone.getBoundingClientRect().width;clone.remove()
  return {original,natural}
 })
 expect(sizes.original).toBeGreaterThanOrEqual(sizes.natural-1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
