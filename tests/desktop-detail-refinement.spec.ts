import {test,expect} from '@playwright/test'
import {detailFixture} from './detail-aesthetics-fixture'
import {nodes} from '../scripts/fixtures.mjs'
import {bytes} from '../src/lib/format'

test('daily traffic reads upload before download',async({page})=>{
 await detailFixture(page)
 const node={...nodes()[0],day_tx:1048576,day_rx:9437184}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[node]}}))
 await page.goto('/node/1')
 const row=page.locator('.detail-facts>div').filter({has:page.locator('dt',{hasText:'今日流量'})})
 await expect(row.locator('dd')).toHaveText(`↑ ${bytes(node.day_tx)} · ↓ ${bytes(node.day_rx)}`)
})

test('history preview exposes an action on keyboard focus',async({page})=>{
 await detailFixture(page)
 await page.goto('/node/1')
 const button=page.getByRole('button',{name:'查看硬盘历史趋势',exact:true})
 let tabs=0
 while(tabs<80 && !await button.evaluate(element=>document.activeElement===element)){
  await page.keyboard.press('Tab')
  tabs++
 }
 expect(tabs).toBeGreaterThan(1)
 await expect(button).toBeFocused()
 await expect(button.locator('.resource-trend-action')).toHaveCSS('opacity','1')
 await expect(button.locator('.resource-trend-action')).toHaveText('查看硬盘历史趋势')
 await page.keyboard.press('Enter')
 await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric','disk_used')
})

for(const width of [900,1280])for(const language of ['zh','en'])test(`history action fits ${width}px ${language} without hover shift`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await page.addInitScript(language=>localStorage.setItem('monitor-next-language',language),language)
 await detailFixture(page)
 await page.goto('/node/1')
 const button=page.locator('.resource-trend[data-metric=disk_used]')
 const caption=button.locator('.resource-trend-caption')
 const action=button.locator('.resource-trend-action')
 await expect(action).toHaveCSS('opacity','0')
 const before=await caption.boundingBox()
 await button.hover()
 await expect(action).toHaveCSS('opacity','1')
 const hovered=await caption.boundingBox()
 await button.focus()
 const focused=await caption.boundingBox()
 expect(hovered).toEqual(before)
 expect(focused).toEqual(before)
 const layout=await caption.evaluate(element=>{
  const [range,action,arrow]=Array.from(element.children) as HTMLElement[]
  const bounds=(node:HTMLElement)=>node.getBoundingClientRect()
  const r=bounds(range),a=bounds(action),i=bounds(arrow),c=bounds(element)
  return {rangeRight:r.right,rangeBottom:r.bottom,actionLeft:a.left,actionRight:a.right,actionTop:a.top,arrowLeft:i.left,captionRight:c.right,actionBottom:a.bottom,captionBottom:c.bottom,actionFits:action.scrollWidth<=action.clientWidth,documentFits:document.documentElement.scrollWidth<=innerWidth}
 })
 if(width>=1024){
  // Narrow cockpit cards give the action its own row so translated words stay readable.
  expect(layout.rangeRight).toBeLessThanOrEqual(layout.arrowLeft)
  expect(layout.actionTop).toBeGreaterThanOrEqual(layout.rangeBottom)
  expect(layout.actionRight).toBeLessThanOrEqual(layout.captionRight)
 }else{
  expect(layout.rangeRight).toBeLessThanOrEqual(layout.actionLeft)
  expect(layout.actionRight).toBeLessThanOrEqual(layout.arrowLeft)
 }
 expect(layout.actionBottom).toBeLessThanOrEqual(layout.captionBottom)
 expect(layout.actionFits).toBe(true)
 expect(layout.documentFits).toBe(true)
})

test('long billing values wrap inside the desktop account row',async({page})=>{
 await page.setViewportSize({width:900,height:1000})
 await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'))
 await detailFixture(page)
 const node={...nodes()[0],currency:'LONGCURRENCYWITHOUTSPACES'.repeat(8),billing_cycle:'LONGPERIODWITHOUTSPACES'.repeat(8),expires_at:'2020-01-01'}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[node]}}))
 await page.goto('/node/1')
 const account=page.locator('.overview-account')
 await expect(account.locator('.overview-price')).toContainText('LONGCURRENCYWITHOUTSPACES')
 const layout=await account.evaluate(element=>{
  const card=element.getBoundingClientRect()
  const price=element.querySelector('.overview-price')!.getBoundingClientRect()
  const priceElement=element.querySelector('.overview-price') as HTMLElement
  return {cardRight:card.right,priceRight:price.right,priceFits:priceElement.scrollWidth<=priceElement.clientWidth,documentFits:document.documentElement.scrollWidth<=innerWidth}
 })
 expect(layout.priceRight).toBeLessThanOrEqual(layout.cardRight)
 expect(layout.priceFits).toBe(true)
 expect(layout.documentFits).toBe(true)
})

for(const width of [721,900,1199])test(`named desktop metric controls at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000})
 await detailFixture(page)
 await page.goto('/node/1')
 const controls=page.locator('.detail-chart-toolbar .detail-resource-metric-desktop')
 for(const [name,metric] of [['CPU','cpu'],['内存','mem_used'],['硬盘','disk_used']] as const){
  const button=controls.getByRole('button',{name,exact:true})
  await expect(button.locator('span')).toBeVisible()
  await button.click()
  await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric',metric)
 }
 const selection=(await page.locator('.detail-toolbar-selection').boundingBox())!
 const actions=(await page.locator('.detail-toolbar-actions').boundingBox())!
 const range=(await page.locator('.detail-chart-toolbar .detail-ranges').boundingBox())!
 const status=(await page.locator('.detail-chart-toolbar .detail-update').boundingBox())!
 expect(actions.y).toBeGreaterThanOrEqual(selection.y+selection.height)
 expect(range.x+range.width).toBeLessThanOrEqual(status.x)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
