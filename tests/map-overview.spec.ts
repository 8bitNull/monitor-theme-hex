import {chooseOption} from './select'
import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'

test('overview uses one persistent region selector including unknown regions',async({page})=>{
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().slice(0,3).map((n,i)=>({...n,country:i===0?'JP':i===1?'US':''}))}}))
 await page.goto('/')
 const map=page.locator('.region-atlas'),select=page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})
 await expect(map).toBeVisible()
 await expect(page.locator('.map-status-sidebar,.home-region-list')).toHaveCount(0)
 await expect(page.getByRole('button',{name:'放大地图',exact:true})).toHaveCount(0)
 await chooseOption(select,'unknown');await expect(page.locator('.node-card')).toHaveCount(1)
 await page.getByRole('button',{name:'收起地图',exact:true}).click()
 await expect(map).toHaveCount(0);await expect(select).toHaveAttribute('data-value','unknown')
 await chooseOption(select,'all');await expect(page.locator('.node-card')).toHaveCount(3)
 await page.getByRole('button',{name:'展开地图',exact:true}).click()
 const jp=page.locator('.map-cluster[data-region="JP"]')
 await jp.focus();await expect(page.getByRole('tooltip')).toContainText('日本')
 await expect(page.getByRole('tooltip')).toContainText('1 / 1')
 await jp.press('Enter');await expect(select).toHaveAttribute('data-value','JP');await expect(page.locator('.node-card')).toHaveCount(1)
})

test('overview ignores navigation gestures and expanded view restores overview framing',async({page})=>{
 await page.goto('/')
 const land=page.locator('.map-land'),svg=page.getByLabel('世界节点分布地图',{exact:true})
 await expect(land).toBeVisible();const initial=await land.getAttribute('transform')
 await svg.focus();await page.keyboard.press('+');await expect(land).toHaveAttribute('transform',initial!)
 await svg.hover();await page.keyboard.down('Control');await page.mouse.wheel(0,-200);await page.keyboard.up('Control')
 await expect(land).toHaveAttribute('transform',initial!)
 const b=(await svg.boundingBox())!;await page.mouse.move(b.x+30,b.y+50);await page.mouse.down();await page.mouse.move(b.x+160,b.y+90,{steps:5});await page.mouse.up()
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
 expect(await page.locator('.region-atlas').evaluate(el=>el.getBoundingClientRect().height)).toBe(240)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('late located data frames once and refresh preserves the overview and stale filter',async({page})=>{
 let country=''
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],country}]}}))
 await page.goto('/')
 const land=page.locator('.map-land'),select=page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})
 await expect(land).toBeVisible()
 await expect(page.locator('.map-cluster')).toHaveCount(0)
 await expect(page.locator('.map-empty-state')).toContainText('暂无可定位的地区信息')
 country='JP'
 await expect(page.locator('.map-cluster[data-region=JP]')).toHaveCount(1,{timeout:10000})
 await expect(land).toHaveAttribute('transform',/scale\(2\)/)
 await expect(page.locator('.map-empty-state')).toHaveCount(0)
 const initial=await land.getAttribute('transform')
 await chooseOption(select,'JP')
 country='DE'
 await expect(page.locator('.map-cluster[data-region=DE]')).toHaveCount(1,{timeout:10000})
 await expect(land).toHaveAttribute('transform',initial!)
 await expect(select).toHaveAttribute('data-value','JP');await expect(select).toContainText('0')
 await chooseOption(select,'all');await expect(page.locator('.node-card')).toHaveCount(1)
})

test('fullscreen rejection leaves a usable overview and explanation',async({page})=>{
 await page.addInitScript(()=>{Element.prototype.requestFullscreen=()=>Promise.reject(new Error('Unavailable'))})
 await page.goto('/');await page.getByRole('button',{name:'放大查看',exact:true}).click()
 await expect(page.locator('.map-open-error')).toHaveText('无法打开全屏，请使用支持全屏的浏览器。')
 await expect(page.getByRole('button',{name:'收起地图',exact:true})).toBeVisible()
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
 const countries=['US','JP','HK','MO','SG','DE','FR','GB','NL','BE','CH','AT','IT','ES','PT','PL','CZ','DK','SE','NO','FI','IE','LU','LI','MC','NZ','ZA']
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:countries.map((country,i)=>({...nodes()[0],id:i+1,country}))}}))
 await page.goto('/')
 for(const width of [721,1440,1920]){
  await page.setViewportSize({width,height:1000});await expect(page.locator('.map-cluster')).toHaveCount(countries.length)
  await expect.poll(async()=>page.locator('.map-cluster').evaluateAll(elements=>{
   const frame=elements[0].closest('.explorer-stage')!.getBoundingClientRect()
   return elements.every(el=>{const r=el.getBoundingClientRect();return r.left>=frame.left&&r.right<=frame.right&&r.top>=frame.top&&r.bottom<=frame.bottom})
  })).toBe(true)
  await expect(page.locator('.map-marker-leaders')).toHaveCount(0)
  const select=page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})
  for(const code of width===721?countries:['HK','MO']){await chooseOption(select,code);await expect(page.locator('.node-card')).toHaveCount(1)}
  await chooseOption(select,'all')
  for(const code of ['HK','MO']){
   await page.locator(`.map-cluster[data-region="${code}"]`).focus()
   await page.keyboard.press("Enter")
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

test('integrated map controls preserve compact height and safe marker space',async({page})=>{
 for(const width of [721,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/')
  await expect(page.locator('.map-cluster').first()).toBeVisible()
  const frame=page.locator('.map-frame'),bar=page.locator('.home-region-bar')
  expect((await frame.boundingBox())!.height).toBe(240)
  const header=(await bar.boundingBox())!
  for(const marker of await page.locator('.map-cluster').all()){
   expect((await marker.boundingBox())!.y).toBeGreaterThanOrEqual(header.y+header.height)
   await marker.focus()
   expect((await page.getByRole('tooltip').boundingBox())!.y).toBeGreaterThanOrEqual(header.y+header.height)
  }
  await page.getByRole('button',{name:'收起地图',exact:true}).click()
  await expect(page.getByRole('button',{name:'展开地图',exact:true})).toBeVisible()
  expect((await frame.boundingBox())!.height).toBeLessThanOrEqual(44)
  await page.getByRole('button',{name:'展开地图',exact:true}).click()
 }
})

test('Macau marker remains on its projected coordinate in fullscreen',async({page})=>{
 const countries=['DE','FR','HK','JP','MO','US']
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:countries.map((country,i)=>({...nodes()[0],id:i+1,country}))}}))
 await page.goto('/')
 await page.getByRole('button',{name:'放大查看',exact:true}).click()
 await expect(page.locator('.is-fullscreen')).toBeVisible()
 const {readFileSync}=await import('node:fs')
 const {points}=JSON.parse(readFileSync('src/data/map-paths.json','utf8'))
 for(const code of ['HK','MO']){
  const distance=await page.locator(`.map-cluster[data-region="${code}"]`).evaluate((el,point)=>{
   const m=(document.querySelector('.map-land') as SVGGraphicsElement).getScreenCTM()!
   const anchor=new DOMPoint(point[0],point[1]).matrixTransform(m)
   const core=el.querySelector('.region-core')!.getBoundingClientRect()
   return Math.hypot(anchor.x-core.x-core.width/2,anchor.y-core.y-core.height/2)
  },points[code])
  expect(distance).toBeLessThan(.1)
 }
 const select=page.locator('.is-fullscreen').getByRole('combobox',{name:'地区',exact:true})
 await chooseOption(select,'MO');await expect(select).toHaveAttribute('data-value','MO')
})
