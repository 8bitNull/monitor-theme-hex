import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

// Two outliers make nearest-rank raw P95 = 1000 ms, even when Hampel
// despiking replaces the outliers in the displayed curve. Bucket loss is
// intentionally different from the server's whole-window aggregate.
function chartFixture(){
 const now=Math.floor(Date.now()/1000)
 return {metrics:[],probes:{'1':'Primary route','2':'Legacy route','3':'Backup route'},loss:{'1':0,'3':7.5},
  ping:[1,2,3].flatMap(task_id=>Array.from({length:20},(_,i)=>({task_id,ts:now-(19-i)*60,
   latency:task_id===1?(i===8||i===15?1000:10+i%3):task_id===2&&i===0?null:task_id*20,
   ...(task_id===2?{}:{loss:i===0?100:0})}))) }
}
async function setup(page:Page,mobile=true){
 await page.setViewportSize({width:mobile?390:1440,height:mobile?844:1000})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes()}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:chartFixture()}))
 await page.goto('/node/1?lh=1&routes=all#latency')
 await expect(page.locator('.latency-view')).toBeVisible()
 await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeEnabled()
 await expect(page.locator('.latency-view .recharts-line-curve').first()).toHaveAttribute('d',/^M/)
}
const routeRow=(page:Page,name:string)=>page.locator('.ma-route-statistics tbody tr').filter({hasText:name})
const curve=(page:Page)=>page.locator('.latency-view .recharts-line-curve').first()

test('mobile route summaries use raw P95 and explicit whole-window loss',async({page})=>{
 await setup(page)
 await expect(routeRow(page,'Primary route').locator('td')).toHaveText(['11.0 ms','1000.0 ms','0.0%'])
 await expect(routeRow(page,'Legacy route').locator('td')).toHaveText(['40.0 ms','40.0 ms','未统计'])
 await expect(routeRow(page,'Backup route').locator('td')).toHaveText(['60.0 ms','60.0 ms','7.5%'])
 await page.getByRole('button',{name:'统计口径',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveClass(/ma-sheet-fixed/)
 await expect(page.getByRole('dialog')).toContainText('不平均各采样桶的百分比')
 await page.keyboard.press('Escape')
 await expect(page.getByRole('button',{name:'统计口径',exact:true})).toBeFocused()
 await expect(page.locator('.ma-detail-header')).toContainText('日本')
 const header=(await page.locator('.ma-detail-header').boundingBox())!,tabs=(await page.locator('.ma-detail-tabs').boundingBox())!
 expect(Math.abs(header.y+header.height-tabs.y)).toBeLessThanOrEqual(1)
 expect((await page.locator('.ma-chart-heading').boundingBox())!.y).toBeGreaterThanOrEqual(tabs.y+tabs.height)
 expect((await page.getByRole('button',{name:'切换节点',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('smoothing changes the curve but preserves raw summary and shared-sheet focus',async({page})=>{
 await setup(page)
 const summary=await page.locator('.ma-route-statistics').innerText(),rawPath=await curve(page).getAttribute('d')
 await page.getByRole('button',{name:'图表设置',exact:true}).click()
 await expect(page.getByRole('dialog')).toHaveClass(/ma-sheet-fixed/)
 await page.getByRole('dialog').getByRole('checkbox',{name:'抑制尖峰',exact:true}).check()
 await page.keyboard.press('Escape')
 await expect(page.getByRole('button',{name:'图表设置',exact:true})).toBeFocused()
 await expect.poll(()=>curve(page).getAttribute('d')).not.toBe(rawPath)
 await expect.poll(()=>page.locator('.ma-route-statistics').innerText()).toBe(summary)
 await expect(page.locator('.latency-chart-key')).toContainText('抑制尖峰')
})

test('mobile zoom slices samples, persistent controls preserve the domain, reset restores it',async({page})=>{
 await setup(page)
 await expect(page.locator('#ma-chart-zoom')).toBeVisible()
 await expect(page.locator('.latency-view .recharts-brush')).toHaveCount(0)
 const initialPath=await curve(page).getAttribute('d'),initialCaption=await page.locator('.latency-range-caption').innerText(),summary=await page.locator('.ma-route-statistics').innerText()
 await expect(page.locator('#ma-chart-zoom')).toBeVisible()
 const start=page.getByRole('slider',{name:'开始时间',exact:true})
 await start.focus();await start.press('Home')
 for(let i=0;i<10;i++)await start.press('ArrowRight')
 await expect(start).toHaveValue('10')
 await expect.poll(()=>curve(page).getAttribute('d')).not.toBe(initialPath)
 await expect.poll(()=>page.locator('.latency-range-caption').innerText()).not.toBe(initialCaption)
 const zoomPath=await curve(page).getAttribute('d'),zoomCaption=await page.locator('.latency-range-caption').innerText()
 await expect.poll(()=>page.locator('.ma-route-statistics').innerText()).toBe(summary)
 await expect(page.getByRole('button',{name:'收起缩放',exact:true})).toHaveCount(0)
 await expect(page.locator('#ma-chart-zoom')).toBeVisible()
 await expect(curve(page)).toHaveAttribute('d',zoomPath!)
 await expect.poll(()=>page.locator('.latency-range-caption').innerText()).toBe(zoomCaption)
 await page.getByRole('button',{name:'恢复全范围',exact:true}).click()
 await expect(curve(page)).toHaveAttribute('d',initialPath!)
 await expect.poll(()=>page.locator('.latency-range-caption').innerText()).toBe(initialCaption)
 await expect.poll(()=>page.locator('.ma-route-statistics').innerText()).toBe(summary)
 await expect(page).toHaveURL(/routes=all/)
})

test('desktop retains its original inline smoothing and Brush controls',async({page})=>{
 await setup(page,false)
 await expect(page.locator('.ma-route-statistics')).toHaveCount(0)
 await expect(page.locator('.ma-history-tools')).toHaveCount(0)
 await expect(page.locator('.detail-chart-toolbar .detail-smooth')).toBeVisible()
 await expect(page.locator('.latency-view .recharts-brush')).toBeVisible()
 await expect(page.locator('.detail-chart-toolbar .detail-tabs')).toBeVisible()
 await expect(page.locator('.detail-live')).toBeVisible()
 await expect(page.locator('.detail-information')).toBeVisible()
})
