import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

// A short generic placeholder used to bring the footer into view, then push it
// away as the lazy detail page arrived. Hold the real asset to observe that boundary.
for(const [width,height] of [[1024,768],[1920,1080]])test(`detail loading preserves return position and keeps footer below content at ${width}`,async({page},testInfo)=>{
 await page.setViewportSize({width,height})
 await page.routeWebSocket('**/api/ws',socket=>socket.close())
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:metrics()}))
 await page.addInitScript(()=>{
  (window as any).__detailShifts=[]
  new PerformanceObserver(list=>{for(const entry of list.getEntries() as any)if(!entry.hadRecentInput)(window as any).__detailShifts.push(entry.value)}).observe({type:'layout-shift',buffered:true})
 })
 let release!:()=>void
 const loading=new Promise<void>(resolve=>{release=resolve})
 await page.route(/\/assets\/NodeDetail-[^/]+\.js$/,async route=>{await loading;await route.continue()})
 try{
  await page.goto('/node/1',{waitUntil:'domcontentloaded'})
  const navigation=page.locator('.detail-navigation')
  await expect(navigation).toBeVisible()
  await expect(page.locator('main > [data-slot=skeleton]')).toBeVisible()
  // Let the loading frame actually paint before releasing the deferred asset.
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  const before=await navigation.boundingBox()
  const footerBefore=await page.locator('.site-footer').boundingBox()
  release()
  await expect(page.locator('.detail-metric-value').first()).toBeVisible()
  await expect(page.locator('.recharts-area-curve').first()).toBeVisible()
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  const after=await navigation.boundingBox()
  const cls=await page.evaluate(()=>(window as any).__detailShifts.reduce((sum:number,value:number)=>sum+value,0))
  await testInfo.attach('loading-layout',{body:JSON.stringify({before,after,footerBefore,cls}),contentType:'application/json'})
  expect.soft(footerBefore!.y).toBeGreaterThanOrEqual(height)
  expect.soft(Math.abs(after!.y-before!.y)).toBeLessThanOrEqual(1)
  expect(cls).toBeLessThanOrEqual(.1)
 }finally{release()}
})
