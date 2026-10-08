// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'
test('billing rows align, preserve quota states and fit narrow cards',async({page})=>{
 await page.clock.install({time:new Date('2026-09-23T12:00:00+08:00')})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[
 {...nodes()[0],id:1,traffic_limit:500e9,month_used:220e9,traffic_reset_day:15,expires_at:'2026-09-28'},
 {...nodes()[0],id:2,traffic_limit:500e9,month_used:520e9,traffic_reset_day:31,expires_at:'2026-09-22'},
 {...nodes()[0],id:3,traffic_limit:0,month_used:220e9,traffic_reset_day:1,expires_at:null},
 {...nodes()[0],id:4,traffic_limit:0,month_used:220e9,traffic_reset_day:undefined,expires_at:'2026-11-28'},
 {...nodes()[0],id:5,traffic_limit:500e9,month_used:450e9,traffic_reset_day:1,expires_at:'2026-09-23'}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 for(const width of [768,800,1440])for(const language of ['zh','en']){
  await page.setViewportSize({width,height:1000});await page.addInitScript(language=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,homeRoutes:1,modules:{map:false}}))},language)
  await page.goto('/');const cards=page.locator('.node-card');await expect(cards).toHaveCount(5)
  await expect(cards.locator('.quota,.quota-percent,[role=progressbar]')).toHaveCount(0);await expect(cards.first().locator('.billing-allowance')).toContainText('GB')
  await expect(cards.nth(1).locator('.traffic-summary')).toHaveAttribute('data-quota-state','over')
  await expect(cards.nth(1).locator('.card-expiry')).toHaveAttribute('data-expiry-state','expired')
  await expect(cards.nth(2).locator('.quota')).toHaveCount(0);await expect(cards.nth(2).locator('.billing-allowance')).toContainText('∞')
  await expect(cards.nth(3).locator('.traffic-reset')).toHaveCount(0)
  await expect(cards.nth(4).locator('.traffic-summary')).toHaveAttribute('data-quota-state','near')
  await expect(cards.first().locator('.node-secondary-disclosure')).toHaveCount(0)
  await expect(cards.first().locator('.card-billing')).toBeVisible()
  await expect(cards.first().locator('.billing-used')).toBeVisible()
  for(const card of await cards.all()){
   const layout=await card.evaluate(el=>{const a=el.querySelector('.traffic-summary b')!.getBoundingClientRect(),b=el.querySelector('.card-expiry b')!.getBoundingClientRect();return {delta:Math.abs(a.y-b.y),overflow:el.scrollWidth>el.clientWidth+1}})
   expect(layout.delta).toBeLessThanOrEqual(1);expect(layout.overflow).toBeFalsy()
  }
  if(language==='zh')await cards.first().screenshot({path:`tests/artifacts/billing-aligned/${width}.png`})
 }
})


for(const width of [768,800,1440])test(`complete note tags are directly readable at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900})
 const note='这是一段很长的完整备注。'.repeat(20)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],remark:'国际线路;'+note+';Backup;Production'}]}}))
 await page.goto('/')
 const card=page.locator('.node-card'),notes=card.locator('.node-remarks')
 await expect(card.locator('.card-billing')).toBeVisible()
 await expect(notes.locator('.detail-remark-tag')).toHaveCount(4)
 await expect(notes).toContainText(note)
 await expect(card.locator('.remark-more,.card-notes-dialog,.node-secondary-toggle')).toHaveCount(0)
 for(const tag of await notes.locator('.detail-remark-tag').all())expect(await tag.evaluate(el=>el.scrollWidth<=el.clientWidth+1&&el.scrollHeight<=el.clientHeight+1)).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
