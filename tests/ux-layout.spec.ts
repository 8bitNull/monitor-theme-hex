import {chooseOption} from './select'
import {expect,test,type Page} from '@playwright/test'
import {metrics,nodes} from '../scripts/fixtures.mjs'

async function fixture(page:Page,{grouped=false,warnings=false,longName=false}:{grouped?:boolean;warnings?:boolean;longName?:boolean}={}){
 const items=nodes().map((node,index)=>({
  ...node,
  group:grouped?'Production':node.group,
  name:longName&&index===0?'Tokyo · VeryLongProductionGatewayNameWithIPv6AndRegionalFailover '+node.name:node.name,
  ipv6:longName&&index===0?'2001:0db8:85a3:0000:0000:8a2e:0370:7334':node.ipv6,
  ...(warnings&&index===0?{metrics:{...node.metrics!,cpu:94},traffic_limit:1,expires_at:new Date(Date.now()+86400000).toISOString().slice(0,10)}:{}),
 }))
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:items}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:metrics()}))
}

test('short desktop starts with map expanded and retains region filtering after collapse',async({page})=>{
 await page.setViewportSize({width:1024,height:768});await fixture(page);await page.goto('/')
 const map=page.locator('.map-frame')
 await expect(map.getByRole('button',{name:'收起地图'})).toBeVisible()
 await map.getByRole('button',{name:'收起地图'}).click()
 await expect(map.getByRole('button',{name:'展开地图'})).toBeVisible()
 await expect(map.locator('.home-region-bar')).toBeVisible()
 const core=page.locator('.node-card .resources').first()
 await expect(core).toBeVisible()
 expect((await core.boundingBox())!.y).toBeLessThan(768)
 await chooseOption(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true}),'JP')
 await expect(page.locator('.node-card')).toHaveCount(1)
 await map.getByRole('button',{name:'展开地图'}).click()
 await expect(map.getByRole('button',{name:'收起地图'})).toBeVisible()
 await expect(page.locator('.node-card')).toHaveCount(1)
 await map.getByRole('button',{name:'收起地图'}).click()
 await expect(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})).toHaveAttribute('data-value','JP')
})

test('desktop map and card density preferences survive reload while compact cards retain warnings',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await fixture(page,{warnings:true});await page.goto('/')
 await expect(page.locator('.map-frame').getByRole('button',{name:'收起地图'})).toBeVisible()
 await page.locator('.map-frame').getByRole('button',{name:'收起地图'}).click()
 await page.locator('.map-frame').getByRole('button',{name:'展开地图'}).click()
 await page.reload()
 await expect(page.locator('.map-frame').getByRole('button',{name:'收起地图'})).toBeVisible()
 await page.locator('.map-frame').getByRole('button',{name:'收起地图'}).click()
 await chooseOption(page.getByRole('combobox',{name:'卡片密度'}),'detailed')
 await expect(page.locator('.node-card').first().locator('.card-billing')).toBeVisible()
 await page.reload()
 await expect(page.locator('.map-frame').getByRole('button',{name:'展开地图'})).toBeVisible()
 await expect(page.getByRole('combobox',{name:'卡片密度'})).toHaveAttribute('data-value','detailed')
 await chooseOption(page.getByRole('combobox',{name:'卡片密度'}),'compact')
 const card=page.locator('.node-card').first()
 await expect(card).toContainText('高负载')
 await expect(card).toContainText('即将到期')
 await expect(card).toContainText('流量额度已用尽')
 await expect(card.locator('.card-billing')).toBeHidden()
 await card.getByRole('button',{name:'更多信息'}).click()
 await expect(card.locator('.card-billing')).toBeVisible()
})

test('desktop reset columns keeps search and sort and persists the default layout',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next-table-columns-v1'))localStorage.setItem('monitor-next-table-columns-v1',JSON.stringify({columns:['cpu'],mobileColumns:['cpu','latency'],tableLayout:'separate',mobileTableLayout:'grouped',columnsVersion:5}))})
 await fixture(page);await page.goto('/')
 await page.locator('.desktop-header-search').getByRole('searchbox',{name:'搜索节点'}).fill('Tokyo')
 await page.getByRole('button',{name:'表格视图'}).click()
 await page.locator('.node-table th[data-column=cpu] button').click()
 await expect(page.locator('.node-table th[data-column=cpu]')).toHaveAttribute('aria-sort','ascending')
 await page.getByRole('button',{name:'恢复默认列'}).click()
 await expect(page.locator('.node-table th[data-column=traffic]')).toBeVisible()
 await expect(page.locator('.node-table th[data-column=cpu]')).toHaveAttribute('aria-sort','ascending')
 await expect(page.locator('.desktop-header-search').getByRole('searchbox',{name:'搜索节点'})).toHaveValue('Tokyo')
 await page.reload()
 await expect(page.locator('.node-table th[data-column=traffic]')).toBeVisible()
})

test('grouped mobile list shows its first card near the top and detail billing expands',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,{grouped:true});await page.goto('/')
 const card=page.locator('.ma-node').first()
 await expect(card).toBeVisible()
 const firstCardY=(await card.boundingBox())!.y
 console.log(`Grouped first card y=${firstCardY}`)
 expect(firstCardY).toBeLessThanOrEqual(274)
 await card.locator('>button').click()
 const billing=page.getByRole('button',{name:'流量与账单'})
 await expect(billing).toHaveAttribute('aria-expanded','false')
 await billing.click()
 await expect(billing).toHaveAttribute('aria-expanded','true')
 await expect(page.locator('.ma-detail-overview')).toContainText('费用')
})

