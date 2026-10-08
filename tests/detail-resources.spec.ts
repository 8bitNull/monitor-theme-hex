// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {expandRoutes} from './routes'
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {setSiteDefault} from './settings'
async function setup(page:any,{many=false,empty=false,error=false}={}){
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],name:'Tokyo · 东京主节点',ipv4_pin:true,ipv6_pin:true,agent_version:'1.0.0',remark:'2.5Gbps 国际线路;Anti-DDoS;应用与备份服务',expires_at:'2026-09-22'}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>{if(error)return r.fulfill({status:503});const d=metrics();const count=many?18:3;return r.fulfill({json:empty?{metrics:[],ping:[],probes:{}}:{...d,probes:Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,`线路 ${i+1}`])),ping:d.ping.flatMap(p=>Array.from({length:count},(_,i)=>({...p,task_id:i+1,latency:p.latency+i*20})))}})})
 await page.goto('/node/1')
}
test('single resource plot retains selection across refresh and time/tab changes',async({page})=>{
 await setup(page)
 const group=page.getByRole('group',{name:'资源指标'})
 for(const [label,key] of [['CPU','cpu'],['内存','mem_used'],['硬盘','disk_used'],['网速','network']]){
  await group.getByRole('button',{name:label,exact:true}).click()
  await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric',key)
  await expect(page.locator('.resource-chart-panel .recharts-wrapper')).toHaveCount(1)
 }
 await page.getByRole('button',{name:'24 小时',exact:true}).click()
 await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','network')
 await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','network')
 await page.getByRole('button',{name:'网络延迟',exact:true}).click();await page.getByRole('button',{name:'资源',exact:true}).click()
 await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','network')
 await expect(page.locator('.detail-metric-network .detail-metric-note').first()).toContainText('TCP 102 · UDP 24')
 await expect(page.locator('.overview-remarks')).toContainText('2.5Gbps');await expect(page.locator('.detail-information')).toContainText('1.0.0')
})
test('responsive composition and stable hover with many routes in light and dark',async({page})=>{
 test.setTimeout(90000)
 await setup(page,{many:true})
 for(const appearance of ['light','dark']){
  await page.locator('.next-theme').evaluate((el,a)=>{el.classList.toggle('dark',a==='dark');document.documentElement.classList.toggle('dark',a==='dark')},appearance)
  for(const width of [768,800,1024,1440]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0))
   const live=(await page.locator('.detail-live').boundingBox())!,history=(await page.locator('.detail-history').boundingBox())!,facts=(await page.locator('.detail-information').boundingBox())!
   if(width>=900){expect(facts.y).toBeGreaterThan(history.y+history.height);expect(history.y).toBeGreaterThan(live.y+live.height)}else{expect(facts.y).toBeGreaterThan(history.y+history.height);expect(history.y).toBeGreaterThan(live.y+live.height)}
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  }
  await page.getByRole('button',{name:'网络延迟',exact:true}).click();await expandRoutes(page);const hidden=page.locator('.route-chips button[aria-pressed][aria-pressed="false"]');while(await hidden.count())await hidden.first().click();await page.keyboard.press('Escape')
  await expect(page.locator('.route-chips button[aria-pressed]')).toHaveCount(18)
  const frame=page.locator('.detail-chart-frame'),before=(await frame.boundingBox())!
  await frame.hover({position:{x:100,y:100}});expect((await frame.boundingBox())!.height).toBe(before.height)
  await page.getByLabel('抑制尖峰').check();expect((await frame.boundingBox())!.height).toBe(before.height)
  await expandRoutes(page);const selected=page.locator('.route-chips button[aria-pressed][aria-pressed="true"]');while(await selected.count())await selected.first().click();await expect(frame).toContainText('没有选中任何探测');expect((await frame.boundingBox())!.height).toBe(before.height)
  await page.getByRole('button',{name:'资源',exact:true}).click()
 }
})
test('all graph styles fit the compact sidebar and narrow screen',async({page})=>{
 await setup(page)
 for(const graph of ['columns','bar','ring','minimal']){
  await setSiteDefault(page,'graph',graph)
  for(const width of [768,1024]){
   await page.setViewportSize({width,height:1000})
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
   expect(await page.locator('.detail-live').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  }
 }
})
test('empty and failed requests remain distinct and retry recovers',async({page})=>{
 await setup(page,{empty:true});await expect(page.locator('.detail-history')).toContainText('这段时间没有历史数据')
 await page.getByRole('button',{name:'网络延迟',exact:true}).click();await expect(page.locator('.detail-history')).toContainText('这段时间没有延迟数据')
 await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}))
 await page.getByRole('button',{name:'刷新历史',exact:true}).click();await expect(page.locator('.detail-history [role=alert]')).toBeVisible()
 await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.getByRole('button',{name:'重试',exact:true}).click();await expect(page.locator('.detail-chart-frame .recharts-wrapper')).toBeVisible()
})
test('unlimited quota, long facts and condensed offline overview remain readable',async({page})=>{
 await setup(page)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],online:false,traffic_limit:0,name:'节点名称'.repeat(30),cpu_name:'Long processor model '.repeat(20),remark:'无分号长备注'.repeat(40)}]}}))
 await page.reload();await expect(page.locator('.overview-unavailable')).toContainText('离线');await expect(page.locator('.detail-connections,.detail-resources')).toHaveCount(0);await expect(page.locator('.overview-account')).toBeVisible();await expect(page.locator('.overview-usage progress')).toHaveCount(0)
 for(const width of [768,1024]){await page.setViewportSize({width,height:1000});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()}
 await expect(page.getByRole('button',{name:'展开备注',exact:true})).toHaveCount(0);await expect(page.locator('.overview-remarks')).toContainText('无分号长备注')
})

