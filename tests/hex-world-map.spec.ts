import {test,expect} from '@playwright/test'
import {readFile} from 'node:fs/promises'
import {resolve,extname} from 'node:path'
import {execFileSync} from 'node:child_process'
import anchors from '../src/data/map-flat-points.json' with {type:'json'}
test.use({reducedMotion:'no-preference',launchOptions:async({browserName},applyLaunchOptions)=>{
 await applyLaunchOptions(browserName==='chromium'?{args:['--enable-unsafe-swiftshader']}:{})
}})
// Reusable-component tests must build from current source on clean checkouts.
test.beforeAll(()=>{execFileSync(process.execPath,['scripts/build-map-demo.mjs'],{stdio:'inherit'})})

test('homepage draws real instanced land and shows measured server probes',async({page})=>{
 await page.addInitScript(()=>{
  const original=WebGL2RenderingContext.prototype.drawElementsInstanced
  WebGL2RenderingContext.prototype.drawElementsInstanced=function(mode,count,type,offset,instances){
   if(this.canvas instanceof HTMLCanvasElement&&this.canvas.classList.contains('hex-map-canvas'))this.canvas.dataset.landInstances=String(instances)
   return original.call(this,mode,count,type,offset,instances)
  }
 })
 await page.goto('/')
 const canvas=page.locator('.hex-map-canvas')
 await expect(canvas).toBeVisible()
 await expect.poll(async()=>Number(await canvas.getAttribute('data-land-instances'))).toBeGreaterThan(2000)
 await page.locator('.map-cluster[data-region=JP] .hex-region-badge').hover()
 await expect(page.getByRole('tooltip')).toContainText('日本')
 await page.locator('.map-cluster[data-region=JP] .hex-region-badge').click()
 await expect(page.getByRole('region',{name:'地区详情',exact:true})).toContainText('Tokyo · 东京主节点')
 await expect(page.getByRole('region',{name:'地区详情',exact:true})).toContainText('ms')
})

async function openDemo(page:import('@playwright/test').Page){
 const root=resolve('artifacts/hex-world-map/demo')
 await page.route('**/hex-component/**',async route=>{
  const name=new URL(route.request().url()).pathname.replace('/hex-component/','')||'index.html'
  const file=resolve(root,name)
  if(!file.startsWith(root+'/'))return route.abort()
  const types:Record<string,string>={'.html':'text/html','.js':'text/javascript','.css':'text/css'}
  await route.fulfill({body:await readFile(file),contentType:types[extname(file)]})
 })
 await page.goto('/hex-component/index.html')
}
test('reusable component has geographic nodes, ping and loss, connections and aligned parallax',async({page})=>{
 const errors:string[]=[]
 page.on('pageerror',error=>errors.push(error.message))
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
 await page.addInitScript(()=>{
  const original=WebGL2RenderingContext.prototype.deleteBuffer
  WebGL2RenderingContext.prototype.deleteBuffer=function(buffer){
   const el=this.canvas
   if(el instanceof HTMLCanvasElement&&el.classList.contains('hex-map-canvas'))document.documentElement.dataset.releasedMapBuffers=String(Number(document.documentElement.dataset.releasedMapBuffers??0)+1)
   return original.call(this,buffer)
  }
 })
 await openDemo(page)
 const map=page.locator('.three-world-map'),canvas=map.locator('canvas')
 await expect(canvas).toBeVisible()
 await expect.poll(()=>canvas.evaluate(el=>el.width>100)).toBe(true)
 const tokyo=map.getByRole('button',{name:'东京',exact:true})
 await tokyo.hover()
 await expect(map.getByRole('tooltip')).toContainText('12 ms')
 await expect(map.getByRole('tooltip')).toContainText('0%')
 await page.getByRole('button',{name:'缺失探测数据',exact:true}).click()
 await tokyo.focus()
 await expect(map.getByRole('tooltip')).toContainText('—')
 await expect(map.getByRole('tooltip')).not.toContainText('0%')
 await page.getByRole('button',{name:'切换主题',exact:true}).click()
 await expect(map).toHaveAttribute('data-theme','light')
 await page.getByRole('button',{name:'隐藏连接',exact:true}).click()
 await expect(map.locator('.map-connection')).toHaveCount(0)
 await page.setViewportSize({width:900,height:700})
 await expect.poll(()=>canvas.evaluate(el=>Math.abs(el.width/el.clientWidth-Math.min(devicePixelRatio,2))<.02)).toBe(true)
 const scene=map.locator('.map-parallax-scene')
 await page.mouse.move(0,0)
 const before=await scene.evaluate(el=>getComputedStyle(el).transform)
 const bounds=(await map.boundingBox())!
 await page.mouse.move(bounds.x+bounds.width-20,bounds.y+40)
 await expect.poll(()=>scene.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before)
 await tokyo.hover()
 await expect(map.getByRole('tooltip')).toBeVisible()
 const releasedBefore=Number(await page.locator('html').getAttribute('data-released-map-buffers'))
 await page.getByRole('button',{name:'卸载地图',exact:true}).click()
 await expect(canvas).toHaveCount(0)
 await expect.poll(async()=>Number(await page.locator('html').getAttribute('data-released-map-buffers'))).toBeGreaterThan(releasedBefore)
 await page.getByRole('button',{name:'挂载地图',exact:true}).click()
 await expect(map.locator('canvas')).toBeVisible()
 expect(errors).toEqual([])
})

