// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {expandRoutes} from './routes'
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {setSiteDefault} from './settings'
async function setup(page:any,count=3,overrides:Record<string,unknown>={}){
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],agent_version:'1.2.3',ipv4:'192.0.2.1',remark:'国际线路;Backup',expires_at:'2027-01-01',...overrides}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>{const d=metrics();return r.fulfill({json:{...d,probes:Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,`Route ${i+1}`])),ping:d.ping.flatMap(p=>Array.from({length:count},(_,i)=>({...p,task_id:i+1,latency:p.latency+i*10})))}})})
 await page.goto('/node/1?section=resources');await expect(page.locator('.detail-resource-charts')).toBeVisible()
}
test('compact desktop latency controls provide one selector and comparison above the chart',async({page})=>{
 await page.setViewportSize({width:800,height:844})
 await setup(page);await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 const toolbar=page.locator('.detail-chart-toolbar'),controls=page.locator('.latency-route-controls');await expect(toolbar.locator('.detail-smooth')).toBeVisible()
 const route=controls.getByLabel('查看线路',{exact:true}),compare=controls.locator('.expand-routes');await expect(route).toBeVisible()
 await expect(page.getByLabel('查看线路',{exact:true})).toHaveCount(1)
 await expect(toolbar.getByLabel('查看线路',{exact:true})).toHaveCount(0)
 await expect(compare).toHaveAttribute('aria-label','比较线路')
 const smooth=(await toolbar.locator('.detail-smooth').boundingBox())!,selector=(await route.boundingBox())!,tabs=(await toolbar.locator('.detail-tabs').boundingBox())!,bar=(await toolbar.boundingBox())!,plot=(await page.locator('.detail-chart-frame').boundingBox())!
 expect(selector.y).toBeGreaterThanOrEqual(bar.y+bar.height)
 expect(plot.y).toBeGreaterThanOrEqual(selector.y+selector.height)
 expect(Math.abs(smooth.y+smooth.height/2-tabs.y-tabs.height/2)).toBeLessThanOrEqual(2)
 await expect(toolbar.locator('.detail-probe-legend')).toHaveCount(0)
 await expect(page.locator('.route-chips')).toHaveCount(0)
 await expandRoutes(page);await expect(compare).toHaveAttribute('aria-label','收起线路');await expect(page.locator('.route-chips button[aria-pressed]')).toHaveCount(3)
 await compare.click();await expect(compare).toHaveAttribute('aria-label','比较线路');await expect(page.locator('.route-chips')).toHaveCount(0)
})
for(const width of [768,800,850,899,900,1024,1440,1920])test(`detail reading and toolbar geometry at ${width}`,async({page})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:844})
 for(const language of ['zh','en'])for(const appearance of ['light','dark']){
  await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance}))},{language,appearance})
  await setup(page)
  for(const graph of ['bar','ring','columns','minimal']){
   await setSiteDefault(page,'graph',graph);await page.evaluate(()=>scrollTo(0,0))
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
   if(width===800){const b=(await page.locator('.detail-chart-toolbar').boundingBox())!,live=(await page.locator('.detail-live').boundingBox())!;expect(b.y).toBeGreaterThan(live.y+live.height);expect(b.height).toBeLessThanOrEqual(168)}
  }
  for(const tab of ['resources','latency']){
   await page.getByRole('button',{name:language==='zh'?(tab==='resources'?'资源':'网络延迟'):(tab==='resources'?'Resources':'Network latency'),exact:true}).click()
   const toolbar=page.locator('.detail-chart-toolbar'),tabs=(await page.locator('.detail-tabs').boundingBox())!,ranges=(await page.locator('.detail-ranges').boundingBox())!,refresh=(await page.locator('.detail-refresh').boundingBox())!,selection=(await toolbar.locator('.detail-toolbar-selection').boundingBox())!,actions=(await toolbar.locator('.detail-toolbar-actions').boundingBox())!,bar=(await toolbar.boundingBox())!
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
   expect(selection.y).toBeGreaterThanOrEqual(bar.y-1)
   expect(actions.y+actions.height).toBeGreaterThan(selection.y)
   expect(actions.y).toBeLessThanOrEqual(selection.y+selection.height+20)
   expect(actions.y+actions.height).toBeLessThanOrEqual(bar.y+bar.height+1)
   expect(actions.x+actions.width).toBeLessThanOrEqual(bar.x+bar.width+1)
   expect(Math.abs(refresh.y+refresh.height/2-(ranges.y+ranges.height/2))).toBeLessThanOrEqual(2)
   if(tab==='latency'){
    const smooth=(await toolbar.locator('.detail-smooth').boundingBox())!
    expect(Math.abs(smooth.y+smooth.height/2-(tabs.y+tabs.height/2))).toBeLessThanOrEqual(2)
    expect(smooth.x).toBeGreaterThanOrEqual(tabs.x+tabs.width)
   }
   const all=await page.locator('.detail-ranges button').evaluateAll(buttons=>buttons.map(button=>{const box=button.getBoundingClientRect();return {top:box.top,x:box.x,right:box.right}}));expect(new Set(all.map(box=>Math.round(box.top))).size).toBe(1)
   expect(all.length).toBe(tab==='resources'?4:3);if(tab==='resources')expect(all[3].x).toBeGreaterThan(all[2].x)
   expect(refresh.x+refresh.width).toBeLessThanOrEqual(width+1)
   if(width<900){await expect(page.locator('.detail-tabs button>span')).toHaveCount(2);for(const span of await page.locator('.detail-tabs button>span').all())await expect(span).toBeVisible();if(tab==='resources'){await expect(page.locator('.detail-resource-metric-mobile')).toBeVisible();await expect(page.locator('.detail-resource-metric-desktop')).toBeHidden()}}
   else if(tab==='resources')await expect(page.locator('.detail-resource-metric-desktop')).toBeVisible()
   expect(tabs.x).toBeGreaterThanOrEqual(selection.x-1)
   expect(await page.locator('.detail-history').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  }
  if(width<900)await expect(page.locator('.detail-facts-toggle')).toHaveAttribute('aria-expanded','false')
  else {await expect(page.locator('.detail-facts-toggle')).toHaveCount(0);await expect(page.locator('#detail-fact-groups')).toBeVisible()}
 }
})
test('device information disclosure persists across reload and viewport changes',async({page})=>{
 await page.setViewportSize({width:899,height:900});await setup(page)
 const toggle=page.locator('.detail-facts-toggle');await expect(toggle).toHaveAttribute('aria-expanded','false')
 await page.setViewportSize({width:900,height:900});await expect(toggle).toHaveCount(0);await expect(page.locator('#detail-fact-groups')).toBeVisible()
 await page.setViewportSize({width:899,height:900});await expect(toggle).toHaveAttribute('aria-expanded','false');await toggle.click();await page.reload();await expect(toggle).toHaveAttribute('aria-expanded','true')
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('monitor-next')||'{}').detailInfoMode)).toBe('expanded')
 await page.setViewportSize({width:800,height:844});await expect(toggle).toHaveAttribute('aria-expanded','true')
 await expect(page.getByRole('region',{name:'硬件与系统',exact:true})).toContainText('1.2.3')
})
test('320px facts keep short labels beside values and wrap long facts without overflow',async({page})=>{
 await page.setViewportSize({width:768,height:844});await setup(page,3,{cpu_name:'AMD EPYC 7B13 '.repeat(5)})
 await page.locator('.detail-facts-toggle').click()
 for(const label of ['Agent','系统','交换空间','流量重置']){
  const row=page.locator('.detail-facts>div').filter({has:page.locator(`dt:text-is("${label}")`)}),dt=await row.locator('dt').boundingBox(),dd=await row.locator('dd').boundingBox()
  expect(Math.abs(dt!.y-dd!.y)).toBeLessThanOrEqual(1)
 }
 const cpu=page.locator('.detail-facts>div.fact-long').filter({has:page.locator('dt:text-is("CPU")')}),cpuLabel=await cpu.locator('dt').boundingBox(),cpuValue=await cpu.locator('.fact-value').boundingBox()
 expect(cpuValue!.y).toBeGreaterThan(cpuLabel!.y)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.setViewportSize({width:800,height:844});const agent=page.locator('.detail-facts>div').filter({has:page.locator('dt:text-is("Agent")')}),agentLabel=await agent.locator('dt').boundingBox(),agentValue=await agent.locator('dd').boundingBox()
 expect(Math.abs(agentLabel!.y-agentValue!.y)).toBeLessThanOrEqual(1)
})
test('loading empty failure and success share the same history canvas',async({page})=>{
 await page.setViewportSize({width:800,height:844});await setup(page);const body=page.locator('.detail-history-body');const height=(await body.boundingBox())!.height
 await page.unroute('**/api/nodes/*/metrics?*');let pending:any,calls=0;await page.route('**/api/nodes/*/metrics?*',r=>{pending=r;calls++})
 await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect(page.getByLabel('正在读取历史数据')).toBeVisible();expect(Math.abs((await body.boundingBox())!.height-height)).toBeLessThanOrEqual(2)
 await pending.fulfill({json:{metrics:[],ping:[],probes:{}}});await expect(body).toContainText('这段时间没有历史数据');expect(Math.abs((await body.boundingBox())!.height-height)).toBeLessThanOrEqual(2)
 await page.getByRole('button',{name:'刷新历史',exact:true}).click();await expect.poll(()=>calls).toBe(2);await pending.fulfill({status:503})
 await expect(page.locator('.history-notice')).toBeVisible();expect(Math.abs((await body.boundingBox())!.height-height)).toBeLessThanOrEqual(2)
})
for(const count of [1,3,20])test(`route legends handle ${count} routes without resizing the plot`,async({page})=>{
 await page.setViewportSize({width:800,height:844});await setup(page,count);await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 const plot=page.locator('.detail-chart-frame');const height=(await plot.boundingBox())!.height
 if(count===1){
  await expect(page.locator('.route-chips')).toHaveCount(0)
  await expect(plot.locator('.recharts-line-curve')).toHaveCount(1)
  return
 }
 await expandRoutes(page)
 await expect(page.locator('.route-chips button[aria-pressed]')).toHaveCount(count)
 const hidden=page.locator('.route-chips button[aria-pressed="false"]');if(await hidden.count()){await hidden.first().click();await expect(page.locator('.route-chips button[aria-pressed="true"]')).toHaveCount(Math.min(count,2))}
 expect((await plot.boundingBox())!.height).toBe(height);await expect(page.locator('.route-chips button[aria-pressed="true"] .route-chip-check').first()).toHaveText('✓')
 await expect(page.locator('.route-chips button>span').first()).toHaveCSS('text-overflow','ellipsis')
})
test('long identity notes expand and copy feedback does not move facts',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);await setup(page)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],name:'超长名称'.repeat(20),ipv4:'192.0.2.1',remark:Array.from({length:8},(_,i)=>`备注${i} ${'长文本'.repeat(30)}`).join(';')}]}}));await page.reload()
 await page.setViewportSize({width:768,height:568});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await page.getByRole('button',{name:'展开备注',exact:true}).click();await expect(page.locator('.detail-meta-tags .detail-remark-tag')).toHaveCount(8)
 await page.getByRole('button',{name:'收起备注',exact:true}).click();await page.locator('.detail-facts-toggle').click()
 await expect(page.getByRole('button',{name:'复制：CPU',exact:true})).toHaveCount(0);const button=page.getByRole('button',{name:'复制：IPv4',exact:true}),row=button.locator('xpath=ancestor::dd');const before=(await row.boundingBox())!.height
 await button.click();await expect(page.getByRole('status')).toHaveText('已复制');expect((await row.boundingBox())!.height).toBe(before)
 await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{value:()=>Promise.reject(new Error('denied')),configurable:true}));await button.click()
 await expect(page.getByRole('status')).toHaveText('复制失败，请手动选择文本');expect((await row.boundingBox())!.height).toBe(before)
})
for(const width of [320,390])test(`mobile resource chart tap shows bounded tooltip with units at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844});await setup(page)
 const frame=page.locator('.resource-chart-panel .detail-chart-frame');await frame.scrollIntoViewIfNeeded();await frame.click({position:{x:180,y:120}})
 const tip=frame.locator('.recharts-tooltip-wrapper');await expect(tip).toBeVisible();await expect(tip).toContainText('%')
 const b=(await tip.boundingBox())!;expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width)
})
