import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

test('mobile resource summary follows returned range and retains matching history on refresh failure',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{
  const now=Math.floor(Date.now()/1000)
  const hours=new URL(r.request().url()).searchParams.get('hours')
  const values=hours==='24'?[50,100,null]:[0,40,null]
  return r.fulfill({json:{metrics:values.map((cpu,i)=>({ts:now-(2-i)*60,cpu,mem_used:1024,disk_used:2048,net_rx:400,net_tx:200})),ping:[],probes:{},loss:{}}})
 })
 await page.goto('/node/1?section=resources&metric=cpu&rh=6')
 const summary=page.getByRole('region',{name:'历史采样摘要'})
 await expect(summary.locator('dd, tbody td')).toHaveText(['—','20.0%','40.0%'])
 await expect(summary).toContainText('有效样本：2')
 await page.getByRole('button',{name:'24 小时',exact:true}).click()
 await expect(summary.locator('dd, tbody td')).toHaveText(['—','75.0%','100.0%'])
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({status:503}))
 await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(page.locator('.history-notice')).toContainText('保留上次历史记录')
 await expect(summary.locator('dd, tbody td')).toHaveText(['—','75.0%','100.0%'])
 await page.setViewportSize({width:721,height:1000})
 await expect(summary).toHaveCount(0)
 await page.setViewportSize({width:1440,height:1000})
 await expect(summary).toHaveCount(0)
})

test('resource metrics and range matrix uses returned samples',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{
  const now=Math.floor(Date.now()/1000)
  const rows=[0,1,2].map(i=>({ts:now-(2-i)*60,cpu:[0,40,null][i],mem_used:[0,1024,2048][i],disk_used:[512,1024,2048][i],net_tx:[125000,250000,500000][i],net_rx:[0,125000,250000][i]}))
  return r.fulfill({json:{metrics:rows,ping:[],probes:{},loss:{}}})
 })
 for(const hours of [1,6,24,168])for(const [metric,expected] of [
  ['cpu',['—','20.0%','40.0%']],
  ['mem_used',['2.00 KB','1.00 KB','2.00 KB']],
  ['disk_used',['2.00 KB','1.17 KB','2.00 KB']],
  ['network',['4.00 Mbps','2.33 Mbps','4.00 Mbps','2.00 Mbps','1.00 Mbps','2.00 Mbps']],
 ] as const){
  await page.goto(`/node/1?section=resources&metric=${metric}&rh=${hours}`)
  const summary=page.getByRole('region',{name:'历史采样摘要'})
  await expect(summary.locator('dd, tbody td')).toHaveText(expected)
  await expect(summary).not.toContainText('查询范围：')
 }
})

test('320px dark English network summary fits and empty history keeps its existing state',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await page.emulateMedia({colorScheme:'dark'})
 await page.addInitScript(()=>{
  localStorage.setItem('monitor-next-language','en')
  localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance:'dark'}))
 })
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 let empty=false
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:empty?[]:[0,1,2].map(i=>({ts:Math.floor(Date.now()/1000)-(2-i)*60,cpu:20,mem_used:1024,disk_used:2048,net_tx:[125000,250000,500000][i],net_rx:[0,125000,250000][i]})),ping:[],probes:{},loss:{}}}))
 await page.goto('/node/1?section=resources&metric=network&rh=6')
 const summary=page.getByRole('region',{name:'Historical sample summary'})
 await expect(summary.locator('dd, tbody td')).toHaveCount(6)
 for(const row of await summary.getByRole('rowheader').all()){
  expect(await row.evaluate(el=>{const range=document.createRange();range.selectNodeContents(el);return range.getClientRects().length})).toBe(1)
 }
 await expect(summary.locator('dd, tbody td')).toHaveText(['4.00 Mbps','2.33 Mbps','4.00 Mbps','2.00 Mbps','1.00 Mbps','2.00 Mbps'])
 expect(await summary.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const summaryTextBox=await summary.boundingBox(),controlsBox=await page.locator('.resource-chart-controls').boundingBox()
 expect(summaryTextBox&&controlsBox&&controlsBox.y>=summaryTextBox.y+summaryTextBox.height).toBe(true)
 await page.screenshot({path:'artifacts/mobile-copy-reduction/network-320-dark-en.png',fullPage:true})
 const frame=page.locator('.resource-chart-panel .detail-chart-frame')
 await frame.scrollIntoViewIfNeeded()
 await frame.click({position:{x:180,y:120}})
 await expect(frame.locator('.recharts-tooltip-wrapper')).toBeVisible()
 empty=true
 await page.reload()
 await expect(summary).toHaveCount(0)
 await expect(page.locator('.detail-history-body')).toContainText('No history in this range')
})

 test('summary keeps sample details behind a keyboard-operable disclosure',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{metrics:[{ts:Math.floor(Date.now()/1000),cpu:0,net_tx:0,net_rx:400}],ping:[],probes:{},loss:{}}}))
 await page.goto('/node/1?section=resources&metric=network&rh=6')
 const summary=page.getByRole('region',{name:'历史采样摘要'})
 await expect(summary.getByRole('columnheader',{name:'最新采样',exact:true})).toHaveCount(1)
 await expect(summary.getByRole('rowheader')).toHaveText(['上行','下行'])
 const note=summary.getByText('基于返回样本，非连续时间加权统计。',{exact:true})
 await expect(note).toBeHidden()
 const toggle=summary.locator('summary')
 expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44)
 await toggle.focus();await page.keyboard.press('Enter')
 await expect(note).toBeVisible()
 await expect(summary.getByText('有效样本：1',{exact:false})).toHaveCount(2)
 await page.keyboard.press('Enter');await expect(note).toBeHidden()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('settings exceptions are available on demand without toggling preferences',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await page.goto('/?page=settings')
 const select=page.getByLabel('新详情页默认历史范围',{exact:true})
 await expect(select).toHaveValue('6')
 const exception=page.getByText('仅保存在此浏览器；已有页面及链接指定范围保持不变。',{exact:true})
 await expect(exception).toBeHidden()
 const toggle=page.locator('.ma-preference-help summary')
 await toggle.focus();await page.keyboard.press('Enter')
 await expect(exception).toBeVisible();await expect(select).toHaveValue('6')
 await page.keyboard.press('Enter');await expect(exception).toBeHidden()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