test('mobile overview puts warnings before routine statistics and compresses empty reminders',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page);await page.goto('/?page=overview')
 const attention=page.getByRole('heading',{name:'需要关注'})
 const stats=page.locator('.ma-stat-grid')
 expect((await attention.boundingBox())!.y).toBeLessThan((await stats.boundingBox())!.y)
 await expect(page.locator('.ma-reminder-empty')).toBeVisible()
 await expect(page.locator('.ma-reminder-empty')).toContainText('暂无到期或流量提醒')
})

for (const width of [320,390]) test(`mobile facts keep long values right aligned at ${width}px`,async({page,context})=>{
 await page.setViewportSize({width,height:844});await fixture(page,{longName:true})
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes().map((node,index)=>index===0?{
  ...node,os:'Debian GNU/Linux 12',kernel:'6.1.0-28-cloud-amd64-production',
  cpu_name:'Intel Xeon Platinum 8488C Production Processor',
  ipv6:'2001:0db8:85a3:0000:0000:8a2e:0370:7334',
 }:node)}}))
 await page.goto('/node/1')
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'资料'}).click()
 const facts=page.locator('.detail-information')
 for(const label of ['Agent','系统','CPU','IPv6']){
  const row=facts.locator('.detail-facts > div').filter({has:page.locator('dt').filter({hasText:new RegExp(`^${label}$`)})})
  await expect(row.locator('dd')).toBeVisible()
  await expect(row.locator('dd')).toHaveCSS('text-align','right')
  await expect(row.locator('.fact-value')).toHaveCSS('text-align','right')
  expect(await row.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 }
 await context.grantPermissions(['clipboard-read','clipboard-write'])
 await facts.getByRole('button',{name:'复制：IPv6',exact:true}).click()
 await expect(facts.getByRole('status')).toHaveText('已复制')
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('desktop and mobile layouts fit light, dark and English long-name viewports',async({page})=>{
 test.setTimeout(90000)
 await fixture(page,{grouped:true,longName:true});await page.goto('/')
 for(const [width,height] of [[1024,768],[1440,900],[390,844],[320,640]]){
  await page.setViewportSize({width,height})
  for(const mode of ['light','dark'] as const){
   await page.evaluate(mode=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:2,appearance:mode})),mode)
   await page.reload()
   await expect(page.locator(width<=720?'.ma-node':'.node-card').first()).toBeVisible()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   await page.screenshot({path:`tests/artifacts/ux-layout-${width}x${height}-${mode}-zh.png`,fullPage:true})
  }
 }
 await page.evaluate(()=>localStorage.setItem('monitor-next-language','en'))
 for(const [width,height] of [[1024,768],[390,844],[320,640]]){
  await page.setViewportSize({width,height});await page.reload()
  await expect(page.locator(width<=720?'.ma-node':'.node-card').first()).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await page.screenshot({path:`tests/artifacts/ux-layout-${width}x${height}-dark-en.png`,fullPage:true})
 }
})

test('desktop supplementary information expands together below routes without moving core readings or keyboard focus',async({page})=>{
 await fixture(page);await page.goto('/')
 const card=page.locator('.node-card').first()
 await expect(card.locator('.latency-reading')).toBeVisible()
 const routeOffset=()=>card.locator('.route-matrix').evaluate(el=>el.getBoundingClientRect().top-el.closest('.node-card')!.getBoundingClientRect().top)
 const routeBefore=await routeOffset()
 const toggle=card.locator('.node-secondary-toggle')
 await expect(toggle).toHaveAccessibleName('更多信息')
 await toggle.focus();await page.keyboard.press('Enter')
 await expect(toggle).toHaveAccessibleName('收起信息')
 await expect(toggle).toBeFocused()
 const panel=card.locator('.node-supplementary')
 await expect(toggle).toHaveAttribute('aria-controls',await panel.getAttribute('id')||'missing')
 for(const selector of ['.node-connections','.card-billing','.node-price'])await expect(panel.locator(selector)).toBeVisible()
 const routeAfter=(await card.locator('.route-matrix').boundingBox())!
 expect(await routeOffset()).toBeCloseTo(routeBefore,0)
 expect((await panel.boundingBox())!.y).toBeGreaterThanOrEqual(routeAfter.y+routeAfter.height)
 await page.keyboard.press('Enter')
 await expect(panel).toBeHidden()
 await expect(card.getByRole('button',{name:'更多信息',exact:true})).toBeFocused()
})

test('single-route loading keeps the card height stable when probe data arrives',async({page})=>{
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
 let finish!:()=>void
 const pending=new Promise<void>(resolve=>{finish=resolve})
 await page.route('**/api/nodes/*/metrics?*',async route=>{await pending;await route.fulfill({json:metrics()})})
 await page.goto('/')
 const card=page.locator('.node-card')
 await expect(card.locator('.ping-loading')).toBeVisible()
 const before=(await card.boundingBox())!.height
 finish()
 await expect(card.locator('.latency-link')).toBeVisible()
 expect(Math.abs((await card.boundingBox())!.height-before)).toBeLessThanOrEqual(4)
})
