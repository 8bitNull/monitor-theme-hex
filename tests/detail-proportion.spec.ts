// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {expandRoutes} from './routes'
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:any,count=3){
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],agent_version:'1.2.3',remark:'国际线路;Production',ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd'}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>{const d=metrics();return r.fulfill({json:{...d,probes:Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,`Tokyo 线路 ${i+1}`])),ping:d.ping.flatMap(p=>Array.from({length:count},(_,i)=>({...p,task_id:i+1,latency:i===0?0:i===1?12.34567:p.latency+i*10})))}})})
 await page.goto('/node/1');await expect(page.locator('.recharts-area-curve')).toBeVisible()
}
for(const width of [899,900,1024,1199,1200,1440,1920])test(`detail proportions and billing flow at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page)
 if(width<900)await page.locator('.detail-facts-toggle').click()
 const groups=page.locator('.detail-fact-groups'),sections=groups.locator('section'),hardware=(await sections.nth(0).boundingBox())!,network=(await sections.nth(1).boundingBox())!,billing=(await page.locator('.overview-account').boundingBox())!
 const resources=(await page.locator('.desktop-detail-metrics').boundingBox())!,live=(await page.locator('.detail-live').boundingBox())!,history=(await page.locator('.detail-history').boundingBox())!
 await expect(sections).toHaveCount(2)
 if(width>=900){expect(Math.abs(hardware.width-network.width)).toBeLessThanOrEqual(1);expect(Math.abs(hardware.y-network.y)).toBeLessThanOrEqual(1)}
 expect(billing.y).toBeGreaterThanOrEqual(resources.y+resources.height-1)
 expect(history.y).toBeGreaterThan(live.y+live.height);expect(hardware.y).toBeGreaterThan(history.y+history.height)
 expect(Math.abs(history.width-live.width)).toBeLessThanOrEqual(1)
 if(width===1440)expect((await page.locator('.detail-chart-frame').boundingBox())!.height).toBeGreaterThanOrEqual(340)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
for(const width of [768,800])test(`tooltip header, precision and scroll at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await setup(page,20);await page.getByRole('button',{name:'网络延迟',exact:true}).click();await expandRoutes(page);const hidden=page.locator('.route-chips button[aria-pressed][aria-pressed="false"]');while(await hidden.count())await hidden.first().click();await page.keyboard.press('Escape')
 const frame=page.locator('.detail-chart-frame');await frame.scrollIntoViewIfNeeded();await frame.click({position:{x:150,y:110}})
 const tip=frame.locator('.chart-tooltip'),body=tip.locator('.recharts-default-tooltip'),close=tip.getByRole('button',{name:'关闭图表提示',exact:true});await expect(tip).toBeVisible()
 const first=body.locator('.recharts-tooltip-item').filter({has:page.locator('.recharts-tooltip-item-name',{hasText:/Tokyo 线路 1$/})});await expect(first).toContainText('0 ms')
 const second=body.locator('.recharts-tooltip-item').filter({has:page.locator('.recharts-tooltip-item-name',{hasText:/Tokyo 线路 2$/})});await expect(second).toContainText('12.3 ms');await expect(second).not.toContainText('34567')
 const heading=(await tip.locator('.chart-tooltip-heading').boundingBox())!,button=(await close.boundingBox())!;expect(button.y).toBeGreaterThanOrEqual(heading.y);expect(button.y+button.height).toBeLessThanOrEqual(heading.y+heading.height);expect(button.height).toBeGreaterThanOrEqual(44)
 await body.evaluate(el=>el.scrollTop=el.scrollHeight);expect((await close.boundingBox())!.y).toBe(button.y);await expect(close).toBeVisible()
 const b=(await tip.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width);const canvas=(await frame.boundingBox())!;expect(b.x+b.width).toBeLessThanOrEqual(canvas.x+canvas.width);expect(button.x+button.width).toBeLessThanOrEqual(canvas.x+canvas.width)
 await close.click();await expect(frame.locator('.recharts-tooltip-wrapper')).toBeHidden()
})
test('route line and legend styles remain stable through range and selection changes',async({page})=>{
 test.setTimeout(90000)
 await page.setViewportSize({width:1440,height:900});await setup(page,20);await page.getByRole('button',{name:'网络延迟',exact:true}).click();await expandRoutes(page);const hidden=page.locator('.route-chips button[aria-pressed][aria-pressed="false"]');while(await hidden.count())await hidden.first().click();await page.keyboard.press('Escape')
 const lines=page.locator('.recharts-line-curve');await expect(lines).toHaveCount(20)
 const styles=()=>lines.evaluateAll(elements=>elements.map(el=>[el.getAttribute('name'),el.getAttribute('stroke'),el.getAttribute('stroke-dasharray')]))
 const before=await styles();expect(new Set(before.map(v=>v[1])).size).toBe(20);expect(before.every(v=>v[2]===null)).toBeTruthy()
 await expandRoutes(page)
 for(const [name,color,dash] of before){const line=page.locator('.route-chips').getByRole('button',{name:name!,exact:true}).locator('svg line');expect(await line.getAttribute('stroke')).toBe(color);expect(await line.getAttribute('stroke-dasharray')).toBe(dash)}
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect(lines).toHaveCount(20);expect(await styles()).toEqual(before)
 await expandRoutes(page);const selected=page.locator('.route-chips button[aria-pressed][aria-pressed="true"]');while(await selected.count()>0)await selected.first().click();const hiddenAgain=page.locator('.route-chips button[aria-pressed][aria-pressed="false"]');while(await hiddenAgain.count())await hiddenAgain.first().click();await expect(lines).toHaveCount(20);expect(await styles()).toEqual(before)
})
for(const width of [800,1440])test(`loading empty and failure share the chart canvas at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page)
 const body=page.locator('.detail-history-body');const height=(await body.boundingBox())!.height;let pending:any
 await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>{pending=r})
 await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect(page.getByLabel('正在读取历史数据')).toBeVisible();expect(Math.abs((await body.boundingBox())!.height-height)).toBeLessThanOrEqual(2);await expect(body.locator('.history-state svg')).toBeVisible()
 await pending.fulfill({json:{metrics:[],ping:[],probes:{}}});await expect(body).toContainText('这段时间没有历史数据');expect(Math.abs((await body.boundingBox())!.height-height)).toBeLessThanOrEqual(2)
 await page.getByRole('button',{name:'1 小时',exact:true}).click();await expect(page.getByLabel('正在读取历史数据')).toBeVisible();await pending.fulfill({status:503});await expect(page.locator('.history-notice')).toBeVisible();await expect(body).toContainText('暂无可用历史数据');expect(Math.abs((await body.boundingBox())!.height-height)).toBeLessThanOrEqual(2)
})
