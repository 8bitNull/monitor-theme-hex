import {expandRoutes} from './routes'
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:any,width:number,routes='1,3'){
 await page.setViewportSize({width,height:900})
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],cpu_name:'AMD EPYC Processor '.repeat(8),ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd',remark:'Remark;'.repeat(8)}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>{const d=metrics();return r.fulfill({json:{...d,probes:Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,`Route ${i+1}`])),ping:d.ping.flatMap(p=>Array.from({length:12},(_,i)=>({...p,task_id:i+1,latency:i===0?0:12.34567+i,loss:undefined})))}})})
 await page.goto(`/node/1${routes==='inherit'?'':`?routes=${routes}`}#latency`);await expandRoutes(page)
}
for(const width of [320,390,1440])test(`route legends expand and support keyboard toggles at ${width}`,async({page})=>{
 await setup(page,width,'1,3');await expandRoutes(page)
 const plot=page.locator('.detail-chart-frame'),height=(await plot.boundingBox())!.height,options=page.locator('.route-chips button[aria-pressed]')
 await expect(options).toHaveCount(12);await expect(page.locator('.probe-bulk-actions,.route-search,.probe-solo,.probe-restore')).toHaveCount(0)
 await expect(options.filter({has:page.locator('.route-chip-check')}).first()).toBeVisible();await expect(page.locator('.route-chips button[aria-pressed="true"] .route-chip-check').first()).toHaveText('✓')
 const route12=page.getByRole('button',{name:'Route 12',exact:true});await route12.click();await expect(route12).toHaveAttribute('aria-pressed','true');await expect(page).toHaveURL(/routes=1%2C3%2C12/)
 expect((await plot.boundingBox())!.height).toBe(height);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await route12.focus();await page.keyboard.press('Space');await expect(route12).toHaveAttribute('aria-pressed','false');await expect(route12).toBeFocused()
})
test('route legends can clear the final route without restoring removed actions',async({page})=>{
 await setup(page,390,'1');await expandRoutes(page);await page.getByRole('button',{name:'Route 1',exact:true}).click()
 await expect(page.locator('.detail-chart-frame')).toContainText('没有选中任何探测');await expect(page.locator('.route-chips button[aria-label="Route 1"]')).toHaveAttribute('aria-pressed','false')
 await expect(page.locator('.probe-bulk-actions,.route-search,.probe-solo,.probe-restore')).toHaveCount(0)
})
for(const width of [390,1440])for(const tab of ['latency','resources'])test(`Escape dismisses and reopens ${tab} tooltip at ${width}`,async({page})=>{
 await setup(page,width);if(tab==='resources')await page.getByRole('button',{name:'资源',exact:true}).click()
 const frame=page.locator('.detail-chart-frame'),tip=frame.locator('.recharts-tooltip-wrapper');await frame.scrollIntoViewIfNeeded()
 if(width<900)await frame.click({position:{x:160,y:100}});else await frame.hover({position:{x:160,y:100}})
 await expect(tip).toBeVisible();if(width<900)await page.getByRole('button',{name:'关闭图表提示',exact:true}).focus();await page.keyboard.press('Escape');await expect(tip).toBeHidden();if(width<900)await expect(frame.locator('.recharts-surface[tabindex]')).toBeFocused()
 if(width<900)await frame.click({position:{x:180,y:100}});else await frame.hover({position:{x:180,y:100}})
 await expect(tip).toBeVisible()
 if(tab==='latency'){await expect(tip).toContainText('0 ms');await expect(tip).toContainText('14.3 ms');await expect(tip.locator('.tooltip-loss').first()).toHaveText(' · 丢 —');const colors=await tip.locator('.recharts-tooltip-item').first().evaluate(el=>({dot:getComputedStyle(el,'::before').backgroundColor,name:getComputedStyle(el.querySelector('.recharts-tooltip-item-name')!).color,value:getComputedStyle(el.querySelector('.recharts-tooltip-item-value')!).color}));expect(colors.name).toBe(colors.value);expect(colors.dot).not.toBe(colors.name)}
})
test('mobile retained data shows successful timestamp, new range does not',async({page})=>{
 await setup(page,390);await expect.poll(()=>page.locator('.recharts-line-curve').count()).toBeGreaterThan(0);await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}));await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(page.locator('.history-retained-time')).toBeVisible();await expect(page.locator('.history-retained-time')).toContainText('上次成功更新：');expect(await page.locator('.recharts-line-curve').count()).toBeGreaterThan(0)
 await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect(page.locator('.history-notice')).toContainText('读取历史数据失败');await expect(page.locator('.history-retained-time')).toHaveCount(0)
})
test('mobile long facts use full row and copy full value',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await setup(page,320);await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'资料',exact:true}).click()
 await expect(page.getByRole('button',{name:'复制：CPU',exact:true})).toHaveCount(0);for(const label of ['IPv6']){const copy=page.getByRole('button',{name:`复制：${label}`,exact:true}),row=copy.locator('xpath=ancestor::dd/..'),dt=(await row.locator('dt').boundingBox())!,dd=(await row.locator('dd').boundingBox())!;expect(dd.y).toBeGreaterThanOrEqual(dt.y+dt.height);expect(Math.abs(dd.x-dt.x)).toBeLessThanOrEqual(1);await copy.click();expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(await row.locator('.fact-value').textContent());expect((await copy.boundingBox())!.width).toBeGreaterThanOrEqual(44)}
 await expect(page.locator('.ma-remarks')).toContainText('Remark')
})
