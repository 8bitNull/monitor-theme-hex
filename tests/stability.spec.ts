import {test,expect} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function setup(page:any,count=30){
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,modules:{map:false}})))
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:Array.from({length:count},(_,i)=>({...nodes()[0],id:i+1,sort:i,name:`Node ${i+1}`,remark:i%2?'边缘节点;国际线路;备份服务':'',expires_at:i%2?'2027-01-01':null}))}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>r.fulfill({json:metrics()}))
}

for(const width of [390,1440])test(`return restores node within 24px and rotation keeps it visible at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page);await page.goto('/')
 const target=page.locator('[data-node-id="20"]');await target.scrollIntoViewIfNeeded()
 await expect(target).toBeVisible();await page.evaluate(()=>scrollBy(0,-100))
 // Lazy route readings may change preceding card heights before the click.
 let lastY=NaN,stable=0;
 await expect.poll(async()=>{const y=(await target.boundingBox())!.y;stable=Math.abs(y-lastY)<1?stable+1:0;lastY=y;return stable},{intervals:[100,200,200]}).toBeGreaterThanOrEqual(3)
 const before=(await target.boundingBox())!.y
 await target.click();await expect(page.locator(width<=720?'.ma-detail-overview':'.detail-resource-charts')).toBeVisible()
 await page.goBack();await expect(target).toBeFocused()
 await expect.poll(async()=>Math.abs((await target.boundingBox())!.y-before)).toBeLessThanOrEqual(24)
 await target.click();await expect(page.locator(width<=720?'.ma-detail-overview':'.detail-resource-charts')).toBeVisible()
 await page.setViewportSize({width:width===390?1440:390,height:900});await page.getByRole('button',{name:'返回总览',exact:true}).click()
 await expect(target).toBeFocused();await expect.poll(async()=>(await target.boundingBox())!.y).toBeGreaterThanOrEqual(60)
 expect((await target.boundingBox())!.y).toBeLessThan(200)
})

for(const removed of [false,true])test(`return handles changed node order, removed=${removed}`,async({page})=>{
 await page.clock.install();await setup(page);let changed=false
 await page.unroute('**/api/nodes');await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:Array.from({length:30},(_,i)=>({...nodes()[0],id:i+1,sort:changed?30-i:i,name:`Node ${i+1}`})).filter(n=>!(changed&&removed&&n.id===20))}}))
 await page.goto('/');const target=page.locator('[data-node-id="20"]');await target.scrollIntoViewIfNeeded();await page.evaluate(()=>scrollBy(0,-100))
 const before=(await target.boundingBox())!.y;await target.click();await expect(page.locator('.detail-resource-charts')).toBeVisible()
 changed=true;await page.clock.fastForward(5100)
 if(removed)await expect(page.getByText('节点不存在或未公开。')).toBeVisible()
 await page.goBack();await expect(page.locator('.node-card')).toHaveCount(removed?29:30)
 await page.clock.runFor(600)
 if(!removed){await expect(target).toBeFocused();expect(Math.abs((await target.boundingBox())!.y-before)).toBeLessThanOrEqual(24)}
 else{await expect(target).toHaveCount(0);expect(await page.evaluate(()=>scrollY)).toBeGreaterThan(0)}
})

for(const width of [320,1440])test(`changing live units retain speed geometry at ${width}`,async({page})=>{
 await page.clock.install();await page.setViewportSize({width,height:1000});await setup(page,1)
 let value=0;await page.unroute('**/api/nodes');await page.route('**/api/nodes',r=>{const n=nodes()[0];return r.fulfill({json:{nodes:[{...n,metrics:{...n.metrics,net_tx:value,net_rx:value}}]}})})
 await page.goto('/');const speed=page.locator(width<=720?'.ma-node .ma-net':'.node-card .speed-pair'),amount=speed.locator(width<=720?'b':'.speed-amount').first();await expect(amount).toHaveText(width<=720?'0.0 Kbps':'0')
 const baseline=(await speed.boundingBox())!.height
 for(const next of [999,1024*999,1024**2*999,1024**3*9]){
  value=next;await page.clock.fastForward(5100);await expect(amount).not.toHaveText(width<=720?'0.0 Kbps':'0')
  expect((await speed.boundingBox())!.height).toBe(baseline)
  expect(await speed.evaluate(el=>[...el.querySelectorAll('strong')].every(n=>n.scrollWidth<=n.clientWidth+1))).toBeTruthy()
  if(width>720)expect(await amount.evaluate(el=>getComputedStyle(el).fontSize===getComputedStyle(el.parentElement!).fontSize)).toBeTruthy()
 }
})

test('refresh retains chart on failure, disables duplicate requests and recovers',async({page})=>{
 await page.clock.install() // Isolate explicit retries from the periodic history refresh.
 await setup(page,1);await page.goto('/node/1')
 const chart=page.locator('.resource-chart-panel .recharts-area-curve'),refresh=page.getByRole('button',{name:'刷新历史',exact:true})
 await expect(chart).toBeVisible();const path=await chart.getAttribute('d')
 await page.clock.pauseAt(new Date())
 await page.unroute('**/api/nodes/*/metrics?*')
 let pending:any,calls=0;await page.route('**/api/nodes/*/metrics?*',r=>{pending=r;calls++})
 await refresh.click();await expect(refresh).toBeDisabled();await expect(chart).toHaveAttribute('d',path!)
 await refresh.evaluate((el:HTMLButtonElement)=>{el.click();el.click();el.click()});expect(calls).toBe(1)
 await pending.fulfill({status:503});await expect(page.locator('.history-notice')).toContainText('保留上次历史记录')
 await expect(chart).toHaveAttribute('d',path!);await expect(refresh).toBeEnabled()
 await page.getByRole('button',{name:'重试',exact:true}).click();await expect.poll(()=>calls).toBe(2)
 await pending.fulfill({json:metrics()});await expect(page.locator('.history-notice')).toHaveCount(0);await expect(refresh).toBeEnabled()
})

test('late previous range cannot replace current range',async({page})=>{
 await setup(page,1);await page.goto('/node/1');await expect(page.locator('.detail-resource-charts')).toBeVisible()
 await page.unroute('**/api/nodes/*/metrics?*');const pending:any[]=[]
 await page.route('**/api/nodes/*/metrics?*',r=>{pending.push(r)})
 await page.getByRole('button',{name:'24 小时',exact:true}).click();await expect.poll(()=>pending.length).toBe(1)
 await page.getByRole('button',{name:'1 小时',exact:true}).click();await expect.poll(()=>pending.length).toBe(2)
 await pending[1].fulfill({json:metrics()});await expect(page.locator('.detail-resource-charts')).toBeVisible()
 await pending[0].fulfill({json:{metrics:[],ping:[],probes:{}}}).catch(()=>{})
 await expect(page.locator('.detail-resource-charts')).toBeVisible();await expect(page.getByRole('button',{name:'1 小时',exact:true})).toHaveAttribute('aria-pressed','true')
})

test('initial loading and request timeout stay distinct from empty data',async({page})=>{
 await page.clock.install();await setup(page,1);await page.unroute('**/api/nodes/*/metrics?*')
 await page.route('**/api/nodes/*/metrics?*',()=>{});await page.goto('/node/1')
 await expect(page.getByLabel('正在读取历史数据')).toBeVisible()
 await page.clock.fastForward(16000);await expect(page.locator('.history-notice')).toBeVisible()
 await expect(page.locator('.history-empty')).toContainText('暂无可用历史数据')
 await page.unroute('**/api/nodes/*/metrics?*');await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[],ping:[],probes:{}}}))
 await page.getByRole('region',{name:'历史图表'}).getByRole('button',{name:'重试',exact:true}).click();await expect(page.locator('.history-notice')).toHaveCount(0)
 await expect(page.locator('.detail-history')).toContainText('这段时间没有历史数据')
})

for(const count of [1,6,30,100])test(`mixed ${count} nodes have equal desktop rows and no horizontal overflow`,async({page})=>{
 await setup(page,count);await page.goto('/');await expect(page.locator('.node-card')).toHaveCount(count,{timeout:15000})
 for(const width of [320,390,430,720,721,1024,1440,1920]){
  await page.setViewportSize({width,height:1000})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  if(width>720){const rows=await page.locator('.node-card').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {top:r.top,height:r.height}}))
   for(const row of rows)for(const other of rows.filter(r=>Math.abs(r.top-row.top)<1))expect(Math.abs(other.height-row.height)).toBeLessThan(1)
  }
 }
})
