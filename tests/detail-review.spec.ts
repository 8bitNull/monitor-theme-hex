import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function setup(page:Page){
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
}

test('desktop history choices stay consistent when returning to the phone layout',async({page})=>{
 await setup(page)
 await page.setViewportSize({width:390,height:844})
 await page.goto('/node/1?section=resources')
 await expect(page.locator('.resource-summary')).toBeVisible()
 await page.setViewportSize({width:1440,height:1000})
 await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 await expect(page.locator('.latency-view')).toBeVisible()
 await page.setViewportSize({width:390,height:844})
 const tabs=page.getByRole('navigation',{name:'详情分区'})
 await expect(tabs.getByRole('button',{name:'网络',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(page.locator('.ma-chart-heading')).toContainText('网络质量')
 await page.setViewportSize({width:1440,height:1000})
 await page.getByRole('button',{name:'查看内存历史趋势',exact:true}).click()
 await expect(page).toHaveURL(/section=resources/)
 await page.reload()
 await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','mem_used')
 await page.setViewportSize({width:390,height:844})
 await expect(tabs.getByRole('button',{name:'资源',exact:true})).toHaveAttribute('aria-pressed','true')
 await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','mem_used')
 await expect(page.locator('.ma-network-summary')).toHaveCount(0)
})

test('a network section link without a fragment loads only network history',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await setup(page)
 const series:string[]=[]
 await page.route('**/api/nodes/*/metrics?*',r=>{series.push(new URL(r.request().url()).searchParams.get('series')!);return r.fulfill({json:metrics()})})
 await page.goto('/node/1?section=latency&lh=24')
 await expect(page.locator('.ma-network-summary')).toBeVisible()
 await expect(page.getByRole('button',{name:'24 小时',exact:true})).toHaveAttribute('aria-pressed','true')
 expect(series).toEqual(['ping'])
 await page.reload()
 await expect(page.locator('.ma-network-summary')).toBeVisible()
})

test('unknown memory capacity uses observed history to label and scale the plot',async({page})=>{
 await setup(page)
 const base=nodes()[0],node={...base,mem_total:0,disk_total:0,metrics:{...base.metrics,mem_total:0,disk_total:0}}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[node]}}))
 const ts=Math.floor(Date.now()/1000)
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[{ts:ts-60,mem_used:1024},{ts,mem_used:4096}],ping:[],probes:{}}}))
 await page.goto('/node/1?metric=mem_used')
 await expect(page.locator('.resource-summary dd')).toHaveText(['4.00 KB','2.50 KB','4.00 KB'])
 await expect(page.locator('.detail-metric-card[data-metric=mem_used] .detail-metric-value')).toHaveText('—')
 await expect(page.locator('.detail-metric-card[data-metric=disk_used] .detail-metric-value')).toHaveText('—')
 await expect(page.locator('.resource-chart-unit')).toHaveText('4.00 KB')
 await expect(page.locator('.resource-chart-panel .recharts-surface')).toContainText('4 KB')
})

test('CPU history drops invalid samples consistently with its summary',async({page})=>{
 await setup(page)
 const ts=Math.floor(Date.now()/1000)
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[{ts:ts-180,cpu:10},{ts:ts-120,cpu:200},{ts:ts-60,cpu:20},{ts,cpu:30}],ping:[],probes:{}}}))
 await page.goto('/node/1')
 await expect(page.locator('.resource-summary dd')).toHaveText(['30.0%','20.0%','30.0%'])
 await expect(page.locator('.resource-chart-panel .recharts-surface')).not.toContainText('100%')
 const path=page.locator('.resource-chart-panel .recharts-area-curve')
 await expect(path).toHaveAttribute('d',/M.*M/)
})
