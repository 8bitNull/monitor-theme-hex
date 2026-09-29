import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

async function detail(page:Page,ping:{task_id:number;ts:number;latency:number}[]){
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes()}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[],ping,probes:{1:'Primary'},loss:{1:0}}}))
 await page.goto('/node/1?lh=1#latency')
 await expect(page.locator('.latency-view .detail-chart-frame')).toBeVisible()
}

test('zoom quick ranges follow returned sample timestamps and keep full-range P95',async({page})=>{
 const last=Math.floor(Date.now()/1000)-3600
 const ping=Array.from({length:13},(_,i)=>({task_id:1,ts:last-(12-i)*300,latency:i===0?1000:10+i}))
 let calls=0
 await detail(page,ping)
 page.on('request',r=>{if(r.url().includes('/metrics?'))calls++})
 const summary=await page.locator('.ma-route-summary').innerText()
 await page.getByRole('button',{name:'统计口径',exact:true}).click()
 await expect(page.getByRole('dialog')).toContainText('95% 的有效采样延迟不高于此值。')
 await page.getByRole('dialog').getByRole('button',{name:'关闭',exact:true}).click()
 await page.getByRole('button',{name:'缩放时间范围',exact:true}).click()
 const start=page.getByRole('slider',{name:'开始时间',exact:true})
 const end=page.getByRole('slider',{name:'结束时间',exact:true})
 await page.getByRole('button',{name:'最近 15 分钟',exact:true}).click()
 await expect(start).toHaveValue('9');await expect(end).toHaveValue('12')
 await expect.poll(()=>page.locator('.ma-route-summary').innerText()).toBe(summary)
 await page.getByRole('button',{name:'最近 30 分钟',exact:true}).click()
 await expect(start).toHaveValue('6');await expect(end).toHaveValue('12')
 await expect.poll(()=>page.locator('.ma-route-summary').innerText()).toBe(summary)
 await expect(page.locator('.ma-chart-zoom')).toContainText(new Date((last-30*60)*1000).toLocaleString('zh-CN'))
 await page.getByRole('button',{name:'恢复全范围',exact:true}).last().click()
 await expect(start).toHaveValue('0');await expect(end).toHaveValue('12')
 expect(calls).toBe(0)
})

test('single-sample history does not offer invalid zoom controls',async({page})=>{
 const now=Math.floor(Date.now()/1000)
 await detail(page,[{task_id:1,ts:now,latency:12}])
 await expect(page.getByRole('button',{name:'缩放时间范围',exact:true})).toHaveCount(0)
 await expect(page.getByRole('slider',{name:'开始时间',exact:true})).toHaveCount(0)
})

test('capacity preference hides only memory and disk totals; offline shows relative and absolute time',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes()}}))
 await page.goto('/')
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'设置',exact:true}).click()
 await expect(page.getByLabel('节点列表',{exact:true}).locator('..')).toContainText('紧凑显示关键状态')
 await page.getByRole('checkbox',{name:'详情页显示资源容量',exact:true}).uncheck()
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'节点',exact:true}).click()
 await page.locator('.ma-node>button').first().click()
 await expect(page.locator('.ma-big-metric').filter({hasText:'CPU'})).toContainText('4 核')
 await expect(page.locator('.ma-big-metric').filter({hasText:'负载'})).toContainText('1 分钟')
 await expect(page.locator('.ma-big-metric').filter({hasText:'内存'})).not.toContainText('GB')
 await page.getByRole('button',{name:'切换节点',exact:true}).click()
 await page.getByRole('dialog',{name:'切换节点'}).getByRole('button',{name:/London/}).click()
 await expect(page.locator('.ma-detail-overview .ma-muted')).toContainText('分钟前')
 await expect(page.locator('.ma-detail-overview .ma-muted time')).toHaveAttribute('datetime',/T/)
})

test('version summary distinguishes missing and invalid builds and links identify their destination',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/me',r=>r.fulfill({json:{authed:true,github:false,site_name:'Test',public_page:true}}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().slice(0,3).map((n,i)=>({...n,agent_version:['1.0.0','','demo'][i]}))}}))
 await page.route('**/api/version',r=>r.fulfill({json:{hub:'demo',hub_latest:'1.2.0',agent_latest:'1.2.0',notice:true}}))
 await page.goto('/')
 await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'设置',exact:true}).click()
 await page.getByRole('button',{name:/版本与更新/}).click()
 const dialog=page.getByRole('dialog')
 await expect(dialog).toContainText('1 个节点可更新')
 await expect(dialog).toContainText('1 个节点尚未上报版本')
 await expect(dialog).toContainText('1 个节点版本无法比较')
 await expect(dialog).toContainText('版本无法比较')
 await expect(dialog.getByRole('link',{name:/Hub.*发布说明/})).toHaveAttribute('href',/monitor\/releases/)
 await expect(dialog.getByRole('link',{name:/Agent.*发布说明/})).toHaveAttribute('href',/agent\/releases/)
})

test('desktop card and detail share adaptive live rates while table stays in Mbps',async({page})=>{
 const high={...nodes()[0],metrics:{...nodes()[0].metrics!,net_rx:125_000_000,net_tx:0}}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[high]}}))
 await page.goto('/')
 await expect(page.locator('.node-card .speed-pair .download')).toContainText('1.00Gbps')
 await page.locator('.node-card>button').first().click()
 await expect(page.locator('.detail-speed .download')).toContainText('1.00Gbps')
 await page.getByRole('button',{name:'返回总览',exact:true}).click()
 await page.getByRole('button',{name:'表格视图',exact:true}).click()
 await expect(page.locator('.table-speed').first()).toContainText('1000Mbps')
})

test('desktop offline card keeps relative and absolute report time',async({page})=>{
 const offline={...nodes()[5],last_seen:Math.floor(Date.now()/1000)-600}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[offline]}}))
 await page.goto('/')
 await expect(page.locator('.node-card .offline-last-report')).toContainText('分钟前')
 await expect(page.locator('.node-card .offline-last-report time')).toHaveAttribute('datetime',/T/)
})
