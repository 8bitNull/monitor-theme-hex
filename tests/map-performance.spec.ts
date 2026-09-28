import {chooseOption} from './select'
import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'

test('enabled map loads while node data is pending',async({page})=>{
 let finish!:()=>void;const pending=new Promise<void>(resolve=>finish=resolve);let mapRequested=false,detailRequested=false
 page.on('request',r=>{if(r.url().includes('/WorldMap-'))mapRequested=true;if(r.url().includes('/NodeDetail-'))detailRequested=true})
 await page.route('**/api/nodes',async r=>{await pending;await r.fulfill({json:{nodes:nodes()}})})
 await page.goto('/');await expect(page.locator('.home-region-bar')).toBeVisible()
 await expect.poll(()=>mapRequested).toBe(true);expect(detailRequested).toBe(false)
 await expect(page.getByText('等待节点数据',{exact:true})).toBeVisible()
 await expect(page.locator('.map-frame .explorer-map')).toBeVisible()
 await expect(page.locator('.region-atlas')).toBeVisible()
 await expect(page.locator('.map-empty-state')).toHaveCount(0)
 finish();await expect(page.locator('.node-card')).toHaveCount(6);await expect(page.locator('.region-atlas')).toBeVisible()
})

test('slow map keeps filters and view switching usable without layout jump',async({page})=>{
 await page.clock.install();let finish!:()=>void;const pending=new Promise<void>(resolve=>finish=resolve)
 await page.route('**/assets/WorldMap-*.js',async r=>{await pending;await r.continue()})
 await page.goto('/');const mapFrame=page.locator('.map-frame');await expect(page.locator('.home-region-bar')).toBeVisible();await expect(mapFrame).toBeVisible()
 await expect(page.locator('.map-placeholder')).toBeVisible();const before=await mapFrame.boundingBox()
 await page.clock.runFor(3100);await expect(page.getByText('地图加载较慢，节点列表仍可使用')).toBeVisible()
 await chooseOption(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true}),'JP');await expect(page.locator('.node-card')).toHaveCount(1)
 await page.locator('.desktop-results-toolbar').getByLabel('表格视图',{exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(1)
 finish();await expect(page.locator('.region-atlas')).toBeVisible();expect((await page.locator('.map-frame').boundingBox())!.height).toBe(before!.height)
 await expect(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})).toHaveAttribute('data-value','JP')
})

test('loading map can collapse while region filters remain available',async({page})=>{
 let finish!:()=>void;const pending=new Promise<void>(resolve=>finish=resolve)
 await page.route('**/assets/WorldMap-*.js',async route=>{await pending;await route.continue()})
 await page.goto('/')
 await expect(page.locator('.map-placeholder')).toBeVisible()
 await page.getByRole('button',{name:'收起地图',exact:true}).click()
 await expect(page.locator('.map-placeholder')).toBeHidden()
 await expect(page.locator('.home-region-bar')).toBeVisible()
 await page.getByRole('button',{name:'展开地图',exact:true}).click()
 await expect(page.locator('.map-fallback-close')).toHaveCount(0)
 finish()
 await expect(page.locator('.region-atlas')).toBeVisible()
 await expect(page.locator('.region-atlas .map-close')).toHaveCount(0)
})

test('missing map chunk is contained and reload recovers while preserving filters',async({page})=>{
 await page.route('**/assets/WorldMap-*.js',r=>r.fulfill({status:404,body:'Not found'}));await page.goto('/')
 await expect(page.locator('.home-region-bar')).toBeVisible()
 await chooseOption(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true}),'JP')
 await expect(page.getByText('地图暂时无法加载',{exact:true})).toBeVisible();await expect(page.locator('.node-card')).toHaveCount(1)
 await page.getByRole('button',{name:'重试地图',exact:true}).click()
 await expect(page.getByText('地图暂时无法加载',{exact:true})).toBeVisible();await expect(page.locator('.node-card')).toHaveCount(1)
 await page.unroute('**/assets/WorldMap-*.js');await page.getByRole('button',{name:'刷新页面',exact:true}).click()
 await expect(page.locator('.region-atlas')).toBeVisible();await expect(page.locator('.node-card')).toHaveCount(1)
})

