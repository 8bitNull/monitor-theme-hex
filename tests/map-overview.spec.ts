import {chooseOption} from './select'
import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'

test('overview uses one persistent region selector including unknown regions',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().slice(0,3).map((n,i)=>({...n,country:i===0?'JP':i===1?'US':''}))}}))
 await page.goto('/')
 const map=page.locator('.region-atlas'),select=page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})
 await expect(map).toBeVisible()
 await expect(page.locator('.map-status-sidebar,.home-region-list')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'放大地图',exact:true})).toHaveCount(1)
 await chooseOption(select,'unknown');await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.home-map-toggle')).toHaveCount(0)
 await chooseOption(select,'all');await expect(page.locator('.node-card')).toHaveCount(3)
 const jp=page.locator('.map-cluster[data-region="JP"]')
 await jp.focus();await expect(page.getByRole('tooltip')).toContainText('日本')
 await expect(page.getByRole('tooltip')).toContainText('1 / 1')
 await jp.press('Enter');await expect(select).toHaveAttribute('data-value','JP');await expect(page.locator('.node-card')).toHaveCount(1)
})

test('overview supports navigation gestures and expanded view restores overview framing',async({page})=>{
 await page.goto('/')
 const land=page.locator('.map-land'),svg=page.getByLabel('世界节点分布地图',{exact:true})
 await expect(land).toBeVisible()
 await expect.poll(()=>page.locator('.map-cluster,.map-region-group').evaluateAll(elements=>elements.flatMap(el=>(el.getAttribute('data-members')??el.getAttribute('data-region')!).split(',')).sort())).toEqual(nodes().map(n=>n.country).sort())
 await expect.poll(()=>svg.evaluate(el=>Math.abs(el.viewBox.baseVal.height-1000*el.getBoundingClientRect().height/el.getBoundingClientRect().width)<.01)).toBe(true)
 const initial=await land.getAttribute('transform')
 await svg.focus();await page.keyboard.press('+');await expect(land).not.toHaveAttribute('transform',initial!)
 await svg.press('0');await expect(land).toHaveAttribute('transform',initial!)
 // Ordinary scrolling must continue to scroll the page.
 await svg.hover();await page.mouse.wheel(0,-200)
 await expect(land).toHaveAttribute('transform',initial!)
 const b=(await svg.boundingBox())!;await page.mouse.move(b.x+30,b.y+50);await page.mouse.down();await page.mouse.move(b.x+160,b.y+90,{steps:5});await page.mouse.up()
 await expect(land).not.toHaveAttribute('transform',initial!)
 await page.getByRole('button',{name:'重置地图视图',exact:true}).click()
 await expect(land).toHaveAttribute('transform',initial!)
 await page.getByRole('button',{name:'放大查看',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBe(true)
 await page.getByRole('button',{name:'放大地图',exact:true}).click();await expect(land).not.toHaveAttribute('transform',initial!)
 await chooseOption(page.locator('.region-atlas').getByRole('combobox',{name:'地区',exact:true}),'JP')
 await page.getByRole('button',{name:'退出全屏',exact:true}).click()
 await expect(land).toHaveAttribute('transform',initial!)
 await expect(page.getByRole('button',{name:'放大查看',exact:true})).toBeFocused()
 await expect(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})).toHaveAttribute('data-value','JP')
})

