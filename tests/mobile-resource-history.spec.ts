import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

for(const width of [320,390])test(`mobile metric tabs share history and preserve query on refresh failure at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 const requested:string[]=[]
 await page.route('**/api/nodes/*/metrics?*',r=>{
  const hours=new URL(r.request().url()).searchParams.get('hours')!;requested.push(hours)
  return r.fulfill({json:{metrics:[0,1].map(i=>({ts:Math.floor(Date.now()/1000)-60+i*30,cpu:hours==='24'?50+i*10:10+i*10,mem_used:1024+i*1024,disk_used:2048+i*1024,net_rx:400,net_tx:200})),ping:[],probes:{},loss:{}}})
 })
 await page.goto('/node/1?section=resources&metric=cpu&rh=6')
 const summary=page.locator('.resource-summary')
 await expect(page.locator('.detail-resource-charts')).toHaveCount(1)
 await expect(summary.locator('dd')).toHaveText(['20.0%','15.0%','20.0%'])
 await expect(page.getByRole('group',{name:'当前查看范围'})).toHaveCount(1)
 await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toHaveCount(1)
 await page.getByRole('button',{name:'24 小时',exact:true}).click()
 await expect(summary.locator('dd')).toHaveText(['60.0%','55.0%','60.0%'])
 expect(requested).toEqual(['6','24'])
 await page.getByRole('button',{name:'网速',exact:true}).click()
 await expect(summary.locator('tbody tr')).toHaveCount(2)
 expect(requested).toEqual(['6','24'])
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}))
 await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(page.locator('.history-notice')).toContainText('保留上次历史记录')
 await page.getByRole('button',{name:'CPU',exact:true}).click()
 await expect(summary.locator('dd')).toHaveText(['60.0%','55.0%','60.0%'])
 await expect(page).toHaveURL(/metric=cpu/)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

for(const state of ['offline','stale','missing'])test(`historical readings remain explicitly historical for ${state}`,async({page})=>{
 await page.setViewportSize({width:390,height:844})
 const node={...nodes()[0],online:state!=='offline',last_seen:state==='stale'?1:Math.floor(Date.now()/1000),metrics:state==='missing'?null:nodes()[0].metrics}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[node]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[{ts:Math.floor(Date.now()/1000)-60,cpu:40,mem_used:1024,disk_used:2048}],ping:[],probes:{},loss:{}}}))
 await page.goto('/node/1?section=resources')
 await expect(page.locator('.resource-summary dt')).toHaveText(['最近采样','区间平均','区间峰值'])
 await expect(page.locator('.resource-summary dd')).toHaveText(['40.0%','40.0%','40.0%'])
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'总览',exact:true}).click()
 await expect(page.locator('.ma-unavailable')).toBeVisible()
 await expect(page.locator('.ma-resource-overview-card')).toHaveCount(0)
})

test('unknown capacity keeps history in bytes and does not invent live utilization',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 const node=nodes()[0];node.mem_total=0;node.disk_total=0;node.metrics.mem_total=0;node.metrics.disk_total=0
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[node]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[{ts:Math.floor(Date.now()/1000),cpu:20,mem_used:1024,disk_used:2048}],ping:[],probes:{},loss:{}}}))
 await page.goto('/node/1')
 await expect(page.locator('[data-kind=mem_used] strong')).toHaveText('—')
 await expect(page.locator('[data-kind=disk_used] strong')).toHaveText('—')
 await page.getByRole('button',{name:'查看内存历史趋势',exact:true}).click()
 await expect(page.locator('.resource-summary dd')).toHaveText(['1.00 KB','1.00 KB','1.00 KB'])
})

test('empty history keeps metric selection and explicit recovery action',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[],ping:[],probes:{},loss:{}}}))
 await page.goto('/node/1?section=resources')
 await expect(page.getByRole('group',{name:'资源指标'}).first()).toBeVisible()
 await expect(page.locator('.detail-history .history-empty')).toHaveCount(1)
 await expect(page.locator('.resource-summary')).toHaveCount(0)
 await page.getByRole('button',{name:'调整时间范围',exact:true}).click()
 await expect(page.getByRole('button',{name:'1 小时',exact:true})).toBeFocused()
})