for(const mode of ['mobile','disabled','detail'])test(`does not fetch map in ${mode}`,async({page})=>{
 let requests=0;page.on('request',r=>{if(r.url().includes('/WorldMap-'))requests++})
 if(mode==='mobile')await page.setViewportSize({width:390,height:844})
 if(mode==='disabled')await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{module_map:false}}))
 await page.goto(mode==='detail'?'/node/1':'/');await expect(page.locator(mode==='detail'?'.node-detail':mode==='mobile'?'.ma-node':'.node-card').first()).toBeVisible();expect(requests).toBe(0)
})

test('metric updates leave geometry untouched; status, zoom and view switching stay current',async({page})=>{
 await page.clock.install();let online=true,cpu=5
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map((n,i)=>i===0?{...n,online,metrics:{...n.metrics,cpu}}:n)}}))
 await page.goto('/');await expect(page.locator('.home-region-bar')).toBeVisible()
 await expect(page.locator('.region-atlas')).toBeVisible()
 await page.locator('.map-land').evaluate(el=>{(window as any).landChanges=0;(window as any).mapLand=el;new MutationObserver(records=>{(window as any).landChanges+=records.length}).observe(el,{attributes:true,subtree:true,childList:true,characterData:true})})
 cpu=80;await page.clock.runFor(5200);expect(await page.evaluate(()=>(window as any).landChanges)).toBe(0)
 online=false;await page.clock.runFor(5200);await expect(page.locator('.map-land [data-region="JP"]')).toHaveAttribute('data-tone','offline')
 await page.getByRole('button',{name:'放大查看',exact:true}).click();await page.getByLabel('放大地图',{exact:true}).click();await page.clock.runFor(32);const scale=await page.locator('.map-scale').innerText()
 await page.locator('.region-atlas').getByLabel('表格视图',{exact:true}).click();await expect(page.locator('.map-scale')).toHaveText(scale);expect(await page.locator('.map-land').evaluate(el=>el===(window as any).mapLand)).toBe(true)
 await page.getByLabel('世界节点分布地图',{exact:true}).focus();await page.keyboard.press('ArrowRight');await page.clock.runFor(32)
 await expect(page.locator('.map-land')).not.toHaveAttribute('transform',/translate\(-363 /)
})

test('network timeout offers recovery without hiding nodes',async({page})=>{
 await page.clock.install();let finish!:()=>void;const pending=new Promise<void>(r=>finish=r)
 await page.route('**/assets/WorldMap-*.js',async route=>{await pending;await route.continue()})
 await page.goto('/');await expect(page.locator('.home-region-bar')).toBeVisible()
 await expect(page.locator('.map-placeholder')).toBeVisible();await page.clock.runFor(15100)
 await expect(page.getByRole('button',{name:'重试地图',exact:true})).toBeVisible();await expect(page.locator('.node-card')).toHaveCount(6)
 finish();await expect(page.locator('.region-atlas')).toBeVisible()
})

test('fullscreen retains view switching and exits cleanly',async({page})=>{
 await page.goto('/');await expect(page.locator('.home-region-bar')).toBeVisible()
 await expect(page.locator('.region-atlas')).toBeVisible()
 await page.getByRole('button',{name:'放大查看',exact:true}).click()
 await expect(page.locator('.region-atlas')).toHaveClass(/is-fullscreen/)
 await page.locator('.region-atlas').getByLabel('表格视图',{exact:true}).click()
 await expect(page.locator('.region-atlas')).toHaveClass(/is-fullscreen/)
 await page.getByLabel('退出全屏',{exact:true}).click()
 await expect(page.locator('.node-table')).toBeVisible()
})
