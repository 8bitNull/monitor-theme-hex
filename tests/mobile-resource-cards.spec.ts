import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

for(const width of [320,390])test(`mobile resource cards share range and preserve network history at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 const requested:string[]=[]
 await page.route('**/api/nodes/*/metrics?*',r=>{
  const hours=new URL(r.request().url()).searchParams.get('hours')!;requested.push(hours)
  return r.fulfill({json:{metrics:[0,1].map(i=>({ts:Math.floor(Date.now()/1000)-60+i*30,cpu:hours==='24'?50+i*10:10+i*10,mem_used:1024+i*1024,disk_used:2048+i*1024,net_rx:400,net_tx:200})),ping:[],probes:{},loss:{}}})
 })
 await page.goto('/node/1?section=resources&metric=cpu&rh=6')
 const cards=page.locator('.ma-resource-card')
 await expect(cards).toHaveCount(3)
 await expect(cards.locator('h2')).toHaveText(['CPU','内存','硬盘'])
 await expect(page.getByRole('group',{name:'当前查看范围'})).toHaveCount(1)
 await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toHaveCount(1)
 await expect(cards.first()).toContainText('15.0%')
 await page.getByRole('button',{name:'24 小时',exact:true}).click()
 await expect(cards.first()).toContainText('55.0%')
 expect(requested).toEqual(['6','24'])
 await page.getByRole('button',{name:'网速历史',exact:true}).click()
 await expect(page.locator('.ma-resource-network .resource-summary')).toBeVisible()
 expect(requested).toEqual(['6','24'])
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}))
 await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(page.locator('.history-notice')).toContainText('保留上次历史记录')
 await expect(cards.first()).toContainText('55.0%')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

for(const state of ['offline','stale','missing'])test(`resource cards keep historical samples without inventing live values for ${state}`,async({page})=>{
 await page.setViewportSize({width:390,height:844})
 const node={...nodes()[0],online:state!=='offline',last_seen:state==='stale'?1:Math.floor(Date.now()/1000),metrics:state==='missing'?null:nodes()[0].metrics}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[node]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[{ts:Math.floor(Date.now()/1000)-60,cpu:40,mem_used:1024,disk_used:2048}],ping:[],probes:{},loss:{}}}))
 await page.goto('/node/1?section=resources')
 await expect(page.locator('.ma-resource-card-value>strong')).toHaveText(['—','—','—'])
 await expect(page.locator('.ma-resource-card').first()).toContainText('40.0%')
})

test('unknown capacity does not become zero utilization',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 const node=nodes()[0];node.mem_total=0;node.disk_total=0;node.metrics.mem_total=0;node.metrics.disk_total=0
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[node]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[{ts:Math.floor(Date.now()/1000),cpu:20,mem_used:1024,disk_used:2048}],ping:[],probes:{},loss:{}}}))
 await page.goto('/node/1?section=resources')
 await expect(page.locator('[data-resource-card=mem_used] .ma-resource-card-value>strong')).toHaveText('—')
 await expect(page.locator('[data-resource-card=disk_used] .ma-resource-card-value>strong')).toHaveText('—')
})

test('empty history keeps live resource cards and explicit empty chart states',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[],ping:[],probes:{},loss:{}}}))
 await page.goto('/node/1?section=resources')
 await expect(page.locator('.ma-resource-card')).toHaveCount(3)
 await expect(page.locator('[data-resource-card=cpu] .ma-resource-card-value>strong')).toContainText('28.0')
 await expect(page.locator('.ma-resource-card .history-empty')).toHaveCount(3)
 await expect(page.locator('.ma-resource-card .resource-summary')).toHaveCount(0)
})
