// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'

test('card keeps stable placeholders while live metrics and probe records load',async({page})=>{
 await page.setViewportSize({width:800,height:844})
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[{...nodes()[0],metrics:null}]}}))
 let finishProbe:((value:void)=>void)|undefined
 const probeHeld=new Promise<void>(resolve=>{finishProbe=resolve})
 await page.route('**/api/nodes/*/metrics?*',async route=>{await probeHeld;await route.fulfill({json:metrics()})})
 await page.goto('/')
 const card=page.locator('.node-card').first()
 await card.locator('.route-matrix').scrollIntoViewIfNeeded()
 await expect(card).toHaveAttribute('data-metric-state','missing')
 await expect(card.locator('.ping-loading')).toBeVisible()
 await expect(card.locator('.route-matrix')).toHaveAttribute('data-loading','true')
 await expect(card.getByRole('status',{name:'正在读取探测记录…'})).toBeVisible()
 await expect(card.getByText('正在读取探测记录…')).toHaveCount(0)
 const loading=await card.evaluate(el=>{
  const metric=el.querySelector('.bar-number')!,probe=el.querySelector('.ping-loading')!,route=el.querySelector('.route-select .select-value')!
  return {metric:getComputedStyle(metric,'::after').width,route:getComputedStyle(route,'::after').width,probe:probe.getBoundingClientRect().height,overflow:el.scrollWidth>el.clientWidth+1}
 })
 expect(loading.metric).toBe('38px')
 expect(loading.route).toBe('68px')
 expect(loading.probe).toBeGreaterThanOrEqual(65)
 expect(loading.overflow).toBeFalsy()
 finishProbe?.()
 await expect(card.locator('.ping-loading')).toHaveCount(0)
 await expect(card.locator('.route-matrix')).toHaveAttribute('data-loading','false')
 await expect(card.locator('.latency-link').first()).toBeVisible()
})
