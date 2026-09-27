import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

type Ping = {task_id:number;ts:number;latency:number}

async function openLatency(page:Page,ping:Ping[]){
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes()}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[],ping,probes:{1:'Primary'},loss:{1:0}}}))
 await page.goto('/node/1?lh=1#latency')
}

test('empty latency history shows its empty state without zoom controls',async({page})=>{
 await openLatency(page,[])
 await expect(page.locator('.detail-history-body')).toContainText('没有选中任何探测')
 await expect(page.getByRole('button',{name:'缩放时间范围',exact:true})).toHaveCount(0)
 await expect(page.getByRole('slider',{name:'开始时间',exact:true})).toHaveCount(0)
 await expect(page.getByRole('slider',{name:'结束时间',exact:true})).toHaveCount(0)
})

test('two samples twenty minutes apart disable 15 minutes but allow 30 minutes',async({page})=>{
 const last=Math.floor(Date.now()/1000)-3600
 await openLatency(page,[
  {task_id:1,ts:last-20*60,latency:12},
  {task_id:1,ts:last,latency:14},
 ])
 await expect(page.locator('.latency-view .detail-chart-frame')).toBeVisible()
 await page.getByRole('button',{name:'缩放时间范围',exact:true}).click()
 await expect(page.getByRole('button',{name:'最近 15 分钟',exact:true})).toBeDisabled()
 await expect(page.getByRole('button',{name:'最近 30 分钟',exact:true})).toBeEnabled()
 await page.getByRole('button',{name:'最近 30 分钟',exact:true}).click()
 await expect(page.getByRole('slider',{name:'开始时间',exact:true})).toHaveValue('0')
 await expect(page.getByRole('slider',{name:'结束时间',exact:true})).toHaveValue('1')
 await expect(page.getByRole('button',{name:'恢复全范围',exact:true})).toHaveCount(0)
})

test('sparse 30-minute preset selects returned samples and reset restores the full range',async({page})=>{
 const last=Math.floor(Date.now()/1000)-3600
 await openLatency(page,[
  {task_id:1,ts:last-40*60,latency:1000},
  {task_id:1,ts:last-20*60,latency:12},
  {task_id:1,ts:last,latency:14},
 ])
 await expect(page.locator('.latency-view .detail-chart-frame')).toBeVisible()
 const summary=await page.locator('.ma-route-statistics').innerText()
 await page.getByRole('button',{name:'缩放时间范围',exact:true}).click()
 const start=page.getByRole('slider',{name:'开始时间',exact:true})
 const end=page.getByRole('slider',{name:'结束时间',exact:true})
 await expect(page.getByRole('button',{name:'最近 15 分钟',exact:true})).toBeDisabled()
 await page.getByRole('button',{name:'最近 30 分钟',exact:true}).click()
 await expect(start).toHaveValue('1')
 await expect(end).toHaveValue('2')
 await expect(page.locator('.ma-chart-zoom')).toContainText(new Date((last-20*60)*1000).toLocaleString('zh-CN'))
 await expect.poll(()=>page.locator('.ma-route-statistics').innerText()).toBe(summary)
 await page.getByRole('button',{name:'恢复全范围',exact:true}).last().click()
 await expect(start).toHaveValue('0')
 await expect(end).toHaveValue('2')
 await expect.poll(()=>page.locator('.ma-route-statistics').innerText()).toBe(summary)
})
