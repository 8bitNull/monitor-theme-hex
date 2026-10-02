// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {expandRoutes} from './routes'
import {test,expect} from './classicTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {setSiteDefault} from './settings'
async function setup(page:any,long=false){
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],name:long?'Tokyo 东京超长名称 '.repeat(18):'Tokyo',cpu_name:'AMD EPYC Processor '.repeat(long?12:1),ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd',remark:long?Array.from({length:8},(_,i)=>`备注 ${i} ${'Long text '.repeat(8)}`).join(';'):'国际线路;Production'}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>{const d=metrics();return r.fulfill({json:{...d,probes:Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,`Route ${i+1}`])),ping:d.ping.flatMap(p=>Array.from({length:12},(_,i)=>({...p,task_id:i+1,latency:p.latency+i*10})))}})})
 await page.goto('/node/1');await expect(page.locator('.recharts-area-curve')).toBeVisible()
}
for(const width of [768,800,1024,1440])test(`primary metrics and long identity fit at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page,true)
 await expect(page.locator('.desktop-detail-metrics>.detail-metric-card')).toHaveCount(4);await expect(page.locator('.detail-metric-card[data-metric=cpu]')).toContainText('负载')
 const expand=page.getByRole('button',{name:'展开名称',exact:true}),heading=(await page.locator('.detail-title h2').boundingBox())!;expect((await expand.boundingBox())!.y).toBeGreaterThanOrEqual(heading.y+heading.height)
 await expand.click();await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'收起名称',exact:true}).click()
 await page.getByRole('button',{name:'展开备注',exact:true}).click();await expect(page.locator('.detail-meta-tags .detail-remark-tag')).toHaveCount(8)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();await page.getByRole('button',{name:'收起备注',exact:true}).click()
 if(width<900)await page.locator('.detail-facts-toggle').click()
 const cpuRow=page.locator('section[aria-label="硬件与系统"] .detail-facts>div').filter({hasText:'CPU'}).first();await expect(cpuRow.getByRole('button',{name:'复制：CPU',exact:true})).toHaveCount(0);await expect(cpuRow.locator('.fact-value')).toBeVisible()
 await expect(page.locator('.overview-account')).toBeVisible()
 for(const graph of ['bar','ring','columns','minimal']){await setSiteDefault(page,'graph',graph);expect(await page.locator('.detail-live').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();const tracks=await page.locator('.detail-metric-track').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect()));expect(tracks).toHaveLength(3);expect(Math.abs(tracks[0].bottom-tracks[1].bottom)).toBeLessThanOrEqual(1)}
})
test('tooltip follows route list order using stable catalog order',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await setup(page);await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 const legend=page.locator('.route-chips');await expandRoutes(page);await legend.getByRole('button',{name:'Route 10',exact:true}).click();await expandRoutes(page)
 const order=await legend.locator('button[aria-pressed]').evaluateAll(elements=>elements.map(el=>el.getAttribute('aria-label')));expect(order.slice(0,3)).toEqual(['Route 1','Route 2','Route 3'])
 const hidden=page.locator('.route-chips button[aria-pressed][aria-pressed="false"]');while(await hidden.count())await hidden.first().click();await page.keyboard.press('Escape');const frame=page.locator('.detail-chart-frame');await frame.hover({position:{x:160,y:100}});await expect(frame.locator('.recharts-tooltip-wrapper')).toBeVisible()
 expect(await frame.locator('.recharts-tooltip-item-name').allTextContents()).toEqual(order)
 await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect(page.locator('.recharts-line-curve')).toHaveCount(12);await frame.hover({position:{x:180,y:100}});expect(await frame.locator('.recharts-tooltip-item-name').allTextContents()).toEqual(order)
})
test('update feedback belongs to current range and retained data',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await setup(page);const status=page.locator('.detail-update'),refresh=page.getByRole('button',{name:'刷新历史',exact:true});await expect(status).toContainText('更新于');const timestamp=await refresh.getAttribute('title')
 await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}));await refresh.click();await expect(status).toContainText('上次成功更新：');await expect(refresh).toHaveAttribute('title',timestamp!);await expect(page.locator('.recharts-area-curve')).toBeVisible()
 await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect(status).toHaveText('更新失败');await expect(refresh).toHaveAttribute('title','刷新历史');await expect(page.locator('.recharts-area-curve')).toHaveCount(0)
 await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}));await page.getByRole('button',{name:'重试',exact:true}).click();await expect(status).toContainText('更新于')
 await page.setViewportSize({width:800,height:844});await expect(status).toBeVisible();await expect(status).toContainText('更新于')
})
