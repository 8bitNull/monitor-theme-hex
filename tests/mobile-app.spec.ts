import {test,expect,type Page} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:Page){
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map((n,i)=>({...n,group:i<3?'生产环境':'备用节点'}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
}
async function fits(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
for(const width of [320,390])test(`mobile app at ${width}: navigation, filters, detail and settings`,async({page})=>{
 await page.setViewportSize({width,height:844});await setup(page);await page.goto('/')
 await expect(page.locator('.ma-node')).toHaveCount(6);await expect(page.locator('.desktop-app-header')).toBeHidden();await expect.poll(()=>page.locator('.ma-node .flag-icon').first().evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true)
 await page.getByRole('searchbox',{name:'搜索节点'}).fill('Tokyo');await expect(page.locator('.ma-node')).toHaveCount(1)
 await page.getByRole('button',{name:'清除搜索',exact:true}).click()
 await page.getByRole('button',{name:'筛选节点',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'离线',exact:true}).click();await page.getByRole('button',{name:/^显示 \d+ 个节点$/}).click();await expect(page.locator('.ma-node')).toHaveCount(1)
 await page.locator('.ma-node>button').click();await expect(page.locator('.ma-detail-overview')).toContainText('离线');await expect(page.locator('.ma-big-grid')).toHaveCount(0)
 await page.getByRole('button',{name:'返回总览',exact:true}).click();await expect(page.locator('.ma-node:visible')).toHaveCount(1)
 await page.getByRole('button',{name:'筛选节点',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'重置',exact:true}).click();await page.getByRole('button',{name:/^显示 \d+ 个节点$/}).click()
 await expect(page.locator('.ma-node')).toHaveCount(6);await page.screenshot({path:`tests/artifacts/v030-home-${width}.png`})
 await page.locator('.ma-node>button').first().click();await expect(page.locator('.ma-big-grid')).toHaveCount(2)
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'资源',exact:true}).click();await expect(page.locator('.detail-resource-charts')).toBeVisible();await fits(page);await expect(page.locator('.ma-detail-tabs button[aria-pressed=true]')).toHaveCSS('border-bottom-width','0px');await expect(page.locator('.ma-detail-tabs button[aria-pressed=true]')).toHaveCSS('box-shadow','none');await page.screenshot({path:`tests/artifacts/v030-resources-${width}.png`})
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'网络',exact:true}).click();await expect(page.locator('.latency-view')).toBeVisible();await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect(page).toHaveURL(/lh=24/);await fits(page);await page.screenshot({path:`tests/artifacts/v030-network-${width}.png`})
 await page.getByRole('button',{name:'切换节点',exact:true}).click();await page.getByRole('dialog').getByRole('button').filter({hasText:'Singapore'}).click();await expect(page.locator('.ma-detail-tabs button[aria-pressed=true]')).toHaveText('网络');await expect(page.getByRole('button',{name:'24 小时',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'资料',exact:true}).click();await expect(page.locator('.detail-fact-groups')).toBeVisible();await fits(page)
 await page.getByRole('button',{name:'返回总览',exact:true}).click();await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'概览',exact:true}).click();await expect(page.locator('.ma-hero')).toBeVisible();await page.screenshot({path:`tests/artifacts/v030-overview-${width}.png`})
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'设置',exact:true}).click();await page.getByLabel('明暗模式',{exact:true}).selectOption('dark');await expect(page.locator('html')).toHaveClass(/dark/);await page.getByLabel('节点列表',{exact:true}).selectOption('detailed');await page.getByLabel('默认历史范围',{exact:true}).selectOption('1');await page.screenshot({path:`tests/artifacts/v030-settings-${width}.png`});await fits(page)
 await page.reload();await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'设置',exact:true}).click();await expect(page.getByLabel('节点列表',{exact:true})).toHaveValue('detailed');await expect(page.getByLabel('默认历史范围',{exact:true})).toHaveValue('1')
 await page.getByRole('combobox',{name:'Language / 语言',exact:true}).selectOption('en');await expect(page.locator('html')).toHaveAttribute('lang','en-US');await fits(page)
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Nodes',exact:true}).click();await expect.poll(()=>page.locator('.ma-node .flag-icon').first().evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBe(true);await page.screenshot({path:`tests/artifacts/v030-dark-en-${width}.png`});await fits(page)
})
test('mobile history failure retains data and direct links preserve sections',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await page.goto('/node/1?lh=1#latency');await expect(page.locator('.latency-view')).toBeVisible();await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeEnabled()
 await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}));await page.getByRole('button',{name:'刷新历史',exact:true}).click();await expect(page.locator('.history-notice')).toContainText('保留上次历史记录');await expect(page.locator('.latency-view')).toBeVisible()
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'资料',exact:true}).click();await page.reload();await expect(page.locator('.detail-fact-groups')).toBeVisible();await expect(page.locator('.ma-detail-tabs button[aria-pressed=true]')).toHaveText('资料')
})
test('desktop keeps its existing home and full detail layout',async({page})=>{
 await setup(page);await page.goto('/');await expect(page.locator('.desktop-app-header')).toBeVisible();await expect(page.locator('.node-card')).toHaveCount(6);await expect(page.locator('.ma-nav')).toHaveCount(0)
 await page.locator('.node-open').first().click();await expect(page.locator('.detail-live')).toBeVisible();await expect(page.locator('.detail-history')).toBeVisible();await expect(page.locator('.detail-information')).toBeVisible();await expect(page.locator('.ma-detail-tabs')).toHaveCount(0);await fits(page)
})
test('mobile uses route sheets, retains browse position and does not poll hidden history',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.clock.install();await setup(page)
 let requests=0;await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>{requests++;return r.fulfill({json:metrics()})})
 await page.goto('/node/1');await expect(page.locator('.ma-detail-overview')).toBeVisible();await page.clock.fastForward(35000);expect(requests).toBe(0)
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'网络',exact:true}).click();await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeEnabled();expect(requests).toBeGreaterThan(0)
 await page.getByLabel('查看线路',{exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();const box=(await page.getByRole('dialog').boundingBox())!;expect(Math.abs(box.y+box.height-844)).toBeLessThan(2);await page.getByRole('dialog').getByRole('button',{name:'Tokyo gateway',exact:true}).click();await expect(page.getByLabel('查看线路',{exact:true})).toHaveAttribute('data-value','1')
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'总览',exact:true}).click();const before=requests;await page.clock.fastForward(90000);expect(requests).toBe(before)
 await page.getByRole('button',{name:'返回总览',exact:true}).click();await expect(page.locator('.ma-node')).toHaveCount(6)
 await page.locator('.ma-node>button').last().scrollIntoViewIfNeeded();const scroll=await page.evaluate(()=>scrollY);await page.locator('.ma-node>button').last().click();await page.getByRole('button',{name:'返回总览',exact:true}).click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(scroll-50)
 await page.getByRole('button',{name:'筛选节点',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'离线',exact:true}).click();await page.keyboard.press('Escape');await expect(page.locator('.ma-node:visible')).toHaveCount(6)
})
test('mobile stale and unknown values never become healthy zeroes',async({page})=>{
 await page.setViewportSize({width:320,height:844});await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],last_seen:Math.floor(Date.now()/1000)-3600,metrics:{...nodes()[0].metrics,cpu:99}}]}}));await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}));await page.goto('/')
 await expect(page.locator('.ma-node')).toContainText('数据已过期');await expect(page.locator('.ma-meter b')).toHaveText(['—','—']);await expect(page.locator('.ma-net')).not.toContainText('0 Mbps');await expect(page.locator('.ma-summary')).toContainText('高负载 0');await fits(page)
 await page.locator('.ma-node>button').click();await expect(page.locator('.ma-detail-overview')).toContainText('数据已过期');await expect(page.locator('.ma-big-grid')).toHaveCount(0)
})
