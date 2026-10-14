import {test,expect} from '@playwright/test'

test('clicking the map background leaves no browser outline and keyboard navigation still works',async({page})=>{
 await page.goto('/')
 const svg=page.getByLabel('世界节点分布地图',{exact:true})
 await expect(svg).toBeVisible()
 const box=(await svg.boundingBox())!
 await page.mouse.click(box.x+12,box.y+box.height/2)
 await expect(svg).toBeFocused()
 await expect(svg).toHaveCSS('outline-style','none')
 const land=page.locator('.map-land'),before=await land.getAttribute('transform')
 await svg.press('ArrowRight')
 await expect(land).not.toHaveAttribute('transform',before!)
})

test('homepage canvas can pan beyond the map without filtering and resets without moving layout',async({page})=>{
 await page.goto('/')
 const svg=page.getByLabel('世界节点分布地图',{exact:true}),land=page.locator('.map-land')
 await expect(svg).toBeVisible()
 await expect(page.locator('.map-canvas-controls output')).toHaveText('130%')
 await expect.poll(()=>svg.evaluate(el=>{
  const r=el.getBoundingClientRect()
  return Math.abs(el.viewBox.baseVal.height-1000*r.height/r.width)
 })).toBeLessThan(.001)
 const before=await land.getAttribute('transform'),box=(await svg.boundingBox())!
 const center=await land.evaluate(el=>new DOMPoint(500,180).matrixTransform((el as SVGGraphicsElement).getScreenCTM()!).toJSON())
 expect(Math.abs(center.x-box.x-box.width/2)).toBeLessThan(.1)
 expect(Math.abs(center.y-box.y-box.height/2)).toBeLessThan(.1)
 const count=await page.locator('.node-card').count()
 await page.mouse.move(box.x+12,box.y+box.height/2);await page.mouse.down()
 await page.mouse.move(box.x+box.width-12,box.y+box.height/2,{steps:8});await page.mouse.up()
 await expect(land).not.toHaveAttribute('transform',before!)
 await expect(page.locator('.node-card')).toHaveCount(count)
 await page.getByRole('button',{name:'重置地图视图',exact:true}).click()
 await expect(land).toHaveAttribute('transform',before!)
 expect((await page.locator('.region-atlas').boundingBox())!.height).toBeCloseTo((await page.locator('.map-frame').boundingBox())!.height-2,0)
 await page.locator('.map-cluster[data-region=JP] .hex-region-badge').click()
 await expect(page.locator('.node-card')).toHaveCount(1)
})

test('ordinary wheel scrolls the page and zooming a country keeps its geographic core anchored',async({page})=>{
 await page.setViewportSize({width:1440,height:700})
 await page.goto('/')
 const svg=page.getByLabel('世界节点分布地图',{exact:true}),land=page.locator('.map-land')
 await expect(svg).toBeVisible()
 await expect(page.locator('.node-card')).toHaveCount(6)
 await expect.poll(()=>svg.evaluate(el=>{
  const r=el.getBoundingClientRect()
  return Math.abs(el.viewBox.baseVal.height-1000*r.height/r.width)
 })).toBeLessThan(.001)
 const before=await land.getAttribute('transform'),box=(await svg.boundingBox())!
 const scroll=await page.evaluate(()=>window.scrollY)
 await page.mouse.move(box.x+12,box.y+box.height/2);await page.mouse.wheel(0,100)
 await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBeGreaterThan(scroll)
 await expect(land).toHaveAttribute('transform',before!)
 await page.getByRole('button',{name:'放大地图',exact:true}).click()
 await expect(land).not.toHaveAttribute('transform',before!)
 await page.getByRole('button',{name:'重置地图视图',exact:true}).click()
 await page.locator('.map-cluster[data-region=JP] .hex-region-badge').dblclick()
 await expect(land).not.toHaveAttribute('transform',before!)
 await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.map-cluster[data-region=JP]')).toHaveAttribute('aria-pressed','true')
 const center=await page.locator('.map-cluster[data-region=JP] .region-core').boundingBox()
 const stage=(await svg.boundingBox())!
 expect(Math.abs(center!.x+center!.width/2-stage.x-stage.width/2)).toBeLessThan(2)
 expect(Math.abs(center!.y+center!.height/2-stage.y-stage.height/2)).toBeLessThan(2)
 // Countries outside the canvas do not sprout labels at the nearest edge.
 await expect(page.locator('.map-cluster[data-region=US] .hex-region-badge')).toHaveCount(0)
})

test('fullscreen exploration returns to the prior homepage canvas view',async({page})=>{
 await page.goto('/')
 await page.getByRole('button',{name:'放大地图',exact:true}).click()
 await expect(page.locator('.map-canvas-controls output')).toHaveText('169%')
 const land=page.locator('.map-land'),before=await land.getAttribute('transform')
 await page.getByRole('button',{name:'放大查看',exact:true}).click()
 await expect(page.locator('.is-fullscreen')).toBeVisible()
 await page.getByRole('button',{name:'放大地图',exact:true}).click()
 await page.getByRole('button',{name:'退出全屏',exact:true}).click()
 await expect(land).toHaveAttribute('transform',before!)
})

test('offscreen markers leave the Tab order and never display detached tooltips',async({page})=>{
 await page.goto('/')
 const svg=page.getByLabel('世界节点分布地图',{exact:true}),jp=page.locator('.map-cluster[data-region=JP]')
 await expect(jp).toHaveAttribute('tabindex','0')
 await jp.focus();await expect(page.getByRole('tooltip')).toBeVisible()
 await page.getByRole('button',{name:'放大地图',exact:true}).click()
 await expect(page.locator('.map-canvas-controls output')).toHaveText('169%')
 await svg.focus()
 for(let i=0;i<30;i++)await svg.press('ArrowLeft')
 await expect(jp).toHaveAttribute('tabindex','-1')
 await expect(jp).toHaveAttribute('aria-hidden','true')
 await expect(page.getByRole('tooltip')).toHaveCount(0)
 await page.getByRole('button',{name:'重置地图视图',exact:true}).click()
 await expect(jp).toHaveAttribute('tabindex','0')
 await jp.focus();await expect(page.getByRole('tooltip')).toContainText('日本')
})

test('Ctrl wheel zooms around the pointer without scrolling the document',async({page})=>{
 await page.goto('/')
 const svg=page.getByLabel('世界节点分布地图',{exact:true}),land=page.locator('.map-land')
 await expect(svg).toBeVisible()
 // WheelEvent client coordinates are integer pixels; measure that same anchor.
 const box=(await svg.boundingBox())!,x=Math.round(box.x+box.width*.65),y=Math.round(box.y+box.height*.6)
 const read=()=>land.evaluate((el,p)=>{
  const m=(el as SVGGraphicsElement).getScreenCTM()!.inverse()
  const anchor=new DOMPoint(p.x,p.y).matrixTransform(m)
  return {x:anchor.x,y:anchor.y,scroll:window.scrollY}
 },{x,y})
 const before=await read()
 await page.mouse.move(x,y);await page.keyboard.down('Control');await page.mouse.wheel(0,-180);await page.keyboard.up('Control')
 await expect(page.locator('.map-canvas-controls output')).not.toHaveText('130%')
 const after=await read()
 expect(Math.abs(after.x-before.x)).toBeLessThan(.1)
 expect(Math.abs(after.y-before.y)).toBeLessThan(.1)
 expect(after.scroll).toBe(before.scroll)
})
