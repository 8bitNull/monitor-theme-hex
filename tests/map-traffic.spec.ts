import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

test.use({launchOptions:{args:['--enable-unsafe-swiftshader']}})

test('map tooltip aggregates current traffic by country and ignores stale and offline nodes',async({page})=>{
 const sample=nodes()[0]
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[
  {...sample,id:1,last_seen:Date.now()/1000,metrics:{...sample.metrics,net_tx:1_000_000,net_rx:2_000_000}},
  {...sample,id:2,last_seen:Date.now()/1000,metrics:{...sample.metrics,net_tx:3_000_000,net_rx:4_000_000}},
  {...sample,id:3,last_seen:Date.now()/1000-120,metrics:{...sample.metrics,net_tx:90_000_000,net_rx:90_000_000}},
  {...sample,id:4,online:false,metrics:{...sample.metrics,net_tx:90_000_000,net_rx:90_000_000}},
 ]}}))
 await page.goto('/')
 await page.locator('.map-cluster[data-region=JP]').focus()
 await expect(page.getByRole('tooltip')).toContainText('32.00 Mbps')
 await expect(page.getByRole('tooltip')).toContainText('48.00 Mbps')
})

test('WebGL unavailability retains map selection and detail navigation',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'})
 await page.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){return type.includes('webgl')?null:original.call(this,type,...args)} as typeof original
 })
 await page.goto('/')
 const marker=page.locator('.map-cluster[data-region=JP]')
 await marker.focus();await marker.press('Enter')
 await expect(page.locator('.map-traffic-canvas')).toHaveCount(0)
 await expect(page.locator('.node-card')).toHaveCount(1)
 await page.locator('.node-card .node-open').click()
 await expect(page.locator('.node-detail')).toBeVisible()
})

test('reduced motion skips the Three.js download and keeps country traffic available',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 const requests:string[]=[]
 page.on('request',request=>{if(request.url().includes('mapHexRenderer-'))requests.push(request.url())})
 await page.goto('/')
 await page.locator('.map-cluster[data-region=JP]').focus()
 await expect(page.getByRole('tooltip').locator('.map-tooltip-traffic')).toBeVisible()
 expect(requests).toEqual([])
 await expect(page.locator('.map-traffic-canvas')).toHaveCount(0)
})

