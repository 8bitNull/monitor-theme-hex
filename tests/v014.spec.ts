// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {expandRoutes} from './routes'
import {test,expect} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {toggleSettings,settingsCategory,setting} from './settings'

async function setup(page:any) {
 await page.route('**/api/nodes',(r:any)=>r.fulfill({json:{nodes:[{...nodes()[0],name:'Tokyo · 东京主节点',remark:'Production;Backup',expires_at:'2027-01-01'}]}}))
 await page.route('**/api/nodes/*/metrics?*',(r:any)=>{
  const d=metrics(),ts=Math.floor(Date.now()/1000)
  return r.fulfill({json:{...d,probes:{1:'浙江电信',2:'浙江联通',3:'浙江移动'},loss:{1:0,2:2.5},ping:[1,2,3].flatMap(id=>Array.from({length:40},(_,i)=>({task_id:id,ts:ts-(39-i)*60,latency:id*100+i,loss:id===3?undefined:i===39&&id===2?2.5:0})))}})
 })
}
test('all route entry selects all after load, survives reload and manual selection',async({page})=>{
 await setup(page);await page.goto('/')
 await page.getByRole('button',{name:'查看全部 3 条线路',exact:true}).click()
 await expect(page).toHaveURL(/routes=all.*#latency/)
 await expandRoutes(page)
 await expect(page.locator('.route-chips button[aria-pressed=true]')).toHaveCount(3)
 await page.reload();await expandRoutes(page);await expect(page.locator('.route-chips button[aria-pressed=true]')).toHaveCount(3)
 await page.getByRole('button',{name:'1 小时',exact:true}).click()
 await expect(page.locator('.route-chips button[aria-pressed=true]')).toHaveCount(3)
 await page.locator('.route-chips button').nth(1).click()
 await expect(page).toHaveURL(/routes=1%2C3/)
 await page.reload();await expandRoutes(page);await expect(page.locator('.route-chips button[aria-pressed=true]')).toHaveCount(2)
 await expect(page.locator('.route-chips button').nth(1)).toHaveAttribute('aria-pressed','false')
 await page.route('**/api/nodes/*/metrics?*',r=>{const d=metrics();return r.fulfill({json:{...d,probes:Object.fromEntries(Array.from({length:20},(_,i)=>[i+1,`Route ${i+1}`])),ping:Array.from({length:20},(_,i)=>({task_id:i+1,ts:Date.now()/1000,latency:20+i}))}})})
 await page.goto('/node/1?routes=all#latency');await expandRoutes(page)
 const route=page.locator('.route-chips').getByRole('button',{name:'Route 12',exact:true})
 await route.click();await expect(route).toHaveAttribute('aria-pressed','false')
 await expect(page.locator('.route-chips button[aria-pressed=true]')).toHaveCount(19)
})
test.skip('legacy preferences stay full; recommended preset preserves unrelated choices and drafts (removed drawer controls)',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next'))localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,schemaVersion:2,graph:'columns',palette:'forest',latencyScale:200,modules:{map:false}}))})
 await setup(page);await page.goto('/');await expect(page.locator('.node-card')).toHaveAttribute('data-density','full')
 await toggleSettings(page);await page.getByRole('button',{name:'应用本站推荐显示',exact:true}).click();await toggleSettings(page)
 await expect(page.locator('.node-card')).toHaveAttribute('data-density','full')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','forest')
 await expect(page.locator('.latency-bars svg')).toHaveAttribute('aria-label',/500.*150.*300/)
 await expect(page.locator('.node-connections')).toBeVisible()
 await toggleSettings(page);await settingsCategory(page,'network');await page.locator('.latency-presets').getByRole('button',{name:'自定义',exact:true}).click();await (await setting(page,'黄色阈值（ms）',{exact:true})).fill('175')
 await settingsCategory(page,'cards');await settingsCategory(page,'network')
 await expect(page.getByLabel('黄色阈值（ms）',{exact:true})).toHaveValue('175')
 await expect(page.getByText('阈值修改尚未应用')).toBeVisible()
 await page.getByRole('button',{name:'应用延迟阈值',exact:true}).click();await toggleSettings(page)
 await page.reload();await expect(page.locator('.node-card')).toHaveAttribute('data-density','full')
 await expect(page.locator('.latency-bars svg')).toHaveAttribute('aria-label',/175/)
})
test('detailed desktop cards retain core information within the height budget',async({page})=>{
 await setup(page);await page.goto('/');await page.locator('.route-matrix').scrollIntoViewIfNeeded();await expect(page.locator('.latency-bars')).toBeVisible()
 const card=page.locator('.node-card');await expect(card).toHaveAttribute('data-density','full')
 await expect(card.locator('.traffic-summary')).toBeVisible();await expect(card.locator('.node-price')).toBeVisible()
 await expect(card.locator('.node-connections')).toBeVisible()
 expect((await card.boundingBox())!.height).toBeLessThanOrEqual(560)
 await expect(card.locator('.node-connections')).toBeVisible()
 await expect(card.locator('.card-auxiliary-toggle')).toHaveCount(0)
})
test('compact desktop search keeps query, and detail has a single facts disclosure',async({page})=>{
 await page.setViewportSize({width:800,height:844});await setup(page);await page.goto('/')
 await page.getByRole('searchbox',{name:'搜索节点',exact:true}).fill('Tokyo')
 await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.active-filters')).toContainText('Tokyo')
 await page.locator('.node-open').click();await page.locator('.detail-facts-toggle').click()
 await expect(page.locator('#detail-fact-groups details')).toHaveCount(0)
 await expect(page.getByRole('region',{name:'网络与流量'}).locator('dl')).toBeVisible()
 await page.getByRole('button',{name:'返回总览',exact:true}).click();await expect(page.locator('.active-filters')).toContainText('Tokyo')
 expect((await page.locator('.summary-grid').boundingBox())!.height).toBeLessThanOrEqual(260)
})
test('legacy phone columns do not alter the desktop table',async({page})=>{
 await setup(page);await page.goto('/');await page.getByRole('button',{name:'表格视图',exact:true}).click()
 await expect(page.locator('thead th')).toHaveCount(11)
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.ma-node')).toHaveCount(1)
 await page.evaluate(()=>{const key='monitor-next-browse-v1',saved=JSON.parse(sessionStorage.getItem(key)!);sessionStorage.setItem(key,JSON.stringify({...saved,mobileColumns:[...saved.mobileColumns,'upload']}))});await page.reload()
 await expect(page.locator('.ma-node')).toHaveCount(1)
 await page.setViewportSize({width:1440,height:1000});await expect(page.locator('thead th')).toHaveCount(11)
 await page.reload();await expect(page.locator('thead th')).toHaveCount(11)
})
test('responsive visual evidence for both themes',async({page})=>{
 // Ten viewport/theme combinations include navigation and full-page screenshots.
 test.setTimeout(90000)
 await setup(page)
 for(const appearance of ['light','dark'])for(const width of [768,800,899,900,1440]){
  await page.setViewportSize({width,height:1000})
  await page.addInitScript(appearance=>localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,appearance,infoDensity:'overview',latencyScale:500,latencyWarn:150,latencyHigh:300,modules:{map:false}})),appearance)
  await page.goto('/');await page.locator('.route-matrix').scrollIntoViewIfNeeded();await expect(page.locator('.latency-bars')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  await page.screenshot({path:`tests/artifacts/v014/home-${appearance}-${width}.png`,fullPage:true})
  await page.getByRole('button',{name:'查看全部 3 条线路',exact:true}).click();await expect(page.locator('.route-chips')).toBeVisible();if(width>=390)expect(await page.locator('.route-chips button span').evaluateAll(els=>els.every(el=>el.scrollWidth<=el.clientWidth))).toBeTruthy()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  await page.mouse.move(0,0);await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`tests/artifacts/v014/detail-${appearance}-${width}.png`,fullPage:true})
 }
})
