import {test,expect,type Route} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

test('monitoring order, empty addresses and consolidated traffic follow the mockup',async({page})=>{
 await page.route('**/api/me',r=>r.fulfill({json:{authed:false,site_name:'HEX',public_page:true}}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],ipv4:'',ipv6:''}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/1')
 await expect(page.locator('.resource-summary')).toBeVisible()
 const boxes=await Promise.all(['.detail-live','.detail-history','.detail-account','.detail-information'].map(s=>page.locator(s).boundingBox()))
 for(let i=1;i<boxes.length;i++)expect(boxes[i]!.y).toBeGreaterThanOrEqual(boxes[i-1]!.y+boxes[i-1]!.height)
 expect(boxes[1]!.y).toBeLessThan(600)
 await expect(page.getByRole('region',{name:'网络地址',exact:true})).toHaveCount(0)
 await expect(page.locator('.detail-fact-groups>section')).toHaveCount(2)
 await expect(page.locator('.account-traffic-totals')).toContainText('今日流量')
 await expect(page.locator('.detail-information')).not.toContainText('累计流量')
 await expect(page.getByRole('region',{name:'费用与周期'})).toHaveCount(0)
})

test('exact range cache preserves timestamps and resource previews across network inspection',async({page})=>{
 let hold=false,held:Route|undefined
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{
  const p=new URL(r.request().url()).searchParams
  if(hold&&p.get('series')==='metrics'&&p.get('hours')==='6'){held=r;return}
  const data=metrics();data.metrics=data.metrics.map(m=>({...m,cpu:p.get('hours')==='24'?80:20}))
  return r.fulfill({json:data})
 })
 await page.goto('/node/1?rh=6')
 await expect(page.locator('.resource-summary dd')).toHaveText(['20.0%','20.0%','20.0%'])
 const preview=page.getByRole('button',{name:'查看 CPU 历史趋势',exact:true}),timestamp=await preview.getAttribute('title')
 await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 await expect(page.locator('.desktop-route-summary')).toBeVisible()
 await expect(preview.locator('svg')).toBeVisible()
 expect(await preview.getAttribute('title')).toBe(timestamp)
 await page.getByRole('button',{name:'资源',exact:true}).click()
 await page.getByRole('button',{name:'24 小时',exact:true}).click()
 await expect(page.locator('.resource-summary dd')).toHaveText(['80.0%','80.0%','80.0%'])
 hold=true
 await page.getByRole('button',{name:'6 小时',exact:true}).click()
 await expect.poll(()=>!!held).toBe(true)
 await expect(page.locator('.resource-summary dd')).toHaveText(['20.0%','20.0%','20.0%'])
 await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeDisabled()
 await held!.fulfill({status:503})
 await expect(page.locator('.history-notice')).toContainText('上次成功更新')
 await expect(page.locator('.resource-summary dd')).toHaveText(['20.0%','20.0%','20.0%'])
})

test('mobile status remains visible across all four sections without changing history scope',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/1')
 for(const name of ['资源','网络','资料','总览']){
  await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name,exact:true}).click()
  await expect(page.locator('.ma-detail-status')).toBeVisible()
  await expect(page.locator('.ma-detail-status')).toContainText('上次上报')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await expect(page.locator('.resource-trend svg')).toHaveCount(3)
 await expect(page.locator('.ma-overview-network')).toBeVisible()
})

test('revisiting cached network ranges resets the viewport but refreshing preserves it',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 const snapshot=metrics()
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:snapshot}))
 await page.goto('/node/1?lh=1#latency')
 await expect(page.locator('.latency-view .recharts-line-curve')).toBeVisible()
 await page.getByRole('button',{name:'6 小时',exact:true}).click()
 await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeEnabled()
 await page.getByText('调整视野',{exact:true}).click()
 const slider=page.getByRole('slider',{name:'开始时间',exact:true})
 await slider.focus();await slider.press('Home')
 for(let i=0;i<10;i++)await slider.press('ArrowRight')
 await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeEnabled()
 await expect(slider).toHaveValue('10')
 await page.getByRole('button',{name:'1 小时',exact:true}).click()
 await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeEnabled()
 await page.getByText('调整视野',{exact:true}).click()
 await expect(slider).toHaveValue('0')
})
