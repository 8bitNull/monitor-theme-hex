import {test,expect} from './desktopTest'
test('persistent map remains compact with fullscreen viewing',async({page})=>{
 await page.goto('/')
 const frame=page.locator('.map-frame')
 for(const width of [721,900,1440]){
  await page.setViewportSize({width,height:900})
  await expect(frame.locator('.map-land')).toBeVisible()
  await expect(frame.getByRole('button',{name:'放大查看',exact:true})).toBeVisible()
  await expect(frame.locator('.home-map-toggle')).toHaveCount(0)
  await expect(frame.locator('.map-tools,.map-scale')).toHaveCount(0)
  expect(await frame.locator('.region-atlas').evaluate(el=>el.getBoundingClientRect().height)).toBe(215)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await page.reload();await expect(frame.locator('.map-land')).toBeVisible()
})

test('old collapsed preference does not override current map preference',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('monitor-next-map-open-v1','closed');localStorage.setItem('monitor-next-map-height-v1','compact')})
 await page.goto('/');await expect(page.locator('.region-atlas')).toBeVisible()
 await page.reload()
 await expect(page.locator('.region-atlas')).toBeVisible()
 await expect(page.locator('.home-map-toggle')).toHaveCount(0)
 await expect(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})).toBeVisible()
})

test('expanded map supports zoom pan world view and keyboard region selection',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'放大查看',exact:true}).click()
 const map=page.locator('.region-atlas'),land=map.locator('.map-land'),svg=map.locator('.explorer-stage>svg')
 await page.getByRole('button',{name:'查看全部',exact:true}).click();await expect(map.locator('.map-scale')).toHaveText('100%')
 await page.getByRole('button',{name:'放大地图',exact:true}).click();await expect(map.locator('.map-scale')).toHaveText('130%')
 await svg.focus();await page.keyboard.press('ArrowRight');await expect(land).not.toHaveAttribute('transform','translate(-150 -72) scale(1.3)')
 const before=await land.getAttribute('transform');const box=(await svg.boundingBox())!
 await page.mouse.move(box.x+40,box.y+100);await page.mouse.down();await page.mouse.move(box.x+160,box.y+110,{steps:5});await page.mouse.up()
 await expect(land).not.toHaveAttribute('transform',before!)
 await page.getByRole('button',{name:'查看全部',exact:true}).click()
 const jp=map.locator('.map-cluster[data-region="JP"]');await jp.focus();await expect(map.getByRole('tooltip')).toContainText('日本');await jp.press('Enter')
 await expect(map.getByRole('combobox',{name:'地区',exact:true})).toHaveAttribute('data-value','JP')
 await page.getByRole('button',{name:'退出全屏',exact:true}).click();await expect(page.locator('.node-card')).toHaveCount(1)
 await page.setViewportSize({width:390,height:844});await expect(map).toHaveCount(0)
 await expect(page.getByRole('button',{name:'筛选节点',exact:true})).toBeVisible()
})
