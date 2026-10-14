import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'
import {chooseOption} from './select'
async function fixture(page:Page){
 const base=nodes()[0],countries=['HK','HK','JP','MO','DE','US','FR']
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:countries.map((country,i)=>({...base,id:i+1,name:`Layer ${i+1} ${country}`,country,online:i!==4,metrics:i===5?null:{...base.metrics,net_tx:0,net_rx:0}}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{const id=Number(new URL(r.request().url()).pathname.split('/')[3]);return r.fulfill({json:{ping:[{task_id:1,ts:Date.now()/1000-(id===6?150:0),latency:id===2?null:id===3?350:id===4?200:20,loss:id===7?4:0},{task_id:2,ts:Date.now()/1000,latency:20,loss:0}],probes:{1:'Current route',2:'Healthy route'},loss:{1:42,2:42}}})})
}
test.use({hasTouch:true,launchOptions:async({browserName},applyLaunchOptions)=>{
 await applyLaunchOptions(browserName==='chromium'?{args:['--enable-unsafe-swiftshader']}:{})
}})
const layers=(page:Page)=>page.getByRole('group',{name:'地图图层',exact:true})
const quick=(page:Page,name:string)=>page.getByRole('group',{name:'地区速选',exact:true}).getByRole('button',{name:new RegExp(name)})
for(const appearance of ['dark','light'])for(const reducedMotion of ['reduce','no-preference'] as const)test(`selected probe alert leaves online core visible ${appearance} ${reducedMotion}`,async({page})=>{
 await page.emulateMedia({reducedMotion})
 await page.addInitScript(appearance=>localStorage.setItem('monitor-next',JSON.stringify({appearance})),appearance)
 await fixture(page);await page.goto('/')
 await layers(page).getByRole('button',{name:'探测',exact:true}).click();await quick(page,'日本').click()
 const map=page.locator('.region-atlas'),marker=map.locator('.map-cluster[data-region=JP]')
 await expect(map).toHaveAttribute('data-theme',appearance)
 await expect(marker).toHaveAttribute('aria-pressed','true');await expect(marker).toHaveAttribute('data-probe-quality','high')
 await expect(marker.locator('.map-probe-alert')).toHaveCSS('fill','none')
 await expect(marker.locator('.region-core')).toHaveCSS('fill',appearance==='dark'?'rgb(74, 222, 128)':'rgb(34, 153, 102)')
 await expect(marker.locator('.map-probe-alert')).toHaveCSS('stroke',appearance==='dark'?'rgb(230, 142, 154)':'rgb(184, 62, 80)')
 await expect(map).toHaveAttribute('data-webgl',String(reducedMotion==='no-preference'))
})
test('current severity colors the reading while historical loss stays muted',async({page})=>{
 await fixture(page);await page.goto('/')
 for(const [region,node,state] of [['日本','Layer 3 JP','high'],['香港','Layer 2 HK','timeout'],['澳门','Layer 4 MO','slow'],['法国','Layer 7 FR','loss']]){
  await quick(page,region).click()
  const row=page.getByRole('region',{name:'地区详情',exact:true}).getByRole('button',{name:`查看 ${node}`,exact:true})
  await expect(row).toHaveAttribute('data-quality',state)
  const colors=await row.evaluate(el=>[el.querySelector('span:not([class])')!,el.querySelector('.map-detail-quality')!,el.querySelector('.map-detail-history')!].map(span=>getComputedStyle(span).color))
  expect(colors[1]).not.toBe(colors[0]);expect(colors[2]).toBe(colors[0])
  await expect(row.locator('.map-detail-history')).toContainText('24h 丢包 42.0%')
 }
})
for(const viewport of [{width:1440,height:1050},{width:1180,height:850}])test(`desktop detail first fold keeps a named reading and obstacle clearance ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await fixture(page);await page.goto('/')
 const map=page.locator('.region-atlas'),initial=(await map.boundingBox())!
 await quick(page,'日本').click()
 const detail=page.getByRole('region',{name:'地区详情',exact:true}),row=detail.getByRole('button',{name:'查看 Layer 3 JP',exact:true})
 await expect(row).toContainText('高延迟 · 350.0 ms')
 await expect.poll(()=>detail.evaluate(el=>{
  const scroll=el.querySelector('.map-detail-scroll')!,reading=el.querySelector('.map-detail-nodes button .map-detail-quality')!
  return reading.getBoundingClientRect().bottom<=scroll.getBoundingClientRect().bottom&&scroll.scrollTop===0
 })).toBe(true)
 const evidence=await detail.evaluate(el=>{
  const rect=(selector:string)=>document.querySelector(selector)!.getBoundingClientRect().toJSON()
  const scroll=el.querySelector('.map-detail-scroll')!
  return {card:el.getBoundingClientRect().toJSON(),scroll:scroll.getBoundingClientRect().toJSON(),reading:rect('.map-detail-nodes button .map-detail-quality'),name:rect('.map-detail-nodes button strong'),tools:rect('.map-layer-tools'),zoom:rect('.map-canvas-controls'),core:rect('.map-cluster[data-region=JP] .region-core'),overflow:getComputedStyle(scroll).overflowY,scrollHeight:scroll.scrollHeight}
 })
 console.log('detail first-fold bounds',JSON.stringify({viewport,...evidence}))
 expect(evidence.name.top).toBeGreaterThanOrEqual(evidence.scroll.top)
 expect(evidence.tools.bottom).toBeLessThanOrEqual(evidence.card.top)
 expect(evidence.card.bottom).toBeLessThanOrEqual(evidence.zoom.top)
 const a=evidence.card,b=evidence.core
 expect(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top).toBe(true)
 expect(evidence.overflow).toBe('auto');expect(evidence.scrollHeight).toBeGreaterThan(evidence.scroll.height)
 expect((await map.boundingBox())!.height).toBe(initial.height)
 const camera=await page.locator('.map-land').getAttribute('transform')
 await detail.locator('.map-detail-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight})
 await expect(page.locator('.map-land')).toHaveAttribute('transform',camera!)
})
test('fullscreen compact details remain bounded and show a named current reading',async({page})=>{
 await fixture(page);await page.goto('/');await quick(page,'日本').click()
 await page.getByRole('button',{name:'放大查看',exact:true}).click()
 const map=page.locator('.region-atlas'),detail=page.getByRole('region',{name:'地区详情',exact:true})
 await expect(map).toHaveClass(/is-fullscreen/)
 await expect(detail.getByRole('button',{name:'查看 Layer 3 JP',exact:true})).toContainText('高延迟 · 350.0 ms')
 const bounds=await detail.evaluate(el=>({card:el.getBoundingClientRect().toJSON(),tools:document.querySelector('.map-layer-tools')!.getBoundingClientRect().toJSON(),scroll:el.querySelector('.map-detail-scroll')!.getBoundingClientRect().toJSON(),reading:el.querySelector('.map-detail-nodes button .map-detail-quality')!.getBoundingClientRect().toJSON(),map:document.querySelector('.region-atlas')!.getBoundingClientRect().toJSON()}))
 expect(bounds.reading.bottom).toBeLessThanOrEqual(bounds.scroll.bottom);expect(bounds.card.top).toBeGreaterThanOrEqual(bounds.tools.bottom);expect(bounds.card.bottom).toBeLessThan(bounds.map.bottom)
 await page.getByRole('button',{name:'退出全屏',exact:true}).click();await expect(map).not.toHaveClass(/is-fullscreen/)
})
test('desktop layers preserve filters/camera and persistent detail uses full actual region',async({page})=>{
 await page.clock.install()
 await fixture(page);await page.goto('/')
 await expect(layers(page).getByRole('button',{name:'节点',exact:true})).toHaveAttribute('aria-pressed','true')
 const camera=await page.locator('.map-land').getAttribute('transform')
 await layers(page).getByRole('button',{name:'流量',exact:true}).click()
 await expect(page.locator('.region-atlas')).toHaveAttribute('data-layer','traffic')
 await expect(page.locator('.map-canvas-controls output')).toContainText('130%')
 await expect(page.locator('.map-land')).toHaveAttribute('transform',camera!)
 await quick(page,'香港').click()
 const detail=page.getByRole('region',{name:'地区详情',exact:true})
 await expect(detail).toContainText('香港');await expect(detail).toContainText('2 / 2 在线')
 await expect(detail.getByRole('button',{name:'查看 Layer 1 HK',exact:true})).toBeVisible()
 await page.getByRole('group',{name:'地图状态',exact:true}).getByRole('button',{name:'探测异常',exact:true}).click()
 await expect(page.locator('.node-card')).toHaveCount(1);await expect(detail).toContainText('2 / 2 在线')
 await layers(page).getByRole('button',{name:'探测',exact:true}).click();await expect(detail).toContainText('香港')
 await detail.getByRole('button',{name:'关闭地区详情',exact:true}).focus();await page.keyboard.press('Escape');await expect(detail).toHaveCount(0)
 await expect(page.getByRole('group',{name:'地图状态',exact:true}).getByRole('button',{name:'探测异常',exact:true})).toHaveAttribute('aria-pressed','true')
 await quick(page,'日本').click();await detail.getByRole('button',{name:'查看 Layer 3 JP',exact:true}).click();await expect(page).toHaveURL(/node\/3/)
 const other:string[]=[];page.on('request',r=>{if(/\/nodes\/1\/metrics\?/.test(r.url()))other.push(r.url())})
 await page.clock.fastForward(65000);expect(other).toEqual([])
})
test('abnormal cycle uses current mapped quality and follows selected route',async({page})=>{
 await fixture(page);await page.goto('/')
 const abnormal=page.getByRole('button',{name:'异常地区 4',exact:true})
 await expect(abnormal).toBeEnabled()
 for(const name of ['香港','日本','法国','澳门','香港']){await abnormal.click();await expect(page.getByRole('region',{name:'地区详情',exact:true})).toContainText(name)}
 await chooseOption(page.getByRole('combobox',{name:'节点探测线路',exact:true}),'2')
 await expect(page.getByRole('button',{name:'异常地区 3',exact:true})).toBeEnabled()
 await expect(page.getByRole('region',{name:'地区详情',exact:true})).toContainText('探测异常 0')
})
for(const viewport of [{width:320,height:568},{width:667,height:375}])test(`mobile sheet layers keep three nav and touch targets ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await fixture(page);await page.goto('/?page=map')
 await page.getByRole('slider',{name:'节点面板高度'}).focus();await page.keyboard.press('End')
 await layers(page).getByRole('button',{name:'探测',exact:true}).click();await expect(page.locator('.mm-canvas')).toHaveAttribute('data-layer','probe')
 for(const button of await layers(page).getByRole('button').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
 await expect(page.locator('.mm-nav button')).toHaveCount(3)
 await page.getByRole('button',{name:'异常地区 4',exact:true}).click();await expect(page.locator('.mm-sheet')).toHaveAttribute('data-state','half')
 await expect(page.locator('.mm-region-title')).toContainText('香港');await expect(page.locator('.mm-traffic-summary')).toContainText('2 / 2 在线')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('probe layer refreshes expiry offscreen without applying the probe filter',async({page})=>{
 await page.clock.install();const fixed=Date.now()/1000,base=nodes()[0]
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...base,id:101,name:'Expiry layer',country:'HK'}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{ping:[{task_id:1,ts:fixed,latency:350,loss:0}],probes:{1:'Current route'},loss:{1:42}}}))
 await page.goto('/');await layers(page).getByRole('button',{name:'探测',exact:true}).click()
 await expect(page.getByRole('button',{name:'异常地区 1',exact:true})).toBeEnabled()
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await page.clock.fastForward(130000)
 await expect(page.getByRole('button',{name:'异常地区 0',exact:true})).toBeDisabled()
 await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.map-cluster[data-region=HK]')).toHaveAttribute('data-probe-quality','unknown')
})
test('selected live region disappears permanently without restoring old focus',async({page})=>{
 const base=nodes()[0],initial=[{...base,id:1,name:'Live layer JP',country:'JP'}]
 let current=initial,publish!:(list:typeof initial)=>void
 await fixture(page);await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:current}}))
 await page.routeWebSocket('**/api/ws',socket=>{publish=list=>{current=list;socket.send(JSON.stringify({nodes:list}))}})
 await page.goto('/');await quick(page,'日本').click()
 const detail=page.getByRole('region',{name:'地区详情',exact:true})
 await detail.getByRole('button',{name:'查看 Live layer JP',exact:true}).focus()
 publish([]);await expect(detail).toHaveCount(0)
 publish(initial);await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(detail).toHaveCount(0)
 await expect(page.getByRole('button',{name:'重置地图视图',exact:true})).not.toBeFocused()
})
test('desktop detail remains pinned on hover and updates without taking focus',async({page})=>{
 await fixture(page);await page.goto('/')
 await page.locator('.map-cluster[data-region=JP]').focus();await page.keyboard.press('Enter')
 const detail=page.getByRole('region',{name:'地区详情',exact:true})
 await expect(detail).toContainText('日本')
 await page.locator('.map-cluster[data-region=US] .region-core').hover()
 await expect(page.getByRole('tooltip')).toContainText('美国');await expect(detail).toContainText('日本')
 const close=detail.getByRole('button',{name:'关闭地区详情',exact:true});await close.focus()
 await layers(page).getByRole('button',{name:'流量',exact:true}).click()
 await expect(layers(page).getByRole('button',{name:'流量',exact:true})).toBeFocused()
 const tool=(await page.locator('.map-layer-tools').boundingBox())!,box=(await detail.boundingBox())!,zoom=(await page.locator('.map-canvas-controls').boundingBox())!
 expect(tool.y+tool.height).toBeLessThanOrEqual(box.y)
 expect(box.y+box.height).toBeLessThanOrEqual(zoom.y)
 const camera=await page.locator('.map-land').getAttribute('transform')
 await close.click();await expect(detail).toHaveCount(0);await expect(page.locator('.map-land')).toHaveAttribute('transform',camera!)
})
for(const viewport of [{width:320,height:568},{width:667,height:375}])test(`English mobile sheet scrolling and tools ${viewport.width}`,async({page})=>{
 await page.setViewportSize(viewport);await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'));await fixture(page);await page.goto('/?page=map')
 await page.getByRole('slider',{name:'Node panel height'}).focus();await page.keyboard.press('End')
 const controls=page.getByRole('group',{name:'Map layers',exact:true})
 await controls.getByRole('button',{name:'Traffic',exact:true}).tap()
 const camera=await page.locator('.mm-land').getAttribute('transform')
 await page.locator('.mm-sheet-content').hover();await page.mouse.wheel(0,400)
 await expect(page.locator('.mm-land')).toHaveAttribute('transform',camera!)
 await controls.getByRole('button',{name:'Probe',exact:true}).click()
 await expect(page.locator('.mm-canvas')).toHaveAttribute('data-layer','probe')
 await expect(page.getByRole('group',{name:'World node distribution map',exact:true})).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await expect(page.locator('.mm-nav button')).toHaveCount(3)
})