test('missing samples and long time gaps break curves without hiding zero',async({page})=>{
 await setup(page)
 const now=Math.floor(Date.now()/1000),base=metrics().metrics[0]
 await page.unroute('**/api/nodes/*/metrics?*')
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[{...base,ts:now-11000,cpu:10},{...base,ts:now-10940,cpu:20},{...base,ts:now-60,cpu:0},{...base,ts:now,cpu:10}],probes:{1:'含超时线路'},ping:[{task_id:1,ts:now-240,latency:10},{task_id:1,ts:now-180,latency:20},{task_id:1,ts:now-120,latency:null},{task_id:1,ts:now-60,latency:0},{task_id:1,ts:now,latency:10}]}}))
 await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 const area=page.locator('.resource-chart-panel .recharts-area-curve')
 await expect(area).toBeVisible();expect((await area.getAttribute('d'))!.match(/M/g)?.length).toBe(2)
 await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 const line=page.locator('.detail-chart-frame .recharts-line-curve')
 await expect(line).toBeVisible();expect((await line.getAttribute('d'))!.match(/M/g)?.length).toBe(2)
})

for(const width of [800,900,1199])for(const language of ['zh','en'])test(`named resource controls switch metrics at ${width} ${language}`,async({page})=>{
 await page.setViewportSize({width,height:900})
 await page.addInitScript(language=>localStorage.setItem('monitor-next-language',language),language)
 await setup(page)
 const group=page.locator('.detail-chart-toolbar .detail-resource-metric-desktop')
 const labels=language==='zh'?['CPU','内存','硬盘','网速']:['CPU','Memory','Disk','Network']
 const keys=['cpu','mem_used','disk_used','network']
 for(const [index,label] of labels.entries()){
  const button=group.getByRole('button',{name:label,exact:true})
  await expect(button).toBeVisible()
  await expect(button.locator('span')).toBeVisible()
  await expect(button).toHaveAttribute('title',label)
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed','true')
  await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric',keys[index])
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
})