test.describe('actual WebGL traffic',()=>{
 test.use({reducedMotion:'no-preference'})
 test('particles render changing frames, respond to current rates, and stop for offline data',async({page})=>{
  test.setTimeout(60000)
  let online=true,available=true,tx=60_000_000,rx=100_000_000
  await page.addInitScript(()=>{
   const original=WebGL2RenderingContext.prototype.clear
   WebGL2RenderingContext.prototype.clear=function(mask:number){
    const canvas=this.canvas
    if(canvas instanceof HTMLCanvasElement&&canvas.classList.contains('map-traffic-canvas'))canvas.dataset.testClears=String(Number(canvas.dataset.testClears??0)+1)
    original.call(this,mask)
   }
  })
  const errors:string[]=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error'&&/THREE|shader|WebGL/i.test(message.text()))errors.push(message.text())})
   const sample=nodes()[0]
   const snapshot=()=>({nodes:[{...sample,online,last_seen:Date.now()/1000,metrics:available?{...sample.metrics,net_tx:tx,net_rx:rx}:null}]})
   let publish!:()=>void
   // Drive reports explicitly: a fresh polling response can legitimately request
   // a static redraw between screenshots and is not a running animation loop.
   await page.routeWebSocket('**/api/ws',socket=>{publish=()=>socket.send(JSON.stringify(snapshot()))})
   await page.route('**/api/nodes',route=>route.fulfill({json:snapshot()}))
  await page.goto('/')
  const canvas=page.locator('.map-traffic-canvas'),marker=page.locator('.map-cluster[data-region=JP]')
  await expect(canvas).toBeVisible()
  await page.locator('.map-layer-buttons').getByRole('button',{name:'流量',exact:true}).click()
  await expect.poll(()=>canvas.evaluate(el=>Math.abs(el.width/el.getBoundingClientRect().width-Math.min(devicePixelRatio,2))<.05)).toBe(true)
  // Screenshots capture the actual GPU output; identical frames would expose a missing shader/render loop.
  const first=await canvas.screenshot()
  await expect.poll(async()=>!(await canvas.screenshot()).equals(first)).toBe(true)
  await marker.focus()
  await expect(page.getByRole('tooltip')).toContainText('480.00 Mbps')
   tx=125_000;rx=250_000;publish()
  await expect(page.getByRole('tooltip')).toContainText('1.00 Mbps',{timeout:10000})
  await expect(page.getByRole('tooltip')).toContainText('2.00 Mbps')
  await page.getByRole('button',{name:'放大查看',exact:true}).click()
  await expect(page.locator('.is-fullscreen')).toBeVisible()
  await page.getByRole('button',{name:'放大地图',exact:true}).click()
  await expect.poll(()=>canvas.evaluate(el=>Math.abs(el.width/el.getBoundingClientRect().width-Math.min(devicePixelRatio,2))<.05)).toBe(true)
  await page.getByRole('button',{name:'退出全屏',exact:true}).click()
  await expect(page.getByRole('button',{name:'放大查看',exact:true})).toBeFocused()
   online=false;publish()
  await marker.focus()
  await expect(page.getByRole('tooltip')).toContainText('流量数据暂不可用',{timeout:10000})
  await marker.evaluate(el=>(el as SVGElement).blur())
  await expect.poll(()=>page.locator('.explorer-stage .map-parallax-scene>svg').evaluate(el=>el.getAnimations({subtree:true}).some(animation=>animation.playState==='running'))).toBe(false)
  // The existing loop eases the last real signal to zero before becoming static.
  await expect.poll(async()=>{
   const before=await canvas.getAttribute('data-test-clears')
   await page.waitForTimeout(150)
   return await canvas.getAttribute('data-test-clears')===before
  },{timeout:10000}).toBe(true)
  // Element screenshots capture overlaid controls as well as GPU output.
  // The positioned layer buttons overflow their zero-height tools wrapper;
  // mask the buttons' painted bounds so outline rasterization stays excluded.
  const staticControls=page.locator('.map-layer-buttons')
  await expect(staticControls).toBeVisible()
  const staticOptions={mask:[staticControls]}
  const stopped=await canvas.screenshot(staticOptions),clears=await canvas.getAttribute('data-test-clears')
  expect((await canvas.screenshot(staticOptions)).equals(stopped)).toBe(true)
  expect(await canvas.getAttribute('data-test-clears')).toBe(clears)
   online=true;available=false;publish()
  await expect(marker).toHaveAttribute('data-tone','good',{timeout:10000})
  await marker.focus()
  await expect(page.getByRole('tooltip')).toContainText('流量数据暂不可用')
  await marker.evaluate(el=>(el as SVGElement).blur())
  await expect.poll(()=>page.locator('.explorer-stage .map-parallax-scene>svg').evaluate(el=>el.getAnimations({subtree:true}).some(animation=>animation.playState==='running'))).toBe(false)
  const missing=await canvas.screenshot()
  // Online breathing remains visible when traffic is unknown; no upload/download is invented.
  await expect.poll(async()=>!(await canvas.screenshot()).equals(missing)).toBe(true)
  expect(errors).toEqual([])
 })
 test('lost WebGL context removes effects while keyboard filtering still works',async({page})=>{
  await page.goto('/')
  const canvas=page.locator('.map-traffic-canvas')
  await expect(canvas).toBeVisible()
  await expect.poll(()=>canvas.evaluate(el=>Math.abs(el.width/el.getBoundingClientRect().width-Math.min(devicePixelRatio,2))<.05)).toBe(true)
  await canvas.evaluate(el=>el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext())
  await expect(canvas).toHaveCount(0)
  const marker=page.locator('.map-cluster[data-region=JP]')
  await marker.focus();await marker.press('Enter')
  await expect(page.locator('.node-card')).toHaveCount(1)
 })
})
