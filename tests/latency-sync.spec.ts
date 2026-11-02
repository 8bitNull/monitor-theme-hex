import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'
const base=1800000000
const data=(shift=0)=>({metrics:[],probes:{1:'Primary'},loss:{1:shift},ping:Array.from({length:6},(_,i)=>({task_id:1,ts:base+(i+shift)*60,latency:20+i+shift,loss:0}))})
async function setup(page:Page){
 await page.clock.install();await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
}
test('automatic latency updates preserve selected timestamps and settings, retain failures and recover',async({page})=>{
 await setup(page);let calls=0,fail=false
 await page.route('**/api/nodes/*/metrics?*',r=>{if(!r.request().url().includes('series=ping'))return r.fulfill({json:data()});const shift=calls++;return fail?r.fulfill({status:503}):r.fulfill({json:data(shift)})})
 await page.goto('/node/1?routes=1#latency');const curve=page.locator('.latency-view .recharts-line-curve'),refresh=page.getByRole('button',{name:'刷新历史',exact:true})
 await expect(curve).toHaveCount(1);await expect(refresh).toBeEnabled();expect(calls).toBe(1)
 const fullRange=await page.locator('.latency-range-heading>span').first().innerText()
 await page.getByRole('checkbox',{name:'抑制尖峰'}).check()
 const handles=page.locator('.latency-brush .recharts-brush-traveller');await handles.first().focus();await page.keyboard.press('ArrowRight');await handles.last().focus();await page.keyboard.press('ArrowLeft')
 const range=page.locator('.latency-range-heading>span').first();const selected=await range.innerText()
 await page.clock.fastForward(5100);await expect.poll(()=>calls).toBe(2);await expect(refresh).toBeEnabled();await expect(range).toHaveText(selected);await expect(page.getByRole('checkbox',{name:'抑制尖峰'})).toBeChecked()
 await page.getByRole('button',{name:'恢复范围',exact:true}).click();await expect.poll(()=>range.innerText()).not.toBe(fullRange)
 const retained=await range.innerText()
 fail=true;await page.clock.fastForward(5100);await expect(page.locator('.history-notice')).toContainText('保留上次历史记录');await expect(range).toHaveText(retained)
 fail=false;await page.clock.runFor(50000);expect(calls).toBe(3)
 await page.clock.fastForward(11000);await expect.poll(()=>range.innerText()).not.toBe(retained);await expect(page.locator('.history-notice')).toHaveCount(0)
 await expect(page.getByLabel('查看线路',{exact:true})).toHaveAttribute('data-value','1')
 await expect(page.locator('.latency-view .recharts-line-curve')).toHaveCount(1)
})
test('latency polling pauses in background, refreshes on return and stops outside latency',async({page})=>{
 await setup(page);let calls=0,pending:any,hold=false
 await page.route('**/api/nodes/*/metrics?*',r=>{const params=new URL(r.request().url()).searchParams;if(params.get('series')==='ping'&&params.get('hours')==='6'){calls++;if(hold){pending=r;return}}return r.fulfill({json:data()})})
 await page.goto('/node/1?routes=1#latency');await expect(page.locator('.latency-view .recharts-line-curve')).toHaveCount(1);await expect(page.getByRole('button',{name:'刷新历史',exact:true})).toBeEnabled()
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
 await page.clock.fastForward(90000);expect(calls).toBe(1)
 hold=true;await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});await expect.poll(()=>calls).toBe(2)
 await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await page.getByRole('button',{name:'刷新历史',exact:true}).evaluate((el:HTMLButtonElement)=>el.click());expect(calls).toBe(2)
 hold=false;const range=page.locator('.latency-range-heading>span').first(),before=await range.innerText();await pending.fulfill({json:data(1)});await expect.poll(()=>range.innerText()).not.toBe(before)
 await page.getByRole('button',{name:'资源',exact:true}).click();await page.clock.fastForward(90000);expect(calls).toBe(2)
})
