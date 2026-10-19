import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function fixture(page:Page){
 await page.routeWebSocket('**/api/ws',socket=>socket.close())
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],price:123.45}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
}
const identity=(authed:boolean)=>({authed,github:false,site_name:'HEX',public_page:true})

test('a stalled identity refresh times out and permits a fresh logout check',async({page})=>{
 await fixture(page)
 let requests=0
 await page.route('**/api/me',r=>{
  requests++
  if(requests===2)return // Leave one network request pending until the app aborts it.
  return r.fulfill({json:identity(requests===1)})
 })
 await page.goto('/node/1')
 await expect(page.locator('.account-cost')).toContainText('$123.45')
 await page.evaluate(()=>dispatchEvent(new Event('focus')))
 await expect(page.locator('.error-banner')).toBeVisible({timeout:15000})
 await page.evaluate(()=>dispatchEvent(new Event('focus')))
 await expect(page.locator('.account-cost')).toHaveCount(0)
 await expect(page.locator('.error-banner')).toHaveCount(0)
 await expect(page.locator('.account-traffic')).toBeVisible()
})

test('an active public page notices session expiry without a focus change',async({page})=>{
 await page.clock.install();await fixture(page)
 let authed=true
 await page.route('**/api/me',r=>r.fulfill({json:identity(authed)}))
 await page.goto('/node/1')
 await expect(page.locator('.account-cost')).toContainText('$123.45')
 authed=false
 await page.clock.fastForward(61000)
 await expect(page.locator('.account-cost')).toHaveCount(0)
 await expect(page.locator('.account-traffic')).toBeVisible()
})

test('hidden pages pause periodic identity checks and revalidate on return',async({page})=>{
 await page.clock.install();await fixture(page)
 let authed=true,requests=0
 await page.route('**/api/me',r=>{requests++;return r.fulfill({json:identity(authed)})})
 await page.goto('/node/1')
 await expect(page.locator('.account-cost')).toBeVisible()
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))})
 authed=false
 await page.clock.fastForward(181000)
 expect(requests).toBe(1)
 await page.evaluate(()=>{Reflect.deleteProperty(document,'hidden');document.dispatchEvent(new Event('visibilitychange'))})
 await expect(page.locator('.account-cost')).toHaveCount(0)
 expect(requests).toBe(2)
})