test('static fallback keeps explicit Pacific connections split at the antimeridian',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'})
 await openDemo(page)
 await expect(page.locator('.three-world-map canvas')).toHaveCount(0)
 const route=page.locator('.map-static-connection[data-connection=us-jp]')
 await expect(route).toBeVisible()
 expect((await route.getAttribute('d'))!.match(/M/g)?.length).toBe(2)
})

test.describe('nearby country controls',()=>{
test.use({hasTouch:true})
test('nearby countries expose distinct group targets at real anchors and chooser members remain selectable',async({page})=>{
 const {nodes}=await import('../scripts/fixtures.mjs')
 const sample=nodes()[0]
 const countries=['DE','FR','HK','JP','MO','US']
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:countries.map((country,i)=>({...sample,id:i+1,country,name:`Node ${country}`}))}}))
 await page.goto('/')
 const map=page.locator('.region-atlas'),targets=map.locator('.map-cluster,.map-region-group')
 const settleCamera=()=>map.locator('.map-land').evaluate(async el=>{
  let previous=el.getAttribute('transform'),stable=0
  while(stable<6){
   await new Promise(requestAnimationFrame)
   const current=el.getAttribute('transform');stable=current===previous?stable+1:0;previous=current
  }
 })
 await expect.poll(()=>targets.evaluateAll(elements=>elements.flatMap(el=>(el.getAttribute('data-members')??el.getAttribute('data-region')!).split(',')).sort())).toEqual(countries)
 const placement=await targets.evaluateAll((elements,points)=>{
  const m=(document.querySelector('.map-land') as SVGGraphicsElement).getScreenCTM()!
  return elements.map(el=>{
   const codes=(el.getAttribute('data-members')??el.getAttribute('data-region')!).split(',')
   const anchor=new DOMPoint(codes.reduce((sum,code)=>sum+points[code][0],0)/codes.length,codes.reduce((sum,code)=>sum+points[code][1],0)/codes.length).matrixTransform(m)
   const core=el.querySelector('.region-core,circle')!.getBoundingClientRect()
   const hit=el.querySelector('.small-region-hit,circle')!.getBoundingClientRect()
   const x=hit.x+hit.width/2,y=hit.y+hit.height/2
   return {distance:Math.hypot(anchor.x-core.x-core.width/2,anchor.y-core.y-core.height/2),x,y,r:hit.width/2,ownsHit:document.elementFromPoint(x,y)?.closest('.map-cluster,.map-region-group')===el}
  })
 },anchors as Record<string,number[]>)
 for(const target of placement){expect(target.distance).toBeLessThan(.1);expect(target.ownsHit).toBe(true)}
 for(let i=0;i<placement.length;i++)for(let j=i+1;j<placement.length;j++)expect(Math.hypot(placement[i].x-placement[j].x,placement[i].y-placement[j].y)).toBeGreaterThanOrEqual(placement[i].r+placement[j].r)
 const boxes=await map.locator('.hex-region-badge').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().toJSON()))
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
  const a=boxes[i],b=boxes[j]
  expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top).toBe(true)
 }
 const jp=map.locator('.map-cluster[data-region=JP]')
 await expect(jp).toHaveAttribute('data-tone','good')
 await jp.locator('.hex-region-badge').hover();await expect(page.getByRole('tooltip')).toContainText('日本')
 const group=map.locator('.map-region-group[data-members="HK,MO"]'),chooser=map.getByRole('dialog',{name:'选择地区',exact:true})
 await group.tap();await chooser.getByRole('button',{name:/香港/}).tap()
 await expect(page.locator('.node-card')).toHaveCount(1);await expect(page.locator('.node-card')).toContainText('Node HK')
 // Selecting a member animates focus; the chooser intentionally dismisses while the camera moves.
 await settleCamera()
 for(const [code,name,key] of [['HK','香港','Enter'],['MO','澳门',' ']]){
  await group.focus();await group.press(key)
  const member=chooser.getByRole('button',{name:new RegExp(name)})
  await expect(member).toContainText('1 个节点');expect((await member.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await member.focus();await member.press('Enter')
  await expect(page.locator('.node-card')).toHaveCount(1)
  await expect(page.locator('.node-card')).toContainText(`Node ${code}`)
  await expect(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})).toHaveAttribute('data-value',code)
  await expect(chooser).toHaveCount(0)
  await settleCamera()
 }
})
})
