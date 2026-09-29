import {test,expect,type Page,type Route} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function setup(page:Page,handler?:(route:Route)=>Promise<void>){
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',handler??(r=>r.fulfill({json:metrics()})))
}
test('desktop trends reuse history and select the main chart without another request',async({page})=>{
 let requests=0
 await setup(page,r=>{if(new URL(r.request().url()).searchParams.get('series')==='metrics')requests++;return r.fulfill({json:metrics()})})
 await page.goto('/node/1')
 const cpu=page.getByRole('button',{name:'查看 CPU 历史趋势',exact:true}),memory=page.getByRole('button',{name:'查看内存历史趋势',exact:true}),disk=page.getByRole('button',{name:'查看硬盘历史趋势',exact:true})
 await expect(cpu.locator('path')).toHaveAttribute('d',/L/)
 await expect(memory.locator('path')).toHaveAttribute('d',/L/)
 await expect(disk.locator('path')).toHaveAttribute('d',/L/)
 await expect(cpu).toContainText('6h');await expect(memory).toContainText('历史用量')
 expect(requests).toBe(1)
 const track=(await page.locator('.detail-metric-card[data-metric="cpu"] .detail-metric-track').boundingBox())!
 expect((await cpu.boundingBox())!.y).toBeGreaterThanOrEqual(track.y+track.height)
 await memory.click();await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','mem_used')
 await expect(page.getByRole('region',{name:'历史图表'})).toBeFocused()
 await cpu.focus();await cpu.press('Enter');await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','cpu')
 await disk.focus();await disk.press('Enter');await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','disk_used')
 expect(requests).toBe(1)
})
test('range changes clear old curves and failed refresh labels retained history',async({page})=>{
 let held:Route|undefined,fail=false
 await setup(page,async r=>{
  if(fail){await r.fulfill({status:503});return}
  if(new URL(r.request().url()).searchParams.get('hours')==='24'){held=r;return}
  await r.fulfill({json:metrics()})
 })
 await page.goto('/node/1')
 const cpu=page.getByRole('button',{name:'查看 CPU 历史趋势',exact:true})
 await expect(cpu.locator('path')).toHaveAttribute('d',/L/)
 await page.locator('.detail-ranges button').filter({hasText:'24h'}).click()
 await expect(cpu.locator('path')).toHaveCount(0);await expect(cpu).toContainText('读取中')
 await expect.poll(()=>!!held).toBe(true)
 await held!.fulfill({json:metrics()})
 await expect(cpu.locator('path')).toHaveAttribute('d',/L/);await expect(cpu).toContainText('24h')
 fail=true;await page.getByRole('button',{name:'刷新历史',exact:true}).click()
 await expect(cpu).toContainText('旧数据');await expect(cpu).toHaveAccessibleDescription(/旧数据/);await expect(cpu.locator('path')).toHaveAttribute('d',/L/)
})
test('empty history stays empty and latency entry does not prefetch resources',async({page})=>{
 let resourceRequests=0
 await setup(page,r=>{const resource=new URL(r.request().url()).searchParams.get('series')==='metrics';if(resource)resourceRequests++;return r.fulfill({json:resource?{...metrics(),metrics:[]}:metrics()})})
 await page.goto('/node/1#latency')
 await expect(page.locator('.latency-view')).toBeVisible()
 const cpu=page.getByRole('button',{name:'查看 CPU 历史趋势',exact:true})
 await expect(cpu.locator('path')).toHaveCount(0);expect(resourceRequests).toBe(0)
 await cpu.click();await expect(cpu).toContainText('暂无历史');await expect(cpu.locator('path')).toHaveCount(0);expect(resourceRequests).toBe(1)
})
test('mobile overview has no resource preview or hidden history fetch',async({page})=>{
 await page.setViewportSize({width:390,height:844});let resourceRequests=0
 await setup(page,r=>{if(new URL(r.request().url()).searchParams.get('series')==='metrics')resourceRequests++;return r.fulfill({json:metrics()})})
 await page.goto('/node/1');await expect(page.locator('.ma-detail-header')).toBeVisible()
 await expect(page.locator('.resource-trend')).toHaveCount(0);expect(resourceRequests).toBe(0)
})
test('initial history failure is not an empty series and retry restores previews',async({page})=>{
 let fail=true
 await setup(page,r=>r.fulfill(fail?{status:503}:{json:metrics()}))
 await page.goto('/node/1')
 const cpu=page.getByRole('button',{name:'查看 CPU 历史趋势',exact:true})
 await expect(cpu).toContainText('读取失败');await expect(cpu.locator('path')).toHaveCount(0)
 await expect(cpu).toHaveAccessibleDescription(/读取失败/)
 fail=false;await page.getByRole('button',{name:'重试',exact:true}).click()
 await expect(cpu.locator('path')).toHaveAttribute('d',/L/);await expect(cpu).not.toContainText('读取失败')
 await page.getByRole('button',{name:'网络延迟',exact:true}).click()
 await expect(cpu.locator('path')).toHaveCount(0);await expect(cpu).toContainText('查看历史')
})
for(const width of [721,900,1440])test(`previews fit ${width}px in English and stay below current readings`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'))
 await setup(page);await page.goto('/node/1')
 const previews=page.locator('.resource-trend');await expect(previews).toHaveCount(3)
 for(const p of await previews.all()){
  await expect(p.locator('path')).toHaveAttribute('d',/L/)
  const b=(await p.boundingBox())!;expect(b.height).toBeGreaterThanOrEqual(44)
  expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x+b.width).toBeLessThanOrEqual(width)
  expect(await p.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 }
 for(const p of await previews.all()){
  const track=await p.locator('xpath=..').locator('.detail-metric-track').boundingBox()
  expect((await p.boundingBox())!.y).toBeGreaterThanOrEqual(track!.y+track!.height)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