for(const width of [721,900,1440])test(`overview remains compact at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/')
 await expect(page.locator('.map-graticule')).toBeVisible()
 const map=(await page.locator('.region-atlas').boundingBox())!,frame=(await page.locator('.map-frame').boundingBox())!
 expect(Math.abs(map.height-(frame.height-2))).toBeLessThan(1)
 expect(Math.abs(map.y-frame.y-1)).toBeLessThan(1)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('late regions preserve whole-world framing and close a vanished mapped region',async({page})=>{
 let country=''
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],country}]}}))
 await page.goto('/')
 const land=page.locator('.map-land'),select=page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})
 await expect(land).toBeVisible()
 await expect(page.locator('.map-cluster')).toHaveCount(0)
 await expect(page.locator('.map-empty-state')).toContainText('暂无可定位的地区信息')
 country='JP'
 await expect(page.locator('.map-cluster[data-region=JP]')).toHaveCount(1,{timeout:10000})
 await expect(land).not.toHaveAttribute('transform',/scale\(2\)/)
 await expect(page.locator('.map-empty-state')).toHaveCount(0)
 const initial=await land.getAttribute('transform')
 await chooseOption(select,'JP')
 country='DE'
 await expect(page.locator('.map-cluster[data-region=DE]')).toHaveCount(1,{timeout:10000})
 await expect(land).toHaveAttribute('transform',initial!)
 await expect(select).toHaveAttribute('data-value','all');await expect(page.getByRole('region',{name:'地区详情',exact:true})).toHaveCount(0)
 await chooseOption(select,'all');await expect(page.locator('.node-card')).toHaveCount(1)
})

test('fullscreen rejection leaves a usable overview and explanation',async({page})=>{
 await page.addInitScript(()=>{Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Unavailable'))})
 await page.goto('/');await page.getByRole('button',{name:'放大查看',exact:true}).click()
 await expect(page.locator('.map-open-error')).toHaveText('无法打开全屏，请使用支持全屏的浏览器。')
 const message=(await page.locator('.map-open-error').boundingBox())!,legend=(await page.locator('.map-state-legend').boundingBox())!
 expect(message.y+message.height).toBeLessThanOrEqual(legend.y-6)
 await expect(page.locator('.map-frame')).toBeVisible()
 await chooseOption(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true}),'JP')
 await expect(page.locator('.node-card')).toHaveCount(1)
})

test('selection toggles and tooltip stays near the marker without leaving the map',async({page})=>{
 await page.goto('/')
 const marker=page.locator('.map-cluster[data-region="JP"]'),select=page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})
 await marker.focus();await expect(page.getByRole('tooltip')).toBeVisible()
 const m=(await marker.boundingBox())!,tip=(await page.getByRole('tooltip').boundingBox())!,stage=(await page.locator('.explorer-stage').boundingBox())!
 expect(Math.abs(tip.x+tip.width/2-m.x-m.width/2)).toBeLessThan(140)
 expect(tip.y).toBeGreaterThanOrEqual(stage.y)
 expect(tip.x+tip.width).toBeLessThanOrEqual(stage.x+stage.width)
 await marker.press('Enter');await expect(select).toHaveAttribute('data-value','JP')
 await expect(page.locator('.map-cluster[data-region="US"]')).toHaveCSS('opacity','0.6')
 await marker.press('Enter');await expect(select).toHaveAttribute('data-value','all')
})

test('dense regions stay near anchors and remain selectable at different overview widths',async({page})=>{
 test.setTimeout(60000)
 const countries=['US','JP','HK','MO','SG','DE','FR','GB','NL','BE','CH','AT','IT','ES','PT','PL','CZ','DK','SE','NO','FI','IE','LU','LI','MC','NZ','ZA']
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:countries.map((country,i)=>({...nodes()[0],id:i+1,country}))}}))
 await page.goto('/')
 for(const width of [721,1440,1920]){
  await page.setViewportSize({width,height:1000});await page.getByRole('button',{name:'重置地图视图',exact:true}).click()
  await expect.poll(()=>page.locator('.map-cluster,.map-region-group').evaluateAll(elements=>elements.reduce((total,el)=>total+(el.getAttribute('data-members')?.split(',').length??1),0))).toBe(countries.length)
  await expect.poll(async()=>page.locator('.map-cluster,.map-region-group').evaluateAll(elements=>{
   const stage=elements[0]?.closest('.explorer-stage')
   // A responsive map replacement can detach the sampled markers; retry its new frame.
   if(!stage)return false
   const frame=stage.getBoundingClientRect()
   // Zoomed edge targets may be clipped; their geographic cores and displayed badges must remain reachable.
   return elements.every(el=>{
    if(el.getAttribute('aria-hidden')==='true')return el.getAttribute('tabindex')==='-1'&&!el.querySelector('.hex-region-badge')
    const core=el.querySelector('.region-core,circle')!.getBoundingClientRect(),x=core.x+core.width/2,y=core.y+core.height/2
    const badge=el.querySelector('.hex-region-badge')?.getBoundingClientRect()
    return x>=frame.left&&x<=frame.right&&y>=frame.top&&y<=frame.bottom&&(!badge||(badge.left>=frame.left&&badge.right<=frame.right&&badge.top>=frame.top&&badge.bottom<=frame.bottom))
   })
  })).toBe(true)
  await expect(page.locator('.map-marker-leaders')).toHaveCount(0)
  const select=page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})
  for(const code of width===721?countries:['HK','MO']){
   await chooseOption(select,code)
   await expect(page.getByRole('listbox')).toHaveCount(0)
   await expect(select).toBeFocused()
   await expect(page.locator('.node-card')).toHaveCount(1)
  }
  await chooseOption(select,'all')
  // Wait for the menu's focus restoration before moving focus to a map marker.
  await expect(select).toBeFocused()
  for(const code of ['HK','MO']){
   const group=page.locator(`.map-region-group[data-members*="${code}"]`)
   await group.focus();await page.keyboard.press('Enter')
   await page.getByRole('dialog',{name:'选择地区',exact:true}).getByRole('button',{name:code==='HK'?/香港/:/澳门/}).click()
   await expect(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})).toHaveAttribute('data-value',code)
  }
  expect((await page.locator('.home-region-bar').boundingBox())!.height).toBeLessThanOrEqual(44)
 }
})

for(const countries of [[],['','AQ']])test(`no locatable regions explains the empty map: ${countries.join(',')||'empty'}`,async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:countries.map((country,i)=>({...nodes()[0],id:i+1,country}))}}))
 await page.goto('/')
 await expect(page.locator('.map-empty-state')).toHaveText('暂无可定位的地区信息，仍可在下方查看节点')
 await expect(page.locator('.map-cluster')).toHaveCount(0)
 await expect(page.locator('.node-card')).toHaveCount(countries.length)
})

test('full-card map keeps overlays readable without blocking the empty canvas',async({page})=>{
 for(const width of [721,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/')
  await expect(page.locator('.map-cluster').first()).toBeVisible()
  const frame=page.locator('.map-frame'),stage=frame.locator('.explorer-stage')
  const outer=(await frame.boundingBox())!,canvas=(await stage.boundingBox())!
  expect(Math.abs(canvas.height-outer.height+2)).toBeLessThan(1)
  expect(Math.abs(canvas.width-outer.width+2)).toBeLessThan(1)
  const overlaps=async(selector:string)=>page.locator(selector).evaluateAll(elements=>{
   const blockers=[...document.querySelectorAll('[data-map-overlay]')].map(el=>el.getBoundingClientRect()).filter(r=>r.width&&r.height)
   return elements.some(el=>{const r=el.getBoundingClientRect();return blockers.some(b=>r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top)})
  })
  expect(await overlaps('.hex-region-badge')).toBe(false)
  for(const icon of await page.locator('.map-canvas-controls svg').all()){
   const box=(await icon.boundingBox())!;expect(box.width).toBeLessThanOrEqual(18);expect(box.height).toBeLessThanOrEqual(18)
  }
  for(const marker of await page.locator('.map-cluster').all()){
   await marker.focus();await expect(page.getByRole('tooltip')).toBeVisible()
   expect(await overlaps('[role=tooltip]')).toBe(false)
  }
  await page.keyboard.press('Escape')
  const land=page.locator('.map-land'),before=await land.getAttribute('transform')
  // The empty center of the title row must pass pointer input to the map.
  await page.mouse.move(canvas.x+canvas.width/2,canvas.y+25);await page.mouse.down()
  await page.mouse.move(canvas.x+canvas.width/2+65,canvas.y+30,{steps:5});await page.mouse.up()
  await expect(land).not.toHaveAttribute('transform',before!)
  await page.getByRole('button',{name:'重置地图视图',exact:true}).click()
  await expect(land).toHaveAttribute('transform',before!)
  await page.locator('.map-cluster[data-region=JP] .hex-region-badge').click()
  await expect(page.locator('.map-region-selection')).toBeVisible()
  expect((await frame.boundingBox())!.height).toBe(outer.height)
  expect(await overlaps('.hex-region-badge')).toBe(false)
  await page.getByRole('button',{name:'清除地区筛选',exact:true}).click()
  await expect(page.locator('.map-region-selection')).toHaveCount(0)
 }
})

test('dense fullscreen target stays at the real HK/MO centroid and members remain selectable',async({page})=>{
 const countries=['DE','FR','HK','JP','MO','US']
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:countries.map((country,i)=>({...nodes()[0],id:i+1,country}))}}))
 await page.goto('/')
 await page.getByRole('button',{name:'放大查看',exact:true}).click()
 await expect(page.locator('.is-fullscreen')).toBeVisible()
 const {readFileSync}=await import('node:fs')
 const {points}=JSON.parse(readFileSync('src/data/map-flat.json','utf8'))
 const group=page.locator('.map-region-group[data-members="HK,MO"]')
 await expect(group).toBeVisible()
 const distance=await group.evaluate((el,point)=>{
  const m=(document.querySelector('.map-land') as SVGGraphicsElement).getScreenCTM()!
  const anchor=new DOMPoint(point[0],point[1]).matrixTransform(m)
  const core=el.querySelector('circle')!.getBoundingClientRect()
  return Math.hypot(anchor.x-core.x-core.width/2,anchor.y-core.y-core.height/2)
 },[(points.HK[0]+points.MO[0])/2,(points.HK[1]+points.MO[1])/2])
 expect(distance).toBeLessThan(.1)
 await group.focus();await page.keyboard.press(' ')
 const chooser=page.getByRole('dialog',{name:'选择地区',exact:true})
 await expect(chooser).toBeVisible();await chooser.getByRole('button',{name:/澳门/}).click()
 await expect(page.locator('.node-card')).toHaveCount(1)
 const select=page.locator('.is-fullscreen').getByRole('combobox',{name:'地区',exact:true})
 await expect(select).toHaveAttribute('data-value','MO')
})
