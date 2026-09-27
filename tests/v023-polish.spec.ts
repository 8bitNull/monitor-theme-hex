// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function setup(page:any){
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map((node,i)=>i===0?{...node,ipv4:'192.0.2.10',ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd',expires_at:new Date(Date.now()+3*86400000).toISOString().slice(0,10)}:node)}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
}

test('overview search and back-to-top stay compact on desktop',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await setup(page);await page.goto('/');await expect(page.locator('.desktop-header-search input')).toBeVisible()
 await page.locator('.desktop-header-search input').fill('Hong Kong');await expect(page.locator('.node-card')).toHaveCount(1);await expect(page.locator('.node-card')).toContainText('Hong Kong')
 await page.locator('.desktop-header-search input').fill('');await expect(page.locator('.node-card')).toHaveCount(6)
 await page.evaluate(()=>scrollTo(0,1200));await expect(page.getByRole('button',{name:'返回顶部',exact:true})).toBeVisible();await page.getByRole('button',{name:'返回顶部',exact:true}).click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(10)
})

test('compact desktop search and visible network facts preserve the primary scan',async({page})=>{
 await page.setViewportSize({width:800,height:844});await setup(page);await page.goto('/')
 const search=page.getByRole('searchbox',{name:'搜索节点',exact:true});await expect(search).toBeVisible()
 const box=(await search.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(800)
 await search.fill('Tokyo');await expect(page.locator('.node-card')).toHaveCount(1)
 await page.getByRole('button',{name:'清除搜索',exact:true}).click();await expect(page.locator('.node-card')).toHaveCount(6)
 const card=page.locator('.node-card').first();await expect(card.locator('.card-auxiliary-toggle')).toHaveCount(0)
 await expect(card.locator('.resources .resource')).toHaveCount(4);await expect(card.locator('.speed-pair')).toBeVisible();await expect(card.locator('.route-matrix')).toBeVisible()
 await expect(card.locator('.node-secondary-disclosure')).toHaveCount(0);await expect(card.locator('.node-connections')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})

test('compact desktop detail groups, alignment and history ranges are bounded',async({page})=>{
 await page.setViewportSize({width:800,height:844});await setup(page);await page.goto('/node/1');await page.locator('.detail-facts-toggle').click()
 for(const label of ['硬件与系统','网络与流量'])await expect(page.getByRole('region',{name:label}).locator('.detail-fact-section-body')).toBeVisible()
 await expect(page.locator('#detail-fact-groups details')).toHaveCount(0)
 const hardware=page.locator('section[aria-label="硬件与系统"]');await expect(hardware.getByRole('button',{name:'复制：CPU',exact:true})).toHaveCount(0);await expect(hardware.locator('.fact-value').filter({hasText:'AMD EPYC'}).first()).toHaveCSS('text-align','right');await expect(page.getByRole('button',{name:'复制：IPv6',exact:true}).locator('xpath=ancestor::dd').locator('.fact-value')).toHaveCSS('text-align','right')
 const toolbar=page.locator('.detail-chart-toolbar');await expect(toolbar).toHaveAttribute('data-range-count','4');const tabs=await toolbar.locator('.detail-tabs button').evaluateAll(bs=>bs.map(b=>{const box=b.getBoundingClientRect();return {top:box.top,bottom:box.bottom,x:box.x,right:box.right}}));const ranges=await toolbar.locator('.detail-ranges button').evaluateAll(bs=>bs.map(b=>{const box=b.getBoundingClientRect();return {top:box.top,bottom:box.bottom,x:box.x,right:box.right}}));expect(new Set([...tabs,...ranges].map(box=>Math.round(box.top))).size).toBe(2);expect(ranges[3].x).toBeGreaterThan(ranges[2].x);expect(ranges[3].top).toBe(ranges[2].top);const toolbarBox=await toolbar.boundingBox(),refreshBox=(await toolbar.locator('.detail-refresh').boundingBox())!;expect(refreshBox.y).toBeLessThan(ranges[0].top);expect(ranges[3].right).toBeLessThanOrEqual(toolbarBox!.x+toolbarBox!.width);await expect(toolbar.locator('.detail-refresh')).toBeVisible()
 await page.getByRole('button',{name:'网络延迟',exact:true}).click();await expect(toolbar).toHaveAttribute('data-range-count','3');const latencyRanges=await toolbar.locator('.detail-ranges button').evaluateAll(bs=>bs.map(b=>{const box=b.getBoundingClientRect();return {top:box.top,bottom:box.bottom,right:box.right}}));expect(new Set(latencyRanges.map(box=>Math.round(box.top))).size).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})

test('compact desktop resource selector aligns with the toolbar right edge',async({page})=>{
 for(const width of [768,800]){
  await page.setViewportSize({width,height:844});await setup(page);await page.goto('/node/1')
  const toolbar=page.locator('.detail-chart-toolbar[data-history-tab=resources]')
  const selector=toolbar.locator('.detail-resource-metric-mobile > summary')
  const toolbarBox=(await toolbar.boundingBox())!,selectorBox=(await selector.boundingBox())!
  expect(Math.abs(toolbarBox.x+toolbarBox.width-selectorBox.x-selectorBox.width)).toBeLessThan(12)
  await selector.click()
  const menuBox=(await toolbar.locator('.detail-resource-metric-menu').boundingBox())!
  expect(menuBox.x).toBeGreaterThanOrEqual(0)
  expect(menuBox.x+menuBox.width).toBeLessThanOrEqual(width)
 }
})

test('compact desktop latency controls align at the toolbar right edge',async({page})=>{
 for(const width of [768,800]){
  await page.setViewportSize({width,height:844});await setup(page);await page.goto('/node/1')
  await page.getByRole('button',{name:'网络延迟',exact:true}).click()
  const toolbar=page.locator('.detail-chart-toolbar[data-history-tab=latency]')
  const toolbarBox=(await toolbar.boundingBox())!
  const tabs=(await toolbar.locator('.detail-tabs').boundingBox())!
  const smooth=(await toolbar.locator('.detail-smooth').boundingBox())!
  const refresh=(await toolbar.locator('.detail-refresh').boundingBox())!
  expect(smooth.x).toBeGreaterThanOrEqual(tabs.x+tabs.width)
  const probe=toolbar.locator('.detail-probe-legend')
  if(await probe.count()){
   const probeBox=(await probe.boundingBox())!
   expect(probeBox.x).toBeGreaterThanOrEqual(tabs.x+tabs.width)
   expect(smooth.x).toBeGreaterThanOrEqual(probeBox.x+probeBox.width)
  }
  expect(Math.abs(toolbarBox.x+toolbarBox.width-smooth.x-smooth.width)).toBeLessThan(12)
  expect(Math.abs(refresh.x+refresh.width-smooth.x-smooth.width)).toBeLessThan(2)
  const toggle=toolbar.getByRole('checkbox',{name:'抑制尖峰'})
  await toggle.check();await expect(toggle).toBeChecked()
 }
})

test('desktop billing warning is visible in the overview',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await setup(page);await page.goto('/node/1');await expect(page.locator('.overview-expiry')).toHaveClass(/expiring/);await expect(page.locator('.detail-fact-groups>section')).toHaveCount(2);const box=await page.locator('.overview-account').boundingBox();expect(box).not.toBeNull()
})
