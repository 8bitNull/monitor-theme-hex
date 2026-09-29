import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function fixture(page:Page){
 await page.setViewportSize({width:390,height:844});await page.clock.install()
 await page.routeWebSocket('**/api/ws',s=>s.close())
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
}
test('repeated detail visits do not multiply homepage history requests or pollers',async({page})=>{
 await fixture(page);let requests=0
 await page.route('**/api/nodes/*/metrics?*',r=>{requests++;return r.fulfill({json:metrics()})})
 await page.goto('/');await expect(page.locator('.ma-network-link')).toBeVisible();expect(requests).toBe(1)
 for(let i=0;i<8;i++){
  await page.locator('.ma-node button[data-node-id]').click();await expect(page.locator('.ma-detail-header')).toBeVisible()
  await page.getByRole('button',{name:'返回总览',exact:true}).click();await expect(page.locator('.ma-network-link')).toBeVisible()
 }
 expect(requests).toBe(1)
 await page.clock.runFor(61000);await expect.poll(()=>requests).toBe(2)
})
test('hidden history polling pauses and repeated resume events produce one refresh',async({page})=>{
 await fixture(page);let requests=0
 await page.route('**/api/nodes/*/metrics?*',r=>{requests++;return r.fulfill({json:metrics()})})
 await page.goto('/');await expect(page.locator('.ma-network-link')).toBeVisible()
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
 await page.clock.runFor(65000);expect(requests).toBe(1)
 await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');for(let i=0;i<5;i++)document.dispatchEvent(new Event('visibilitychange'))})
 await expect.poll(()=>requests).toBe(2)
})
test('one simulated hour of cache expiry keeps a single refresh per interval',async({page})=>{
 await fixture(page);let requests=0;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('**/api/nodes/*/metrics?*',r=>{requests++;return r.fulfill({json:metrics()})})
 await page.goto('/');await expect(page.locator('.ma-network-link')).toBeVisible()
 for(let interval=1;interval<=12;interval++){
  await page.clock.fastForward(300000);await expect.poll(()=>requests).toBe(interval+1)
  await expect(page.locator('.ma-node')).toHaveCount(1)
 }
 expect(errors).toEqual([])
})
