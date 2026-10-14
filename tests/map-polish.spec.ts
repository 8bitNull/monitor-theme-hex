import {test,expect} from '@playwright/test'
import {chooseOption} from './select'
import {nodes} from '../scripts/fixtures.mjs'

async function settledMap(page:import('@playwright/test').Page){
 await expect.poll(()=>page.locator('.region-atlas').evaluate(el=>el.getAttribute('data-webgl')==='true'||!el.querySelector('canvas')),{timeout:30000}).toBe(true)
 const svg=page.getByLabel('世界节点分布地图',{exact:true})
 await expect.poll(()=>svg.evaluate(el=>Math.abs(el.viewBox.baseVal.height-1000*el.getBoundingClientRect().height/el.getBoundingClientRect().width))).toBeLessThan(.001)
 await svg.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)})
}

test('pointer focus does not pin a tooltip; keyboard focus retains it',async({page})=>{
 await page.goto('/')
 const jp=page.locator('.map-cluster[data-region=JP]'),badge=jp.locator('.hex-region-badge')
 await badge.click();await expect(page.getByRole('tooltip')).toContainText('日本')
 await page.mouse.move(0,0);await expect(page.getByRole('tooltip')).toHaveCount(0)
 await page.getByLabel('世界节点分布地图',{exact:true}).focus();await page.keyboard.press('Tab')
 await expect(page.getByRole('tooltip')).toBeVisible()
 await page.mouse.move(0,0);await expect(page.getByRole('tooltip')).toBeVisible()
 await page.keyboard.press('Escape');await expect(page.getByRole('tooltip')).toHaveCount(0)
})

test('region feedback clears only the region filter',async({page})=>{
 await page.goto('/')
 const search=page.locator('.desktop-header-search').getByRole('searchbox',{name:'搜索节点'})
 await search.fill('Tokyo')
 await page.locator('.map-cluster[data-region=JP] .hex-region-badge').click()
 await expect(page.locator('.map-region-selection')).toContainText('日本 · 1 个节点')
 await page.getByRole('button',{name:'清除地区筛选',exact:true}).click()
 await expect(page.locator('.map-region-selection')).toHaveCount(0)
 await expect(search).toHaveValue('Tokyo');await expect(page.locator('.node-card')).toHaveCount(1)
})

test('Agent online and selected recent probe quality remain independent',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{ping:[{task_id:1,ts:Date.now()/1000,latency:20},{task_id:2,ts:Date.now()/1000,latency:350,loss:0}],probes:{1:'Fast route',2:'Slow route'},loss:{1:100,2:0}}}))
 await page.goto('/')
 const jp=page.locator('.map-cluster[data-region=JP]')
 await expect(page.locator('.latency-link')).toBeVisible()
 await expect(jp).toHaveAttribute('data-probe-quality','healthy')
 await expect(jp).toHaveAttribute('data-tone','good')
 await jp.focus();await jp.press('Enter');await expect(page.getByRole('region',{name:'地区详情',exact:true})).toContainText('24h 丢包 100.0%')
 await chooseOption(page.getByRole('combobox',{name:'节点探测线路'}),'2')
 await expect(jp).toHaveAttribute('data-probe-quality','high')
 await expect(jp).toHaveAttribute('data-tone','good')
 await expect(jp.locator('.map-probe-alert')).toHaveCount(1)
 await expect(page.getByRole('region',{name:'地区详情',exact:true})).toContainText('Slow route')
 await expect(page.getByRole('region',{name:'地区详情',exact:true})).toContainText('高延迟')
})

test('default compact cards fit the intended density without hiding core readings',async({page})=>{
 await page.setViewportSize({width:1600,height:1050});await page.goto('/')
 const card=page.locator('.node-card').first()
 await expect(card.locator('.latency-link')).toBeVisible()
 const locate=card.getByRole('button',{name:/^地图定位：/})
 await expect(locate).toBeVisible()
 const compactHeight=(await card.boundingBox())!.height,locateHeight=(await locate.boundingBox())!.height
 expect(locateHeight).toBeGreaterThanOrEqual(32);expect(locateHeight).toBeLessThanOrEqual(36)
 // The accepted map action adds its own row; preserve the original readings budget.
 expect(compactHeight-locateHeight).toBeLessThanOrEqual(320)
 expect(compactHeight).toBeLessThanOrEqual(356)
 for(const selector of ['.resource-label','.resource small','.speed-trend','.latency-bars'])await expect(card.locator(selector).first()).toBeVisible()
 await chooseOption(page.getByRole('combobox',{name:'卡片密度'}),'detailed')
 expect((await card.boundingBox())!.height).toBeGreaterThan(400)
 expect((await card.boundingBox())!.height-compactHeight).toBeGreaterThanOrEqual(60)
 await expect(card.locator('.node-supplementary')).toBeVisible()
})

