import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

test('narrow multi-route cards give route names their own row above the plot',async({page})=>{
 await page.setViewportSize({width:768,height:1000})
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{homeRoutes:3,modules:{map:false}}}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{
  const data=metrics()
  return r.fulfill({json:{...data,probes:{1:'Tokyo primary route',2:'Hong Kong backup route',3:'Internal network'},ping:[1,2,3].flatMap(id=>data.ping.map(row=>({...row,task_id:id})))}})
 })
 await page.goto('/')
 const card=page.locator('.node-card')
 await expect(card.locator('.ping-probe')).toHaveCount(3)
 for(const row of await card.locator('.ping-probe').all()){
  const name=(await row.locator('.latency-reading>span').boundingBox())!
  const value=(await row.locator('.latency-link').boundingBox())!
  const plot=(await row.locator('.latency-bars').boundingBox())!
  const loss=(await row.locator('.loss-stat').boundingBox())!
  expect(name.width).toBeGreaterThan(120)
  expect(name.x+name.width).toBeLessThanOrEqual(value.x)
  expect(plot.y).toBeGreaterThanOrEqual(value.y+value.height)
  expect(Math.abs(plot.y+plot.height/2-loss.y-loss.height/2)).toBeLessThanOrEqual(1)
 }
 expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
})

test('detailed mobile cards keep the route name inside its latency action',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await page.addInitScript(()=>localStorage.setItem('hex-mobile-v1',JSON.stringify({detailed:true})))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/')
 const card=page.locator('.ma-node'),link=card.getByRole('button',{name:'查看线路：Tokyo gateway',exact:true})
 await expect(link).toContainText('Tokyo gateway')
 await expect(card.locator('.ma-route-footer')).toHaveCount(0)
 expect(await link.evaluate(el=>el.scrollWidth<=el.clientWidth&&el.getBoundingClientRect().height>=44)).toBe(true)
 await link.click()
 await expect(page).toHaveURL(url=>url.pathname==='/node/1'&&url.searchParams.get('routes')==='1'&&url.hash==='#latency')
})
