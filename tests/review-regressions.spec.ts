import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

const identity=(authed:boolean)=>({authed,github:false,site_name:'HEX',public_page:true})
async function fixture(page:Page){
 await page.routeWebSocket('**/api/ws',socket=>socket.close())
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],price:123.45,remark:'公开备注'}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
}

for(const width of [390,1440])for(const authed of [false,true]){
 test(`detail price permission at ${width}px for ${authed?'signed-in users':'guests'}`,async({page})=>{
  await page.setViewportSize({width,height:1000});await fixture(page)
  await page.route('**/api/me',r=>r.fulfill({json:identity(authed)}))
  await page.goto('/node/1')
  await expect(page.locator('.node-detail')).toBeVisible()
  await expect(page.locator('.node-detail').getByLabel('备注',{exact:true})).toContainText('公开备注')
  await expect(page.locator('.account-cost')).toHaveCount(authed?1:0)
  if(authed)await expect(page.locator('.account-cost')).toContainText('$123.45')
  else await expect(page.locator('body')).not.toContainText('$123.45')
  await expect(page.locator('.account-traffic')).toBeVisible()
  await expect(page.locator('.account-expiry')).toBeVisible()
 })
}

for(const authed of [false,true])test(`table price permission for ${authed?'signed-in users':'guests'}`,async({page})=>{
 await fixture(page)
 await page.route('**/api/me',r=>r.fulfill({json:identity(authed)}))
 await page.addInitScript(()=>sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({view:'table',columns:['billing'],columnsVersion:5,tableLayout:'grouped'})))
 await page.goto('/')
 await expect(page.locator('.node-table')).toBeVisible()
 await expect(page.locator('thead [data-column=billing]')).toHaveCount(authed?1:0)
 if(authed)await expect(page.locator('tbody [data-column=billing]')).toContainText('$123.45')
 else await expect(page.locator('body')).not.toContainText('$123.45')
 await page.getByRole('button',{name:/查看备注/}).click()
 await expect(page.getByRole('dialog')).toContainText('公开备注')
})

for(const trigger of ['focus','visibilitychange'])test(`logout elsewhere hides prices after ${trigger}`,async({page})=>{
 await fixture(page)
 let authed=true
 await page.route('**/api/me',r=>r.fulfill({json:identity(authed)}))
 await page.goto('/')
 await expect(page.locator('.node-price')).toContainText('$123.45')
 authed=false
 await page.evaluate(event=>event==='focus'?dispatchEvent(new Event('focus')):document.dispatchEvent(new Event('visibilitychange')),trigger)
 await expect(page.locator('.node-price')).toHaveCount(0)
 await expect(page.getByRole('link',{name:'进入后台',exact:true})).toHaveCount(0)
 await expect(page.locator('.node-card').getByLabel('备注',{exact:true})).toContainText('公开备注')
})

test('identity rejection revokes the previously authenticated price display',async({page})=>{
 await fixture(page)
 let expired=false
 await page.route('**/api/me',r=>expired?r.fulfill({status:401,body:'Unauthorized'}):r.fulfill({json:identity(true)}))
 await page.goto('/node/1');await expect(page.locator('.account-cost')).toContainText('$123.45')
 expired=true
 await page.evaluate(()=>dispatchEvent(new Event('focus')))
 await expect(page.locator('.account-cost')).toHaveCount(0)
 await expect(page.locator('body')).not.toContainText('$123.45')
})

for(const loss of [{},undefined,{'1':12.5}])test(`mobile detail loss map ${JSON.stringify(loss)??'missing'}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page)
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),loss}}))
 await page.goto('/node/1?lh=24#latency')
 const summary=page.locator('.ma-route-summary')
 await expect(summary).toBeVisible()
 await expect(summary.locator('div').filter({has:page.locator('dt',{hasText:'丢包'})}).locator('dd')).toHaveText(loss===undefined?'未统计':Object.keys(loss).length?'12.5%':'0.0%')
})

test('history changing during route subscription startup renders the current URL',async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page)
 await page.addInitScript(()=>{
  // Control the startup boundary that a fast Back action can cross.
  const subscribe=window.addEventListener
  let navigated=false
  window.addEventListener=function(...args:Parameters<typeof subscribe>){
   if(args[0]==='popstate'&&!navigated){
    navigated=true
    history.replaceState(null,'','/?page=overview')
    dispatchEvent(new PopStateEvent('popstate'))
   }
   return subscribe.apply(this,args)
  }
 })
 await page.goto('/node/1')
 await expect(page).toHaveURL(/\?page=overview$/)
 await expect(page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'概览'})).toHaveAttribute('aria-current','page')
 await expect(page.locator('.node-detail')).toHaveCount(0)
})

for(const scope of ['app','detail'] as const)test(`viewport snapshot changes before ${scope} media subscriptions mount`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page)
 await page.addInitScript(scope=>{
  const native=window.matchMedia.bind(window),initialReads=new Set<string>()
  let detailStarted=false
  window.matchMedia=query=>{
   const media=native(query)
   if(query==='(max-width:899px)')detailStarted=true
   const stale=scope==='app'?/^\(max-width:\s?720px\)$/.test(query):detailStarted&&['(max-width:899px)','(max-width:720px)'].includes(query)
   if(!stale||initialReads.has(query))return media
   initialReads.add(query)
   // Model a desktop snapshot followed by the native phone viewport before subscription.
   return new Proxy(media,{get(target,key){
    if(key==='matches')return false
    const value=Reflect.get(target,key,target)
    return typeof value==='function'?value.bind(target):value
   }})
  }
 },scope)
 await page.goto('/node/1')
 await expect(page.locator('.ma-detail-header')).toBeVisible()
 await page.getByRole('button',{name:'返回总览',exact:true}).click()
 await expect(page.locator('#mobile-node-results')).toBeVisible()
 await expect(page.locator('.desktop-app-header')).toHaveCount(0)
})
