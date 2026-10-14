import {test,expect,type Page} from '@playwright/test'
import {build} from 'vite'
import {readFile} from 'node:fs/promises'
import {resolve,extname} from 'node:path'
import atlas from '../src/data/map-flat.json' with {type:'json'}

test.use({reducedMotion:'no-preference',launchOptions:{args:['--enable-unsafe-swiftshader']}})
const root=resolve('artifacts/hex-world-map/map-layers-2026-10-14/renderer-fixture')
const errorsByPage=new WeakMap<Page,string[]>()
test.beforeAll(async()=>{await build({configFile:false,root:resolve('tests/fixtures/map-layer-renderer'),base:'./',build:{outDir:root,emptyOutDir:true,chunkSizeWarningLimit:1400}})})
test.afterEach(async({page})=>{expect(errorsByPage.get(page)??[]).toEqual([])})
type Draw={mode:number;count:number;instances?:number;uniforms:Record<string,number|number[]>}
async function openRenderer(page:Page){
 const errors:string[]=[]
 errorsByPage.set(page,errors)
 page.on('pageerror',error=>errors.push(error.message))
 page.on('console',message=>{if(message.type()==='error'&&/THREE|shader|WebGL/i.test(message.text()))errors.push(message.text())})
 const locations=['JP','US','DE','FR','GB'].map(code=>atlas.hexes.find(hex=>hex[2]===code)!.slice(0,2))
 await page.addInitScript(locations=>{
  const state={draws:[] as unknown[],deleted:0,created:0,clears:0,landPixels:[] as number[][],haloOutput:[] as {time:number;enabled:number;changed:number;peak:number}[]}
  Object.assign(window,{gpu:state})
  const proto=WebGL2RenderingContext.prototype
  const clear=proto.clear
  proto.clear=function(mask){state.clears++;state.draws=[];return clear.call(this,mask)}
  function capture(gl:WebGL2RenderingContext,mode:number,count:number,instances?:number){
   const program=gl.getParameter(gl.CURRENT_PROGRAM),uniforms:Record<string,unknown>={}
   for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){
    const name=gl.getActiveUniform(program,i)!.name,value=gl.getUniform(program,gl.getUniformLocation(program,name)!)
    if(typeof value==='number')uniforms[name]=value
    else if(value instanceof Float32Array&&value.length<=4)uniforms[name]=Array.from(value)
   }
   state.draws.push({mode,count,instances,uniforms})
  }
  const arrays=proto.drawArrays,elements=proto.drawElements,instanced=proto.drawElementsInstanced
  proto.drawArrays=function(mode,first,count){capture(this,mode,count);return arrays.call(this,mode,first,count)}
  proto.drawElements=function(mode,count,type,offset){
   capture(this,mode,count)
   const draw=state.draws.at(-1) as Draw,halo='chosen' in draw.uniforms,before=new Uint8Array(80*80*4)
   if(halo)this.readPixels(560,180,80,80,this.RGBA,this.UNSIGNED_BYTE,before)
   const result=elements.call(this,mode,count,type,offset)
   if(halo){
    const after=new Uint8Array(before.length);this.readPixels(560,180,80,80,this.RGBA,this.UNSIGNED_BYTE,after)
    let changed=0,peak=0
    for(let i=0;i<before.length;i+=4){const delta=Math.max(...[0,1,2].map(channel=>Math.abs(after[i+channel]-before[i+channel])));if(delta>0)changed++;peak=Math.max(peak,delta)}
    state.haloOutput.push({time:Number(draw.uniforms.time),enabled:Number(draw.uniforms.enabled),changed,peak});if(state.haloOutput.length>12)state.haloOutput.shift()
   }
   return result
  }
  proto.drawElementsInstanced=function(mode,count,type,offset,instances){
   capture(this,mode,count,instances);const result=instanced.call(this,mode,count,type,offset,instances)
   state.landPixels=locations.map(([x,y])=>{const pixel=new Uint8Array(4);this.readPixels(Number(x),400-Number(y),1,1,this.RGBA,this.UNSIGNED_BYTE,pixel);return Array.from(pixel)})
   return result
  }
  const create=proto.createBuffer,del=proto.deleteBuffer
  proto.createBuffer=function(){state.created++;return create.call(this)}
  proto.deleteBuffer=function(buffer){state.deleted++;return del.call(this,buffer)}
 },locations)
 await page.route('**/renderer-fixture/**',async route=>{
  const name=new URL(route.request().url()).pathname.replace('/renderer-fixture/','')||'index.html',file=resolve(root,name)
  if(!file.startsWith(root+'/'))return route.abort()
  await route.fulfill({body:await readFile(file),contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css'}[extname(file)]})
 })
 await page.goto('/renderer-fixture/index.html')
 await expect.poll(()=>page.evaluate(()=>(window as any).gpu.draws.some((d:Draw)=>(d.instances??0)>2000))).toBe(true)
 expect(errors).toEqual([])
}
const point={id:'JP',x:600,y:180,online:true,tx:100_000_000,rx:10_000_000,probeState:'healthy'}
async function update(page:Page,patch:unknown){await page.evaluate(p=>(window as any).mapFixture.update(p),patch)}
async function draws(page:Page):Promise<Draw[]>{return page.evaluate(()=>(window as any).gpu.draws)}
async function traffic(page:Page){return (await draws(page)).filter(d=>d.mode===0&&d.count===20)}
async function halos(page:Page){return (await draws(page)).filter(d=>d.mode===4&&'chosen' in d.uniforms)}

// These catch drawing old traffic in nodes/probe, ignoring real rate changes, or
// treating missing/offline metrics as activity. All observations come from real GL draws.
test('nodes draws instanced land and gentle halos without traffic draws',async({page})=>{
 await openRenderer(page);await update(page,{layer:'nodes',nodes:[point]})
 await expect.poll(async()=>(await halos(page)).length).toBe(1)
 await expect.poll(async()=>Number((await halos(page))[0]?.uniforms.enabled??0)).toBeGreaterThan(.99)
 await expect.poll(()=>page.evaluate(()=>(window as any).gpu.haloOutput.filter((output:{enabled:number;changed:number})=>output.enabled>.99&&output.changed>0).length)).toBeGreaterThanOrEqual(3)
 const output=await page.evaluate(()=>(window as any).gpu.haloOutput.filter((sample:{enabled:number})=>sample.enabled>.99) as {time:number;changed:number;peak:number}[])
 expect(output.every(sample=>sample.changed>0&&sample.changed<80*80/2&&sample.peak>0&&sample.peak<64)).toBe(true)
 expect(new Set(output.map(sample=>`${sample.changed}:${sample.peak}`)).size).toBeGreaterThan(1)
 console.log('settled restrained nodes halo output',JSON.stringify(output))
 expect(await traffic(page)).toHaveLength(0)
 expect((await draws(page)).some(d=>(d.instances??0)>2000)).toBe(true)
})

test('traffic uses real up/down rates, eases changes and settles zero, unknown and offline',async({page})=>{
 await openRenderer(page);await update(page,{layer:'traffic',nodes:[point]})
 await expect.poll(async()=>Number((await traffic(page))[0]?.uniforms.up)).toBeGreaterThan(.7)
 expect(Number((await traffic(page))[0].uniforms.down)).toBeGreaterThan(.4)
 await update(page,{nodes:[{...point,tx:0,rx:10_000_000}]})
 expect(Number((await traffic(page))[0].uniforms.up)).toBeGreaterThan(.1)
 await expect.poll(async()=>Number((await traffic(page))[0]?.uniforms.up??0)).toBeLessThan(.001)
 expect(Number((await traffic(page))[0].uniforms.down)).toBeGreaterThan(.4)
 await update(page,{nodes:[{...point,tx:0,rx:0}]})
 expect(Number((await traffic(page))[0]?.uniforms.down)).toBeGreaterThan(.1)
 await expect.poll(async()=>(await traffic(page)).length).toBe(0)
 for(const metrics of [{tx:0,rx:0},{tx:null,rx:null},{online:false}]){
  await update(page,{nodes:[{...point,...metrics}]})
  await expect.poll(async()=>(await traffic(page)).length).toBe(0)
  await update(page,{nodes:[point]})
  await expect.poll(async()=>(await traffic(page)).length).toBe(1)
 }
})

test('probe renders independent real quality colors, with unknown and offline excluded from activity',async({page})=>{
 await openRenderer(page)
 const baseline=await page.evaluate(()=>(window as any).gpu.landPixels as number[][])
 const states=['healthy','slow','high','timeout','unknown']
 await update(page,{layer:'probe',nodes:states.map((probeState,i)=>({...point,id:['JP','US','DE','FR','GB'][i],x:150+i*140,probeState}))})
 await expect.poll(async()=>(await halos(page)).length).toBe(5)
 expect(await traffic(page)).toHaveLength(0)
 await expect.poll(async()=>Number((await halos(page))[3].uniforms.probe)).toBeGreaterThan(.99)
 const land=await page.evaluate(()=>(window as any).gpu.landPixels as number[][])
 expect(land[0][2]).toBeGreaterThan(land[0][0])
 expect(land[2][0]).toBeGreaterThan(land[0][0]) // severe regional contrast is actually rendered
 expect(land[4]).toEqual(baseline[4]) // unknown never gains regional contrast
 const colors=(await halos(page)).map(d=>d.uniforms.color as number[])
 expect(colors[0][2]).toBeGreaterThan(colors[0][0]) // healthy primary blue
 expect(colors[1][0]).toBeGreaterThan(colors[1][2]) // warning amber
 expect(colors[2][0]).toBeGreaterThan(colors[2][1]) // high red
 expect(colors[3]).toEqual(colors[2]) // timeout is the same current severe class
 expect(colors[4][0]).toBeLessThan(colors[1][0]) // unknown gray, no abnormal pulse
 expect(Number((await halos(page))[4].uniforms.enabled)).toBe(0)
 await update(page,{nodes:[{...point,online:false,probeState:'timeout'}]})
 await expect.poll(async()=>Number((await halos(page))[0]?.uniforms.enabled)).toBe(0)
 expect(await traffic(page)).toHaveLength(0)
})

test('layer transitions retain palettes and missing layer keeps real traffic and explicit connections',async({page})=>{
 await openRenderer(page);await update(page,{nodes:[point],connections:[{id:'real',from:'JP',to:'US',start:[600,180],end:[300,160],speed:.2,loss:0}]})
 await expect.poll(async()=>(await traffic(page)).length).toBe(1)
 expect((await draws(page)).some(d=>d.mode===0&&d.count===9)).toBe(true)
 await update(page,{layer:'nodes'});await expect.poll(async()=>(await traffic(page)).length).toBe(0)
 await update(page,{layer:'probe',theme:'light',nodes:[point]})
 await expect.poll(async()=>Number((await halos(page))[0]?.uniforms.probe)).toBeGreaterThan(.99)
 const light=(await halos(page))[0].uniforms.color as number[]
 await update(page,{theme:'dark'})
 await expect.poll(async()=>Number(((await halos(page))[0].uniforms.color as number[])[2])).toBeGreaterThan(light[2])
 expect((await draws(page)).some(d=>d.mode===0&&d.count===9)).toBe(true)
})

test('repeated disposal deletes real buffers, stops rendering and context loss reports once',async({page})=>{
 await openRenderer(page);await update(page,{layer:'traffic',nodes:[point]})
 await expect.poll(async()=>(await traffic(page)).length).toBe(1)
 for(let i=0;i<3;i++){
  const before=await page.evaluate(()=>(window as any).gpu.deleted)
  await page.evaluate(()=>(window as any).mapFixture.dispose())
  expect(await page.evaluate(()=>(window as any).gpu.deleted)).toBeGreaterThan(before)
  const cleared=await page.evaluate(()=>(window as any).gpu.clears)
  await page.waitForTimeout(100)
  expect(await page.evaluate(()=>(window as any).gpu.clears)).toBe(cleared)
  await page.evaluate(()=>{const old=document.querySelector('canvas')!;const fresh=old.cloneNode() as HTMLCanvasElement;old.replaceWith(fresh)})
  expect(await page.evaluate(()=>(window as any).gpu.deleted)).toBe(await page.evaluate(()=>(window as any).gpu.created))
  await page.evaluate(()=>{(window as any).gpu.draws=[];(window as any).mapFixture.mount()})
  await expect.poll(async()=>(await traffic(page)).length).toBe(1)
 }
 await page.locator('canvas').evaluate(el=>el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext())
 await expect.poll(()=>page.evaluate(()=>(window as any).mapFixture.failures)).toBe(1)
 await page.locator('canvas').dispatchEvent('webglcontextlost')
 expect(await page.evaluate(()=>(window as any).mapFixture.failures)).toBe(1)
})

test('real effects reuse buffers, cap frames and pause when the canvas is invisible',async({page})=>{
 await openRenderer(page);await update(page,{layer:'traffic',nodes:[point]})
 await expect.poll(async()=>(await traffic(page)).length).toBe(1)
 const created=await page.evaluate(()=>(window as any).gpu.created)
 for(const layer of ['nodes','probe','traffic'])await update(page,{layer,theme:'light',nodes:[{...point,tx:1_000_000,probeState:'slow'}]})
 const start=await page.evaluate(()=>({time:performance.now(),clears:(window as any).gpu.clears}))
 await page.waitForTimeout(1100)
 const end=await page.evaluate(()=>({time:performance.now(),clears:(window as any).gpu.clears}))
 expect((end.clears-start.clears)/((end.time-start.time)/1000)).toBeLessThanOrEqual(30)
 expect(end.clears-start.clears).toBeGreaterThan(0)
 expect(await page.evaluate(()=>(window as any).gpu.created)).toBe(created)
 await page.locator('canvas').evaluate(el=>{el.style.display='none'})
 await page.waitForTimeout(150)
 const stopped=await page.evaluate(()=>(window as any).gpu.clears)
 await page.waitForTimeout(200)
 expect(await page.evaluate(()=>(window as any).gpu.clears)).toBe(stopped)
 await page.locator('canvas').evaluate(el=>{el.style.display='block'})
 await expect.poll(()=>page.evaluate(()=>(window as any).gpu.clears)).toBeGreaterThan(stopped)
})

test.describe('mobile rendering budget',()=>{
 test.use({deviceScaleFactor:3})
 test('a high DPR device obeys the parent mobile 1.5 cap',async({page})=>{
  await openRenderer(page);await update(page,{layer:'nodes',nodes:[point],maxPixelRatio:1.5})
  await expect(page.locator('canvas')).toHaveJSProperty('width',1500)
  await expect(page.locator('canvas')).toHaveJSProperty('height',600)
  expect(await traffic(page)).toHaveLength(0)
 })
})
