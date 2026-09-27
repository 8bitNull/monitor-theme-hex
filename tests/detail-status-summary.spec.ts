// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

test('offline detail surfaces last report and condenses unavailable live readings',async({page})=>{
 await page.setViewportSize({width:800,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[5]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/6')
 await expect(page.locator('.detail-last-seen')).toContainText('上次上报：')
 await expect(page.locator('.overview-unavailable')).toContainText('实时资源与网速暂不可用')
 await expect(page.locator('.detail-live .resource')).toHaveCount(0)
 await expect(page.locator('.overview-account')).toBeVisible()
 await expect(page.locator('.detail-network-reading')).toHaveCount(0)
 await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 await expect(page.getByRole('button',{name:'网络延迟',exact:true})).toHaveAttribute('aria-pressed','true')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})

test('online detail keeps route readings in latency history',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/1')
 await expect(page.locator('.detail-network-reading')).toHaveCount(0)
 await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 await expect(page.getByLabel('查看线路',{exact:true})).toContainText('Tokyo gateway')
 await expect(page.locator('.detail-chart-frame .recharts-line-curve')).toHaveCount(1)
})
