import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

test('persistent overview ignores legacy collapse preferences and exposes card facts',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('hex-desktop-v1',JSON.stringify({cardDensity:'compact',mapExpanded:false}))
  localStorage.setItem('monitor-next',JSON.stringify({summaryCollapsed:true,detailInfoMode:'collapsed'}))
 })
 await page.goto('/')
 await expect(page.locator('.home-overview-grid')).toBeVisible()
 await expect(page.locator('.home-overview-grid .summary-grid')).toBeVisible()
 await expect(page.locator('.home-overview-grid .map-frame')).toBeVisible()
 const summary=(await page.locator('.overview-summary').boundingBox())!,map=(await page.locator('.map-frame').boundingBox())!
 expect(map.x).toBeGreaterThan(summary.x+summary.width-1)
 await expect(page.locator('.summary-toggle,.home-map-toggle,.node-secondary-toggle')).toHaveCount(0)
 await expect(page.locator('.node-card').first().locator('.node-supplementary')).toBeVisible()
 for(const width of [721,900,1440]){
  await page.setViewportSize({width,height:1000})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
})

test('map counts and all region controls filter the node list',async({page})=>{
 const data=nodes().slice(0,3).map((n,i)=>({...n,country:i===2?'JP':'US',online:i!==1}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:data}}))
 await page.goto('/')
 const us=page.locator('.map-cluster[data-region=US]')
 await expect(us).toContainText('2')
 await expect(page.locator('.map-region-chips')).toContainText('美国')
 await page.locator('.map-region-chips button[data-region=JP]').click()
 await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.map-region-chips button[data-region=JP]')).toHaveAttribute('aria-pressed','true')
 await page.locator('.map-region-chips button[data-region=JP]').click()
 await expect(page.locator('.node-card')).toHaveCount(3)
 await us.focus();await us.press('Enter')
 await expect(page.locator('.node-card')).toHaveCount(2)
 await expect(page.locator('.map-state-legend')).toContainText('离线')
})

test('phone billing and device facts are visible without disclosure controls',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.goto('/node/1?section=overview')
 await expect(page.locator('#ma-billing-details')).toBeVisible()
 await expect(page.locator('.ma-billing-panel')).toContainText('费用')
 await expect(page.locator('.ma-billing-toggle')).toHaveCount(0)
 await page.getByRole('button',{name:'资料',exact:true}).click()
 await expect(page.locator('#detail-fact-groups')).toBeVisible()
 await expect(page.locator('.detail-facts-toggle')).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
