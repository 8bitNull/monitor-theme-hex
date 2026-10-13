import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
const address='2001:db8:1234:5678:abcd:1234:5678:abcd'
async function fixture(page:import('@playwright/test').Page){
 await page.routeWebSocket('**/api/ws',s=>s.close())
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],remark:'东京主力节点;网站服务;每月流量 500 GB;'+('长备注 '.repeat(150)),ipv4:'192.0.2.10',ipv6:address,traffic_limit:500*1024**3,price:6.5,billing_cycle:'monthly',expires_at:'2026-11-12'}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
}
for(const width of [1440,900,721])test(`desktop grouped detail aligns without overflow at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:1000});await fixture(page);await page.goto('/node/1')
 await expect(page.getByRole('heading',{name:'费用',exact:true})).toBeVisible()
 const rects=await page.locator('.account-card').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,right:r.right}}))
 if(width===1440){expect(rects[0].y).toBe(rects[1].y)}
 if(width<=1100){expect(rects[1].y).toBeGreaterThan(rects[0].y);expect(rects[1].y).toBe(rects[2].y)}
 expect(Math.abs(rects[1].w-rects[2].w)).toBeLessThanOrEqual(1)
 if(width===1440){const metrics=await page.locator('.detail-metric-card').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().x));expect(Math.abs(rects[1].x-metrics[2])).toBeLessThanOrEqual(1);expect(Math.abs(rects[2].x-metrics[3])).toBeLessThanOrEqual(1)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
for(const width of [1440,390])test(`header remarks expand without losing text at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await fixture(page);await page.goto('/node/1')
 const remarks=page.locator('.detail-header-remarks');await expect(remarks).toBeVisible()
 const before=(await remarks.boundingBox())!;const tabs=await page.locator(width>720?'.detail-live':'.ma-detail-tabs').boundingBox();expect(before.y+before.height).toBeLessThanOrEqual(tabs!.y)
 await remarks.getByRole('button',{name:'展开备注',exact:true}).click();await expect(remarks.getByRole('button')).toHaveAttribute('aria-expanded','true');expect((await remarks.boundingBox())!.height).toBeGreaterThan(before.height)
 await remarks.getByRole('button',{name:'收起备注',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
for(const width of [320,390,430])test(`phone grouped billing and full address copy at ${width}`,async({page,context,browserName})=>{
 await page.setViewportSize({width,height:844});await fixture(page);await page.goto('/node/1')
 const usage=(await page.locator('.account-traffic').boundingBox())!,cost=(await page.locator('.account-cost').boundingBox())!,expiry=(await page.locator('.account-expiry').boundingBox())!
 expect(cost.y).toBeGreaterThan(usage.y);expect(cost.y).toBe(expiry.y)
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'资料',exact:true}).click()
 await expect(page.getByRole('region',{name:'系统环境'})).toContainText('节点分组')
 await expect(page.locator('.ma-info-extra')).toHaveCount(0)
 const copy=page.getByRole('button',{name:'复制：IPv6',exact:true});const row=copy.locator('xpath=ancestor::dd/..');await expect(row.locator('.fact-value')).toHaveText(address)
 expect((await row.locator('dd').boundingBox())!.y).toBeGreaterThan((await row.locator('dt').boundingBox())!.y)
 expect((await copy.boundingBox())!.width).toBeGreaterThanOrEqual(44)
 if(browserName==='chromium'){await context.grantPermissions(['clipboard-read','clipboard-write']);await copy.click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(address)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
for(const [mode,description,want] of [['up','仅上传','1.00 GB'],['down','仅下载','3.00 GB'],['max','上传与下载取较大值','3.00 GB']] as const)test(`traffic accounting label follows ${mode}`,async({page})=>{
 await fixture(page)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],traffic_mode:mode,month_used:undefined,month_tx:1024**3,month_rx:3*1024**3,traffic_reset_day:15}]}}))
 await page.goto('/node/1');await expect(page.locator('.account-traffic')).toContainText(description);await expect(page.locator('.overview-usage>b')).toContainText(want);await expect(page.locator('.account-traffic')).toContainText('每月 15 日重置')
})
test('unset expiry and invalid reset day keep explicit unknown states',async({page})=>{
 await fixture(page);await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],expires_at:null,traffic_reset_day:0,price:0}]}}));await page.goto('/node/1')
 await expect(page.locator('.account-expiry')).toContainText('未设到期');await expect(page.locator('.account-traffic')).toContainText('流量重置未知');await expect(page.locator('.account-cost')).toContainText('免费 / 未填写')
})
test('a single long header tag shows at most two text lines before expansion',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],remark:'Long remark words '.repeat(40)}]}}));await page.goto('/node/1')
 const content=page.locator('.detail-remarks-content');await expect(page.getByRole('button',{name:'展开备注'})).toBeVisible()
 const visibleLines=await content.evaluate(el=>{const bounds=el.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(el.querySelector('.detail-remark-tag')!);return new Set([...range.getClientRects()].filter(r=>r.top>=bounds.top&&r.bottom<=bounds.bottom).map(r=>Math.round(r.top))).size})
 expect(visibleLines).toBeLessThanOrEqual(2)
})
