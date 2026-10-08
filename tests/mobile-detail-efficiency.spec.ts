import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function setup(page:Page){
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().slice(0,3).map(n=>({...n,traffic_limit:0,expires_at:null}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
}

test('overview resource actions preserve independent resource and network ranges',async({page})=>{
 await setup(page);await page.goto('/node/1?rh=24&lh=1')
 await expect(page.getByRole('button',{name:'查看 CPU 历史趋势',exact:true})).toHaveAccessibleDescription(/28\.0.*%.*4 核/)
 await expect(page.getByRole('button',{name:'查看上行网速历史',exact:true})).toHaveAccessibleDescription(/Kbps/)
 for(const [kind,metric]of [['cpu','cpu'],['mem_used','mem_used'],['disk_used','disk_used'],['upload','network'],['download','network']]){
  await page.locator(`button.ma-big-metric[data-kind=${kind}]`).click()
  await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric',metric)
  await expect(page).toHaveURL(new RegExp(`rh=24.*lh=1.*metric=${metric}`))
  await expect(page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'资源',exact:true})).toHaveAttribute('aria-pressed','true')
  await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'总览',exact:true}).click()
 }
 await expect(page.locator('button[data-kind=load]')).toHaveCount(0)
 await page.getByRole('button',{name:'网络质量',exact:true}).click()
 await expect(page.getByRole('button',{name:'1 小时',exact:true})).toHaveAttribute('aria-pressed','true')
})

test('single route summary keeps raw statistics and compares via persistent route controls',async({page})=>{
 await setup(page)
 await page.route('**/api/nodes/*/metrics?*',r=>{const now=Math.floor(Date.now()/1000);return r.fulfill({json:{metrics:[],probes:{'1':'Primary','2':'Backup'},loss:{'1':0},ping:[1,2].flatMap(task_id=>Array.from({length:20},(_,i)=>({task_id,ts:now-(19-i)*60,latency:task_id===1?(i===19?null:i===18?1000:10):40})))}})})
 await page.goto('/node/1?routes=1#latency')
 const summary=page.locator('.ma-route-summary')
 await expect(summary.locator('dd')).toHaveText(['超时','1000.0 ms','0.0%'])
 await expect(page.locator('.ma-route-statistics')).toHaveCount(0)
 await page.getByRole('button',{name:'统计口径',exact:true}).click()
 await expect(page.getByRole('dialog')).toContainText('不平均各采样桶的百分比')
 await page.keyboard.press('Escape')
 await page.getByRole('group',{name:'线路图例'}).getByRole('button',{name:'Backup',exact:true}).click()
 await expect(page.locator('.ma-route-statistics tbody tr')).toHaveCount(2)
 await expect(page.locator('.ma-route-statistics tbody tr').filter({hasText:'Backup'})).toContainText('未统计')
 await expect(page.locator('.ma-route-statistics tbody tr')).toHaveCount(2)
 await page.getByRole('group',{name:'线路图例'}).getByRole('button',{name:'Primary',exact:true}).click()
 await expect(summary.locator('dd')).toHaveText(['40.0 ms','40.0 ms','未统计'])
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}))
 await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(page.locator('.history-notice')).toContainText('保留上次历史记录')
 await expect(summary.locator('dd')).toHaveText(['40.0 ms','40.0 ms','未统计'])
})

test('healthy overview condenses empty states and keeps the record entry',async({page})=>{
 await setup(page);await page.goto('/?page=overview')
 await expect(page.locator('.ma-health-summary')).toContainText('暂无到期或流量提醒')
 await expect(page.getByRole('heading',{name:'需要关注',exact:true})).toHaveCount(0)
 await expect(page.getByRole('heading',{name:'到期与用量',exact:true})).toHaveCount(0)
 await expect(page.locator('.load-alert-tile')).toHaveCount(0)
 await page.getByRole('button',{name:/本机负载记录/}).click()
 await expect(page.getByRole('dialog')).toContainText('暂无高负载记录')
})

test('stale nodes and billing warnings remain visible instead of a healthy summary',async({page})=>{
 await setup(page)
 await page.route('**/api/nodes',r=>{const data=nodes().slice(0,2);data[0].last_seen-=3600;data[1].expires_at=new Date().toISOString().slice(0,10);return r.fulfill({json:{nodes:data}})})
 await page.goto('/?page=overview')
 await expect(page.getByRole('heading',{name:'需要关注',exact:true})).toBeVisible()
 await expect(page.locator('.ma-rows').filter({hasText:'Tokyo'})).toContainText('数据已过期')
 await expect(page.getByRole('heading',{name:'到期与用量',exact:true})).toBeVisible()
 await expect(page.locator('.ma-health-summary')).toHaveCount(0)
})

for(const state of ['empty','missing'] as const)test(`${state} overview never claims healthy live data`,async({page})=>{
 await setup(page)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:state==='empty'?[]:[{...nodes()[0],metrics:null}]}}))
 await page.goto('/?page=overview')
 await expect(page.locator('.ma-hero')).toBeVisible()
 await expect(page.locator('.ma-health-summary')).toHaveCount(0)
 if(state==='empty')await expect(page.locator('.ma-hero')).toContainText('还没有节点')
 else await expect(page.locator('.ma-rows').first()).toContainText('等待数据')
})
