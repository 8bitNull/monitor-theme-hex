import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'

test('mobile cards retain resource, expiry and freshness feedback',async({page})=>{
 const expiry=new Date(Date.now()+3*86400000).toISOString().slice(0,10)
 let stale=false
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],last_seen:Math.floor(Date.now()/1000)-(stale?120:0),expires_at:expiry,metrics:{...nodes()[0].metrics,cpu:92}}]}}))
 for(const width of [390,320]){
  await page.setViewportSize({width,height:844});await page.goto('/')
  const card=page.locator('.ma-node').first()
  await expect(card).toContainText('CPU 92');await expect(card).toContainText('剩余 3 天')
  await expect(card.locator('.ma-meter')).toHaveCount(2)
  expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 }
 stale=true;await page.reload()
 const card=page.locator('.ma-node').first()
 await expect(card).toHaveAttribute('data-state','stale')
 await expect(card).toContainText('数据已过期');await expect(card).not.toContainText('高负载')
 await expect(card).toContainText('剩余 3 天');await expect(card.locator('.ma-meter b')).toHaveText(['—','—'])
 await page.setViewportSize({width:900,height:844})
 await expect(page.locator('.node-card').first().locator('.resources .resource')).toHaveCount(4)
})

test('desktop expiry tag sits beside the OS label',async({page})=>{
 const expiry=new Date(Date.now()+3*86400000).toISOString().slice(0,10)
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[{...nodes()[0],name:'Netcup RS1000 - 黑五',os:'Debian 12',expires_at:expiry}]}}))
 for(const width of [1440,900,721]){
  await page.setViewportSize({width,height:900})
  await page.goto('/')
  const card=page.locator('.node-card').first()
  const os=card.locator('.node-os-row p'),tag=card.locator('.card-expiry-tag')
  await expect(os).toContainText('Debian 12')
  await expect(tag).toContainText('剩余 3 天')
  await expect(card.locator('.node-name-row .card-issue')).toHaveCount(0)
  const osBox=await os.boundingBox(),tagBox=await tag.boundingBox()
  expect(osBox).not.toBeNull();expect(tagBox).not.toBeNull()
  expect(tagBox!.x).toBeGreaterThan(osBox!.x+osBox!.width)
  expect(Math.abs(tagBox!.y+tagBox!.height/2-osBox!.y-osBox!.height/2)).toBeLessThan(2)
  expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
  await card.screenshot({path:`tests/artifacts/desktop-expiry-${width}.png`})
 }
})

test('four summary tiles form balanced rows at tablet widths',async({page})=>{
 await page.goto('/')
 const grid=page.locator('.summary-grid')
 await expect(grid.locator(':scope > div')).toHaveCount(4)
 for(const width of [721,795,959,960,1024,1100,1101,1440]){
  await page.setViewportSize({width,height:900})
  const layout=await grid.locator(':scope > div').evaluateAll(tiles=>tiles.map(tile=>{
   const box=tile.getBoundingClientRect()
   return {top:box.top,left:box.left,width:box.width}
  }))
  if(width<960){
   expect(layout[0].top).toBe(layout[1].top)
   expect(layout[2].top).toBe(layout[3].top)
   expect(layout[2].top).toBeGreaterThan(layout[0].top)
   expect(layout[0].left).toBe(layout[2].left)
   expect(layout[1].left).toBe(layout[3].left)
  }else expect(new Set(layout.map(tile=>tile.top)).size).toBe(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 }
})

test('summary filters provide selected state and matching nodes on desktop',async({page})=>{
 for(const width of [795,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/')
  await page.getByRole('button',{name:'筛选离线节点',exact:true}).click()
  await expect(page.locator('.node-card')).toHaveCount(1)
  await expect(page.locator('.node-card')).toContainText('London')
  await page.getByRole('button',{name:'显示全部节点',exact:true}).click()
  await expect(page.locator('.node-card')).toHaveCount(6)
 }
})

for(const language of ['zh','en'])test(`mobile overview metrics and filters remain readable in ${language}`,async({page})=>{
 await page.addInitScript(lang=>localStorage.setItem('monitor-next-language',lang),language)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes()}}))
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});await page.goto('/')
  const nav=page.getByRole('navigation',{name:language==='zh'?'主导航':'Main navigation'})
  await nav.getByRole('button',{name:language==='zh'?'概览':'Overview',exact:true}).click()
  await expect(page.locator('.ma-hero')).toContainText('5')
  await expect(page.locator('.ma-stat-grid')).toContainText('54.0 GB')
  await expect(page.locator('.ma-stat-grid')).toContainText('45.36 Mbps')
  const offline=page.locator('.ma-attention-actions button').first()
  expect((await offline.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await offline.click();await expect(page.locator('.ma-node')).toHaveCount(1)
  await expect(page.locator('.ma-node')).toContainText('London')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
})

test('desktop offline card keeps its facts without stretching to the row height',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes()}}));await page.goto('/')
 const offline=page.locator('.node-card.node-offline').first()
 await expect(offline.locator('.offline-last-report')).toBeVisible();await expect(offline.locator('.card-billing')).toBeVisible()
 const heights=await offline.evaluate(el=>{
  const top=Math.round(el.getBoundingClientRect().top),grid=el.parentElement!
  return [...grid.children].filter(card=>Math.round(card.getBoundingClientRect().top)===top).map(card=>({offline:card===el,height:card.getBoundingClientRect().height}))
 })
 expect(heights.filter(item=>!item.offline).length).toBeGreaterThan(0)
 expect(heights.find(item=>item.offline)!.height).toBeLessThan(Math.max(...heights.filter(item=>!item.offline).map(item=>item.height))-30)
})
