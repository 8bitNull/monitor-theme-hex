import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
test.use({reducedMotion:'no-preference',launchOptions:{args:['--enable-unsafe-swiftshader']}})
test('21-node overview uses a compact region menu and aligned map tools',async({page})=>{
 const countries=['DE','DE','DE','FR','HK','HK','JP','JP',...Array(12).fill('US'),'']
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:countries.map((country,i)=>({...nodes()[0],id:i+1,country,name:`Demo ${i+1}`}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/')
 const menu=page.getByRole('combobox',{name:'地图地区',exact:true})
 await expect(menu).toBeVisible()
 await expect(page.locator('.region-atlas')).toHaveAttribute('data-webgl','true')
 for(const width of [1180,1440,1920]){
  await page.setViewportSize({width,height:1000})
  const bounds=await page.locator('.map-frame').evaluate(el=>{
   const box=(s:string)=>el.querySelector(s)!.getBoundingClientRect()
   const title=box('.home-map-heading'),regions=box('.map-region-dropdown'),layers=box('.map-layer-buttons'),expand=box('.map-expand'),panel=el.getBoundingClientRect()
   return {fits:title.right<=regions.left&&regions.right<=layers.left&&layers.right<=expand.left,inside:regions.left>=panel.left&&expand.right<=panel.right}
  })
  expect(bounds).toEqual({fits:true,inside:true})
 }
 await page.setViewportSize({width:1440,height:1000})
 await page.locator('.map-frame').screenshot({path:'artifacts/map-design-alignment-21.png'})
 await menu.click();await expect(page.getByRole('option')).toHaveCount(7)
 await page.getByRole('option').and(page.locator('[data-value="US"]')).click()
 await expect(page.locator('.node-card')).toHaveCount(12)
 await page.getByRole('button',{name:'放大查看',exact:true}).click()
 await expect(page.locator('.region-atlas')).toHaveClass(/is-fullscreen/)
 await page.getByRole('button',{name:'退出全屏',exact:true}).click()
 await expect(menu).toHaveAttribute('data-value','US')
 await page.setViewportSize({width:1440,height:1000})
 await page.locator('.map-frame').screenshot({path:'artifacts/map-design-alignment-selected.png'})
})