test('map zoom eases, remains anchored and dragging interrupts without a jump',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/')
 const svg=page.getByLabel('世界节点分布地图',{exact:true}),land=page.locator('.map-land')
 await expect(page.locator('.map-canvas-controls output')).toHaveText('130%')
 await settledMap(page)
 // Advance a controlled browser clock: software WebGL initialization can block real RAFs in CI.
 await page.clock.install();await page.clock.pauseAt(new Date())
 await page.getByRole('button',{name:'放大地图',exact:true}).click()
 await page.clock.runFor(100)
 const middle=Number((await page.locator('.map-canvas-controls output').textContent())!.replace('%',''))
 expect(middle).toBeGreaterThan(130);expect(middle).toBeLessThan(169)
 await page.clock.runFor(200)
 await expect(page.locator('.map-canvas-controls output')).toHaveText('169%')
 await page.evaluate(()=>{(document.querySelector('.map-canvas-controls button[aria-label="放大地图"]') as HTMLButtonElement).click()})
 await page.clock.runFor(80)
 const box=(await svg.boundingBox())!
 await page.mouse.move(box.x+10,box.y+box.height-10);await page.mouse.down()
 const interrupted=await land.getAttribute('transform')
 await page.clock.runFor(300);expect(await land.getAttribute('transform')).toBe(interrupted)
 await page.mouse.move(box.x+45,box.y+box.height-10);await page.mouse.up()
 await page.clock.runFor(20)
 await expect(land).not.toHaveAttribute('transform',interrupted!)
 await page.getByRole('button',{name:'重置地图视图',exact:true}).click()
 await page.clock.runFor(300)
 await expect(page.locator('.map-canvas-controls output')).toHaveText('130%')
 await page.locator('.map-cluster[data-region=JP] .hex-region-badge').dblclick()
 await page.clock.runFor(300)
 await expect(page.locator('.map-canvas-controls output')).toHaveText('300%')
})

test('animated pointer zoom preserves its anchor at intermediate frames and reduced motion skips easing',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/')
 await expect(page.locator('.map-cluster[data-region=JP]')).toBeVisible()
 await settledMap(page)
 const samples=await page.evaluate(async()=>{
  const svg=document.querySelector('.explorer-stage .map-parallax-scene>svg')!,land=document.querySelector('.map-land') as SVGGraphicsElement
  const r=svg.getBoundingClientRect(),x=Math.round(r.x+r.width*.7),y=Math.round(r.y+r.height*.7)
  const read=()=>{const p=new DOMPoint(x,y).matrixTransform(land.getScreenCTM()!.inverse());return {x:p.x,y:p.y,scale:land.transform.baseVal.consolidate()!.matrix.a}}
  const results=[read()]
  svg.dispatchEvent(new WheelEvent('wheel',{clientX:x,clientY:y,deltaY:-180,ctrlKey:true,bubbles:true,cancelable:true}))
  for(let i=0;i<25;i++){await new Promise(requestAnimationFrame);results.push(read())}
  return results
 })
 expect(samples.some(s=>s.scale>samples[0].scale&&s.scale<samples.at(-1)!.scale)).toBe(true)
 for(const s of samples){expect(Math.abs(s.x-samples[0].x)).toBeLessThan(.1);expect(Math.abs(s.y-samples[0].y)).toBeLessThan(.1)}
 await page.emulateMedia({reducedMotion:'reduce'})
 await page.getByRole('button',{name:'重置地图视图',exact:true}).click()
 await expect(page.locator('.map-canvas-controls output')).toHaveText('130%')
 const reduced=await page.evaluate(async()=>{
  const button=document.querySelector('.map-canvas-controls button[aria-label="放大地图"]') as HTMLButtonElement
  button.click();await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame)
  return document.querySelector('.map-canvas-controls output')!.textContent
 })
 expect(reduced).toBe('169%')
})

test('multi-node fixed detail keeps real current and historical readings in its scroll area',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:Array.from({length:6},(_,i)=>({...nodes()[0],id:i+1,country:i<2?'JP':'US'}))}}))
 await page.goto('/')
 await expect(page.locator('.latency-link').first()).toBeVisible()
 for(const code of ['JP','US']){
  await page.getByRole('group',{name:'地区速选',exact:true}).getByRole('button',{name:code==='JP'?/日本/:/美国/}).click()
  const detail=page.getByRole('region',{name:'地区详情',exact:true})
  await expect(detail.locator('.map-detail-nodes button')).toHaveCount(2)
  await expect(detail).toContainText('24h 丢包')
  expect(await detail.evaluate(el=>el.scrollHeight<=el.clientHeight)).toBe(true)
 }
})
