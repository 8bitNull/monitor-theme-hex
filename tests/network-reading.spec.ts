// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {expandRoutes} from './routes'
import {test,expect,type Page} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'
async function setup(page:Page){
 const config={homeRoutes:3,modules:{map:false}}
 await page.route('**/theme-config.json',r=>r.fulfill({json:config}))
 await page.route('**/api/themes/hex/config',r=>r.fulfill({status:404}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const ts=Math.floor(Date.now()/1000),d=metrics();return r.fulfill({json:{...d,probes:{1:'Tokyo primary route',2:'Hong Kong backup route',3:'No packet statistics'},loss:{1:2.5,2:0},ping:[1,2,3].flatMap(id=>[{task_id:id,ts:ts-180,latency:0,loss:id===3?undefined:0},{task_id:id,ts:ts-120,latency:21,loss:undefined},{task_id:id,ts:ts-60,latency:null,loss:id===3?undefined:100},{task_id:id,ts,latency:28,loss:id===3?undefined:25}])}})})
 return config
}
for(const width of [768,800,899,900,1200,1350,1360,1440])test(`network readings fit in both languages and themes at ${width}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:1000});await setup(page)
 for(const language of ['zh','en'])for(const appearance of ['light','dark']){
  await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,appearance}))},{language,appearance})
  await page.goto('/');const card=page.locator('.node-card');await expect(card.locator('.ping-probe')).toHaveCount(3)
  await expect(card.locator('.latency-bars')).toHaveCount(3);await expect(card.locator('.latency-timeout')).toHaveCount(3)
  for(const reading of await card.locator('.latency-reading').all()){
   const offset=await reading.evaluate(el=>{const svg=el.querySelector('svg')!,box=svg.getBBox(),matrix=svg.getScreenCTM()!,value=el.querySelector('.latency-link')!.getBoundingClientRect();return Math.abs((box.y+box.height/2)*matrix.d+matrix.f-(value.top+value.height/2))})
   expect(offset).toBeLessThanOrEqual(1)
  }
  await expect(card.locator('.speed-direction')).toHaveText(language==='zh'?['上行','下行']:['Upload','Download'])
  const controls=card.locator('.latency-link');for(const button of await controls.all()){await button.scrollIntoViewIfNeeded();const b=(await button.boundingBox())!;expect(await button.evaluate((el,{x,y})=>el.contains(document.elementFromPoint(x,y)),{x:b.x+b.width/2,y:b.y+b.height/2})).toBeTruthy()}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  if(language==='zh'&&appearance==='light')await card.screenshot({path:`tests/artifacts/v013/home-${width}.png`})
  await page.goto('/node/1?routes=1,2,3#latency');await expect(page.locator('.loss-track')).toBeVisible();await expect(page.locator('.detail-speed .micro-trend')).toHaveCount(2)
  await expect(page.locator('.overview-account')).toBeVisible()
  for(const direction of ['upload','download']){
   const reading=page.locator(`.detail-speed .${direction}`),label=await reading.locator('.speed-direction').boundingBox(),value=await reading.locator('strong').boundingBox()
   expect(label).not.toBeNull();expect(value).not.toBeNull()
   if(value!.y<label!.y+label!.height-1)expect(value!.x).toBeGreaterThanOrEqual(label!.x+label!.width+4)
   else expect(value!.y).toBeGreaterThanOrEqual(label!.y+label!.height-1)
  }
  if(width<900)await page.locator('.overview-more-toggle').click()
  for(const reading of await page.locator('.detail-connections>div').all()){
   const label=await reading.locator('span').boundingBox(),value=await reading.locator('strong').boundingBox()
   expect(label).not.toBeNull();expect(value).not.toBeNull()
   expect(value!.x).toBeGreaterThanOrEqual(label!.x+label!.width+4)
  }
  await expect(page.locator('.detail-chart-frame .recharts-line-curve')).toHaveCount(3)
  await expandRoutes(page);await expect(page.locator('.route-chips button>span').first()).toHaveCSS('text-overflow','ellipsis');await page.keyboard.press('Escape')
  const billing=page.locator('.overview-account')
  if(width<900){await page.locator('.detail-facts-toggle').click()}
  const status=(await billing.locator('.overview-account-footer').boundingBox())!,facts=(await billing.locator('.overview-billing').boundingBox())!;if(width>=900)expect(status.x).toBeGreaterThanOrEqual(facts.x+facts.width);else expect(status.y).toBeGreaterThanOrEqual(facts.y+facts.height-1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  if(language==='zh'&&appearance==='light')await page.locator('.detail-history').screenshot({path:`tests/artifacts/v013/latency-${width}.png`})
 }
 expect(errors).toEqual([])
})
test('home route count shows the latency indicator for every selected route',async({page})=>{
 const config=await setup(page);await page.goto('/');const card=page.locator('.node-card')
 for(const count of ['1','2','3']){
 config.homeRoutes=Number(count);await page.reload()
 await expect(card.locator('.ping-probe')).toHaveCount(Number(count));await expect(card.locator('.latency-bars')).toHaveCount(Number(count));await expect(card.locator('.latency-trend-caption')).toHaveCount(0)
  const reading=card.locator('.ping-probe').first().locator('.latency-reading');expect(await reading.evaluate(el=>[...el.children].map(child=>child.className||child.tagName))).toEqual(['SPAN','latency-bars','latency-link'])
  if(count==='3'){const rows=await card.locator('.ping-probe .latency-reading').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().y));expect(rows[1]-rows[0]).toBeLessThanOrEqual(45);expect(rows[2]-rows[1]).toBeLessThanOrEqual(45)}
}
})
test('single route latency indicator fills the available row',async({page})=>{
 await page.setViewportSize({width:850,height:900});await setup(page);await page.goto('/')
 const reading=page.locator('.node-card .ping-probe').first().locator('.latency-reading');const label=reading;const bars=reading.locator(':scope > .latency-bars')
 const labelBox=(await label.boundingBox())!,barsBox=(await bars.boundingBox())!;expect(barsBox.x-(labelBox.x+labelBox.width)).toBeLessThanOrEqual(12);expect(barsBox.width).toBeGreaterThan(80);const valueBox=(await reading.locator(".latency-link").boundingBox())!;expect(Math.abs(valueBox.x-barsBox.x-barsBox.width-6)).toBeLessThanOrEqual(1)
 await page.setViewportSize({width:1440,height:900});await page.reload();const desktopBars=page.locator('.node-card .ping-probe').first().locator('.latency-bars');expect((await desktopBars.boundingBox())!.width).toBeGreaterThan(180);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
})
test('home latency window defaults to one hour and can show six or twenty-four hours',async({page})=>{
 let latencyWindow='1'
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{latencyWindow}}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const d=metrics(),ts=Math.floor(Date.now()/1000);return r.fulfill({json:{...d,probes:{1:'Primary'},loss:{1:0},ping:[86400,21600,3600,60,0].map((offset,i)=>({task_id:1,ts:ts-offset,latency:20+i}))}})})
 await page.goto('/');const card=page.locator('.node-card'),matrix=card.locator('.route-matrix'),bars=card.locator('.latency-bars g')
 await expect(matrix).toHaveAttribute('data-latency-window','1');await expect(bars).toHaveCount(3);await expect(card.locator('.latency-trend-caption')).toHaveCount(0)
 latencyWindow='6';await page.reload()
 await expect(matrix).toHaveAttribute('data-latency-window','6');await expect(bars).toHaveCount(4)
 latencyWindow='24';await page.reload()
 await expect(matrix).toHaveAttribute('data-latency-window','24');await expect(bars).toHaveCount(5)
})
test('loss timeline preserves zero, unknown and timeout and follows selected routes',async({page})=>{
 await setup(page);await page.goto('/node/1?routes=1,2,3#latency')
 const track=page.locator('.loss-track'),reading=track.locator('.loss-track-reading'),slider=track.locator('input')
 await expect(reading).toContainText('25%');await expect(track.locator('rect')).toHaveCount(2);await expect(track.locator('circle')).toHaveCount(1)
 await slider.focus();await page.keyboard.press('Home');await expect(reading).toContainText('0 ms');await expect(reading).toContainText('丢包 0%')
 await page.keyboard.press('ArrowRight');await expect(reading).toContainText('丢包 —')
 await page.keyboard.press('ArrowRight');await expect(reading).toContainText('超时');await expect(reading).toContainText('100%')
 await expandRoutes(page);await page.getByRole('button',{name:'Tokyo primary route',exact:true}).click();await page.keyboard.press('Escape')
 await expect(page.locator('.route-chips button[aria-label="Hong Kong backup route"]')).toHaveAttribute('aria-pressed','true')
 await expandRoutes(page);await page.getByRole('button',{name:'Hong Kong backup route',exact:true}).click();await page.keyboard.press('Escape')
 await expect(track.locator('.loss-track-plot,.loss-track-reading,input')).toHaveCount(0);await expect(track).toContainText('逐点丢包暂无统计')
 await expandRoutes(page);await page.getByRole('button',{name:'Tokyo primary route',exact:true}).click();await page.keyboard.press('Escape')
 await expect(page.locator('.route-chips button[aria-label="Tokyo primary route"]')).toHaveAttribute('aria-pressed','true')
 await expect(track.locator('.loss-track-reading')).toBeVisible()
 await page.getByRole('button',{name:'1 小时',exact:true}).click();await expect(reading).toContainText('25%')
})
test('live trends accumulate real reports and clear on offline state',async({page})=>{
 await page.clock.install();await setup(page);let count=0,offline=false;const ts=Math.floor(Date.now()/1000)
 await page.unroute('**/api/nodes');await page.route('**/api/nodes',r=>{const n=nodes()[0];return r.fulfill({json:{nodes:[{...n,last_seen:ts+count*5,online:!offline,metrics:{...n.metrics,net_tx:0,net_rx:1024*count}}]}})})
 await page.goto('/node/1');const speed=page.locator('.detail-speed');await expect(speed.locator('.micro-empty')).toHaveCount(2)
 count++;await page.clock.runFor(5100);await expect(speed.locator('.micro-empty')).toHaveCount(0);await expect(speed.locator('.upload .speed-amount')).toHaveText('0')
 expect(await speed.locator('.upload .micro-trend path').first().getAttribute('d')).toContain('L')
 offline=true;await page.clock.runFor(5100);await expect(page.locator('.overview-unavailable')).toBeVisible();await expect(speed).toHaveCount(0)
})


test('network visuals remain fixed across site resource and latency styles',async({page})=>{
 let config:any={graph:'bar',latencyScale:'200',latencyWarn:80,latencyHigh:160,module_map:false}
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:config}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.goto('/');const card=page.locator('.node-card');await expect(card.locator('.latency-bars')).toBeVisible()
 for(const graph of ['ring','bar','columns','minimal']){
  config={...config,graph};await page.reload()
  await expect(card.locator('.speed-trend')).toHaveCount(2)
  for(const trend of await card.locator('.speed-trend').all()){await expect(trend).toBeVisible();await expect(trend.locator('svg')).toHaveCount(1)}
  await expect(card.locator('.latency-bars')).toBeVisible();await expect(card.locator('.speed-ring,.speed-track')).toHaveCount(0)
 }
 config={...config,latencyScale:'500',latencyWarn:100,latencyHigh:250};await page.reload()
 await expect(card.locator('.latency-bars svg')).toHaveAttribute('aria-label',/0–500 ms.*100.*250/)
 await page.reload();await expect(card.locator('.latency-bars svg')).toHaveAttribute('aria-label',/0–500 ms.*100.*250/)
 config={...config,latencyScale:'200',latencyWarn:80,latencyHigh:160};await page.reload()
 await expect(card.locator('.latency-bars svg')).toHaveAttribute('aria-label',/0–200 ms.*80.*160/)
})

test('live activity distinguishes zero, slow, missing, stale and offline readings',async({page})=>{
 await page.clock.install();const now=Math.floor(Date.now()/1000);let state='live'
 await page.route('**/api/nodes',r=>{const n=nodes()[0];return r.fulfill({json:{nodes:[{...n,online:state!=='offline',last_seen:state==='stale'?now-120:now,metrics:state==='missing'?null:{...n.metrics,net_tx:0,net_rx:1}}]}})})
 await page.goto('/');const speed=page.locator('.node-card .speed-indicators')
 await expect(speed.locator('.upload .speed-amount')).toHaveText('0');await expect(speed.locator('.download .speed-amount')).toHaveText('<0.001')
 await expect(speed.locator('.micro-empty')).toHaveCount(2)
 for(state of ['missing','stale']){
  await page.clock.runFor(5100);await expect(speed.locator('.speed-amount')).toHaveText(['—','—']);await expect(speed.locator('.micro-trend circle')).toHaveCount(0);await expect(speed).toHaveAttribute('data-state',state)
 }
 state='offline';await page.clock.runFor(5100);await expect(speed).toHaveCount(0);await expect(page.locator('.node-card .offline-last-report')).toBeVisible()
})

test('latency bars preserve timestamp gaps, threshold colors and capped actual values',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const ts=Math.floor(Date.now()/1000);return r.fulfill({json:{...metrics(),probes:{1:'Primary'},loss:{1:0},ping:[{task_id:1,ts:ts-240,latency:20},{task_id:1,ts:ts-180,latency:200},{task_id:1,ts:ts-60,latency:null},{task_id:1,ts,latency:600}]}})})
 await page.goto('/');const bars=page.locator('.latency-bars');await expect(bars.locator('g')).toHaveCount(4)
 await expect(bars.locator('[data-tone=good]')).toHaveCount(1);await expect(bars.locator('[data-tone=fair]')).toHaveCount(1);await expect(bars.locator('.latency-timeout')).toHaveCount(1)
 await expect(bars.locator('[data-capped=true] title')).toContainText('600 ms');await expect(page.locator('.latency-link')).toContainText('600')
 const heights=await bars.locator('rect').evaluateAll(els=>els.map(e=>Number(e.getAttribute('height'))));expect(heights).toEqual([1.2,12,30])
})

test('latency curve and loss track remain available across smoothing and zoom',async({page})=>{
 await setup(page);await page.goto('/node/1?routes=1#latency')
 const curve=page.locator('.detail-chart-frame .recharts-line-curve'),track=page.locator('.loss-track')
 await expect(curve).toHaveCount(1);await expect(track).toBeVisible()
 await page.getByRole('checkbox',{name:'抑制尖峰'}).check();await expect(curve).toHaveCount(1)
 const handle=page.locator('.latency-brush .recharts-brush-traveller').first();await handle.focus();await page.keyboard.press('ArrowRight')
 await expect(page.getByRole('button',{name:'恢复范围'})).toBeVisible();await expect(track).toBeVisible()
 await page.getByRole('button',{name:'恢复范围'}).click();await expect(curve).toHaveCount(1)
 await expect(page.locator('.latency-stat-details,.latency-summary,.latency-explanation-panel')).toHaveCount(0)
})
