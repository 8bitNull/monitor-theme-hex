// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {setSiteDefault} from './settings'

for(const width of [768,800,850,1024,1440])test('detail and settings polish remain usable at '+width,async({page})=>{
 test.setTimeout(90000)
 await page.setViewportSize({width,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],name:'Netcup RS1000 · 法兰克福',agent_version:'1.0.0',remark:'2.5Gbps 国际线路;应用与备份服务'}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 for(const language of ['zh','en'])for(const appearance of ['light','dark']){
  await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,designVersion:1,appearance}))},{language,appearance})
  await page.goto('/node/1');await page.locator('.resource-chart-panel .recharts-wrapper').waitFor()
  if(language==='en'){
   const metricLabels=['CPU','Memory','Disk','Network'];
   await expect(page.locator('.detail-resource-metric-desktop')).toBeVisible()
   await expect(page.locator('.detail-resource-metric-mobile')).toBeHidden()
   await expect(page.locator('.detail-resource-metric-desktop button')).toHaveText(metricLabels)
  }
  if(width===800){const cpu=await page.locator('.detail-metric-card[data-metric=cpu]').boundingBox();expect(cpu!.y+cpu!.height).toBeLessThan(844)}
  for(const graph of ['bar','ring','columns','minimal']){
   await setSiteDefault(page,'graph',graph)
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
   expect(await page.locator('.detail-live').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
   const overflow=await page.locator('.detail-metric-card').evaluateAll(els=>els.some(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('.detail-metric-value,.detail-speed strong')].some(n=>{const b=n.getBoundingClientRect();return b.width>0&&(b.right>r.right+1||b.left<r.left-1)})}))
   expect(overflow,`${language} ${appearance} ${graph}`).toBeFalsy()
  }
  for(const button of await page.locator('.detail-tabs button,.detail-ranges button,.detail-refresh,.resource-chart-tabs button').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(40)
  await page.locator('.detail-chart-frame').scrollIntoViewIfNeeded()
  const chart=await page.locator('.detail-chart-frame').boundingBox()
  await page.mouse.move(chart!.x+chart!.width-20,chart!.y+120)
  const tip=page.locator('.recharts-tooltip-wrapper').first()
  if(await tip.isVisible()){const box=await tip.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width)}
  await expect(page.locator('.settings-drawer')).toHaveCount(0)
 }
})
