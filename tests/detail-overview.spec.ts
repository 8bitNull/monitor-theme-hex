// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from './classicTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const width of [768,800,1024,1440])test(`overview groups and full-width history fit at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],expires_at:'2026-10-07',remark:'国际线路;Backup;Production;更多备注用于检查展开后的完整内容',ipv4:'192.0.2.1',ipv6:'2001:db8::1'}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 for(const language of ['zh','en'])for(const appearance of ['light','dark']){
  await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance}))},{language,appearance})
  await page.goto('/node/1')
  await expect(page.locator('.detail-resource-charts')).toBeVisible()
  await expect(page.locator('.desktop-detail-metrics>.detail-metric-card')).toHaveCount(4)
  await expect(page.locator('.overview-expiry')).toContainText('2026.10.07')
  await expect(page.locator('.detail-identity .detail-meta-tags')).toHaveCount(0)
  const geometry=await page.evaluate(()=>{
   const box=(s:string)=>document.querySelector(s)!.getBoundingClientRect()
   const live=box('.detail-live'),history=box('.detail-history'),remarks=box('.overview-remarks'),groups=box('.detail-overview-grid'),footer=box('.overview-account-footer'),price=box('.overview-price')
   return {order:history.top>=live.bottom&&remarks.top>=groups.bottom-1,fullWidth:Math.abs(history.width-live.width)<2,priceContained:price.left>=footer.left&&price.right<=footer.right,overflow:document.documentElement.scrollWidth>innerWidth||[...document.querySelectorAll('.detail-metric-card,.detail-speed>div,.overview-billing>div')].some(el=>el.scrollWidth>el.clientWidth+1)}
  })
  expect(geometry).toEqual({order:true,fullWidth:true,priceContained:true,overflow:false})
  await page.locator('.detail-remarks-toggle').click()
  await expect(page.locator('.overview-remarks')).toContainText('更多备注用于检查展开后的完整内容')
  if(width<900)await page.locator('.detail-facts-toggle').click()
  await expect(page.locator('.detail-fact-groups>section')).toHaveCount(2)
  await expect(page.locator('.copy-fact')).toHaveCount(2)
  if(language==='zh'&&[800,1440].includes(width))await page.locator('.node-detail').screenshot({path:`tests/artifacts/detail-overview/${width}-${appearance}.png`,style:'header {visibility:hidden} '})
 }
})
