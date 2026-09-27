import {test,expect} from './desktopTest'
test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next'))localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,infoDensity:'full',modules:{map:true}}))})})

test('expanded map keeps full height with a persistent collapse control',async({page})=>{
 await page.setViewportSize({width:1280,height:900})
 await page.goto('/')
 const map=page.locator('.map-frame'),height=()=>map.locator('.explorer-map').evaluate(element=>element.getBoundingClientRect().height)
 await expect(map.locator('.home-region-bar')).toBeVisible()
 await expect(map.locator('.explorer-map')).toBeVisible()
 await expect(page.locator('.desktop-results-toolbar').getByLabel('卡片视图')).toBeVisible()
 await expect(page.locator('.desktop-results-toolbar').getByLabel('表格视图')).toBeVisible()
 await expect(map.locator('.map-land')).toBeVisible()
 await expect(map.getByRole('button',{name:'收起地图',exact:true})).toBeVisible()
 await expect(map.locator('.map-tools .map-close')).toHaveCount(0)
 for(const width of [721,900,1440]){
  await page.setViewportSize({width,height:900})
  const bar=(await map.locator('.home-region-bar').boundingBox())!
  const tools=(await map.locator('.home-map-tools .map-tools').boundingBox())!
  const regions=(await map.locator('.home-region-list').boundingBox())!
  expect(Math.abs(bar.y+bar.height/2-tools.y-tools.height/2)).toBeLessThan(2)
  const toggle=(await map.locator('.home-map-toggle').boundingBox())!
  expect(tools.x+tools.width).toBeLessThanOrEqual(toggle.x)
  expect(bar.x+bar.width-toggle.x-toggle.width).toBeLessThan(15)
  expect(regions.x+regions.width).toBeLessThanOrEqual(tools.x)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  await map.locator('.home-region-bar').screenshot({path:`tests/artifacts/map-toolbar-row-${width}.png`})
 }
 await page.setViewportSize({width:1280,height:900})
 await page.screenshot({path:'tests/artifacts/map-open-no-toggle.png'})
 await expect(map.locator('.map-height-toggle')).toHaveCount(0)
 expect(await height()).toBe(240)
 await page.reload()
 await expect(map.locator('.explorer-map')).toBeVisible()
 await expect(map.locator('.map-land')).toBeVisible()
 await expect(map.getByRole('button',{name:'收起地图',exact:true})).toBeVisible()
 expect(await height()).toBe(240)
 await page.reload()
 await expect(map.locator('.explorer-map')).toBeVisible()
})

test('old collapsed preference no longer hides an enabled map',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('monitor-next-map-open-v1','closed')
  localStorage.setItem('monitor-next-map-height-v1','compact')
 })
 await page.goto('/')
 const map=page.locator('.map-frame')
 await expect(map.locator('.explorer-map')).toBeVisible()
 await expect(map.getByRole('button',{name:'收起地图',exact:true})).toBeVisible()
 await expect(map.locator('.map-close')).toHaveCount(0)
 expect(await map.locator('.explorer-map').evaluate(el=>el.getBoundingClientRect().height)).toBe(240)
 expect(await page.evaluate(()=>localStorage.getItem('monitor-next-map-open-v1'))).toBe('closed')
})

test('map supports zoom, pan, fit, filtering and fullscreen without stealing page scroll',async({page})=>{
 await page.goto('/')
 const map=page.locator('.explorer-map'),svg=map.locator('.explorer-stage>svg')
 await expect(page.locator('.home-region-bar')).toBeVisible()
 await expect(map.locator('.map-land')).toBeVisible();expect(await map.locator('[data-region][role=button]').count()).toBeGreaterThanOrEqual(6)
 await expect(map.locator('.map-scale')).toHaveText('169%')
 const scale=map.locator('.map-scale'),withinBottomRight=async(maxBottom:number)=>{
  const frame=(await map.boundingBox())!,label=(await scale.boundingBox())!
  expect(frame.x+frame.width-label.x-label.width).toBeLessThanOrEqual(24)
  expect(frame.y+frame.height-label.y-label.height).toBeLessThanOrEqual(maxBottom)
 }
 await withinBottomRight(24)
 await page.getByRole('button',{name:'放大地图',exact:true}).click()
 await expect(map.locator('.map-scale')).toHaveText('220%')
 await svg.hover();await page.mouse.wheel(0,100)
 await expect(map.locator('.map-scale')).toHaveText('220%')
 await page.keyboard.down('Control');await page.mouse.wheel(0,-200);await page.keyboard.up('Control')
 await expect(map.locator('.map-scale')).not.toHaveText('220%')
 await page.getByRole('button',{name:'适配全部',exact:true}).click()
 await expect(map.locator('.map-scale')).toHaveText('100%')
 const box=(await svg.boundingBox())!
 await page.mouse.move(box.x+60,box.y+80);await page.mouse.down();await page.mouse.move(box.x+180,box.y+100,{steps:8});await page.mouse.up()
 await expect(map.locator('.map-land')).not.toHaveAttribute('transform','translate(0 0) scale(1)')
 await expect(page.locator('.node-card')).toHaveCount(6)
 await page.getByRole('button',{name:'适配全部',exact:true}).click()
 const jp=map.locator('.populated-region[data-region="JP"]');await jp.focus();await jp.press('Enter')
 await expect(page.locator('.node-card')).toHaveCount(1)
 await jp.evaluate(element=>(element as SVGPathElement).blur())
 const selectedColors=await map.locator('.map-land').evaluate(land=>{
  const selected=land.querySelector<SVGPathElement>('.populated-region[data-region="JP"]')!
  const other=land.querySelector<SVGPathElement>('.populated-region[data-region="US"]')!
  return {selectedFill:getComputedStyle(selected).fill,otherFill:getComputedStyle(other).fill,selectedStroke:getComputedStyle(selected).stroke,otherStroke:getComputedStyle(other).stroke}
 })
 expect(selectedColors.selectedFill).not.toBe(selectedColors.otherFill)
 expect(selectedColors.selectedStroke).toBe(selectedColors.otherStroke)
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'放大地图',exact:true}).click()
 await expect(map.locator('.map-node-preview')).toContainText('Tokyo')
 await page.getByRole('button',{name:'全屏地图',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBeTruthy()
 await withinBottomRight(80)
 const scaleBox=(await scale.boundingBox())!,switchBox=(await map.locator('.map-view-switch').boundingBox())!
 expect(scaleBox.y+scaleBox.height).toBeLessThan(switchBox.y)
 await map.getByRole('button',{name:'退出全屏',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>!!document.fullscreenElement)).toBeFalsy()
 await page.locator('.home-region-list button').first().click()
 await page.getByRole('button',{name:'适配全部',exact:true}).click()
 await map.screenshot({path:'tests/artifacts/map-desktop.png'})
 for(const width of [390,320]){
  await page.setViewportSize({width,height:900})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  await expect(map).toHaveCount(0)
  await expect(page.getByRole('button',{name:'筛选节点',exact:true})).toBeVisible()
  await expect(page.getByRole('navigation',{name:'主导航'})).toBeVisible()
 }
 await page.screenshot({path:'tests/artifacts/mobile-home.png'})
 await page.setViewportSize({width:1440,height:1000})
 await expect(page.locator('.home-region-bar')).toBeVisible()
 await expect(map).toBeVisible()
})
