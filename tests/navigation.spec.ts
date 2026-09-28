import {test,expect} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:any,count=10){
 await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next'))localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,infoDensity:'full',modules:{map:true}}))})
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:Array.from({length:count},(_,i)=>({...nodes()[0],id:i+1,name:`Node ${i+1}`,ipv4:'192.0.2.1'}))}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>{const d=metrics();return r.fulfill({json:{...d,probes:{1:'A',2:'B'},ping:d.ping.flatMap(p=>[p,{...p,task_id:2,latency:80}])}})})
}
test('title picker searches, preserves range, resets route and returns focus without overflow',async({page})=>{
 await setup(page);await page.goto('/node/1?rh=24&lh=1&routes=2#latency')
 await expect(page.getByLabel('查看线路',{exact:true})).toHaveAttribute('data-value','2')
 await page.getByRole('button',{name:'切换节点',exact:true}).click()
 await page.getByRole('dialog').getByRole('searchbox',{name:'搜索节点'}).fill('missing');await expect(page.getByRole('dialog')).toContainText('没有符合条件的节点')
 await page.getByRole('dialog').getByRole('searchbox',{name:'搜索节点'}).fill('Node 2')
 await page.getByRole('dialog').getByRole('button',{name:/Node 2/}).click()
 await expect(page).toHaveURL(/node\/2\?.*lh=1.*#latency/)
 await expect(page).not.toHaveURL(/routes=/)
 await expect(page.getByLabel('查看线路',{exact:true})).toHaveAttribute('data-value','auto')
 await expect(page.getByLabel('查看线路',{exact:true})).toContainText('A')
 await expect(page.getByRole('button',{name:'1 小时',exact:true})).toHaveAttribute('aria-pressed','true')
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:900});await page.getByRole('button',{name:'切换节点',exact:true}).click()
  const box=(await page.getByRole('dialog').boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width)
  await page.getByRole('dialog').screenshot({path:`tests/artifacts/node-picker-${width}.png`})
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'切换节点',exact:true})).toBeFocused()
 }
 await expect(page.locator('.detail-node-switcher')).toHaveCount(0)
})
test('route shortcut opens the exact probe without changing home selection',async({page})=>{
 await setup(page,2);await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{homeRoutes:3,module_map:false}}))
 await page.goto('/');const card=page.locator('.node-card').first();await card.getByRole('button',{name:'查看线路：B',exact:true}).click()
 await expect(page).toHaveURL(/node\/1\?.*routes=2.*#latency/)
 await expect(page.getByLabel('查看线路',{exact:true})).toHaveAttribute('data-value','2')
 await page.goBack();await expect(card.getByLabel('节点探测线路')).toHaveAttribute('data-value','auto')
 await card.getByRole('button',{name:/查看 Node 1/}).click();await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','cpu')
})
test('alert links preserve event context and flag unavailable history or deleted nodes',async({page})=>{
 await setup(page,2);await page.addInitScript(()=>{const t=Date.now();localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,modules:{map:false,busiest:true}}));localStorage.setItem('monitor-next-load-alerts-v1',JSON.stringify([1,99].map(id=>({id:String(id),nodeId:id,name:`Node ${id}`,start:t-9*86400000,last:t-9*86400000+60000,end:t-9*86400000+60000,peak:95,status:'recovered'}))))})
 await page.goto('/');await page.getByRole('button',{name:'查看高负载记录',exact:true}).click()
 await expect(page.getByRole('dialog').getByRole('button',{name:'Node 99',exact:true})).toBeDisabled()
 await page.getByRole('dialog').getByRole('button',{name:'Node 1',exact:true}).click()
 await expect(page.locator('.event-context')).toContainText('当前历史范围无法覆盖完整告警时段')
 await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','cpu')
 await expect(page.getByRole('button',{name:'7 天',exact:true})).toHaveAttribute('aria-pressed','true')
 await page.getByRole('button',{name:'网络延迟',exact:true}).click();await page.getByRole('button',{name:'资源',exact:true}).click();await expect(page.locator('.event-context')).toBeVisible()
})
test('failed refresh keeps successful timestamp, copy is complete and map reset restores framing',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await setup(page,2);await page.goto('/node/1')
 const refresh=page.getByRole('button',{name:'刷新历史',exact:true});await expect(refresh).toHaveAttribute('title',/最后成功获取/);const timestamp=await refresh.getAttribute('title')
 await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}));await refresh.click();await expect(page.locator('.detail-history [role=alert]')).toBeVisible();await expect(refresh).toHaveAttribute('title',timestamp!)
 await page.getByRole('button',{name:'复制：IPv4',exact:true}).click();await expect(page.getByRole('status')).toContainText('已复制');expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe('192.0.2.1')
  await page.goto('/');const map=page.locator('.explorer-map');await expect(map).toBeVisible();await page.getByRole('button',{name:'放大查看',exact:true}).click();await expect(map).toHaveClass(/is-fullscreen/);const initial=await map.locator('.map-land').getAttribute('transform');await page.getByRole('button',{name:'放大地图',exact:true}).click();await page.getByRole('button',{name:'适配节点',exact:true}).click();await expect(map.locator('.map-land')).toHaveAttribute('transform',initial!)
 await page.getByRole('button',{name:'查看全部',exact:true}).click();await expect(map.locator('.map-scale')).toHaveText('100%')
})

test('mobile and desktop detail both expose overview navigation',async({page})=>{
 await setup(page,2);await page.goto('/node/1');await expect(page.locator('.detail-navigation')).toBeVisible()
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.ma-detail-header')).toBeVisible();await page.getByRole('button',{name:'返回总览',exact:true}).click();await expect(page.locator('#mobile-node-results')).toBeVisible()
})
