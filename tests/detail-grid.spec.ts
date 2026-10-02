// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from './classicTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function setup(page:any){
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],name:'Tokyo · 东京主节点'}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>r.fulfill({json:metrics()}))
 await page.goto('/node/1')
 await expect(page.locator('.recharts-area-curve')).toBeVisible()
}

test('detail page uses a light modular reading order',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await setup(page)
 const facts=(await page.locator('.detail-information').boundingBox())!
 const live=(await page.locator('.detail-live').boundingBox())!
 const history=(await page.locator('.detail-history').boundingBox())!
 expect(facts.y).toBeGreaterThan(history.y+history.height)
 expect(history.y).toBeGreaterThan(live.y+live.height)
 expect(await page.locator('.detail-fact-groups>section')).toHaveCount(2)
 expect(await page.locator('.detail-fact-groups').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(2)
 expect(await page.locator('.detail-fact-groups h3 svg')).toHaveCount(2)
 const factsFrame=await page.locator('.detail-information').evaluate(el=>({border:getComputedStyle(el).borderTopWidth,sections:[...el.querySelectorAll('.detail-fact-groups>section')].map(section=>getComputedStyle(section).borderLeftWidth)}))
 expect(factsFrame.border).toBe('1px');expect(factsFrame.sections).toEqual(['0px','1px'])
 const backgrounds=await page.locator('.detail-metric-card,.overview-account,.detail-history,.detail-information').evaluateAll(elements=>elements.map(el=>getComputedStyle(el).backgroundColor))
 expect(new Set(backgrounds)).toEqual(new Set(['rgb(255, 255, 255)']))
 await expect(page.locator('.desktop-detail-metrics')).toContainText('CPU')
 await expect(page.locator('.detail-metric-network')).toContainText('实时网速')
 await expect(page.locator('.detail-live')).not.toContainText('负载 1 / 5 / 15')
})

for(const width of [768,800])test(`detail modules stay readable at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844});await setup(page)
 const facts=(await page.locator('.detail-information').boundingBox())!
 const live=(await page.locator('.detail-live').boundingBox())!
 const history=(await page.locator('.detail-history').boundingBox())!
 expect(facts.y).toBeGreaterThan(history.y+history.height)
 expect(history.y).toBeGreaterThan(live.y+live.height)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
