import {chooseOption} from './select'
import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'
test.beforeEach(async({page})=>{await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next'))localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,infoDensity:'full',modules:{map:true}}))})})

test('desktop region selector filters cards and tables with maps enabled or disabled',async({page})=>{
 let mapEnabled=true
 await page.route('**/theme-config.json',route=>route.fulfill({json:{modules:{map:mapEnabled}}}))
 await page.route('**/api/themes/hex/config',route=>route.fulfill({status:404}))
 await page.goto('/')
 const selector=page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})
 await chooseOption(selector,'JP');await expect(page.locator('.node-card')).toHaveCount(1)
 await page.locator('.desktop-results-toolbar').getByLabel('表格视图').click();await expect(page.locator('tbody tr')).toHaveCount(1)
 await page.locator('.desktop-results-toolbar').getByLabel('卡片视图').click();await expect(selector).toHaveAttribute('data-value','JP')
 mapEnabled=false;await page.reload()
 await expect(page.locator('.map-frame')).toHaveCount(0);await expect(selector).toHaveAttribute('data-value','JP')
 await chooseOption(selector,'all');await expect(page.locator('.node-card')).toHaveCount(6)
})

test('desktop region selector exposes all regions and retains narrow-screen selection',async({page})=>{
 const countries=['DE','FR','GB','HK','JP','MO','SG','US','CA','AU','NL','BR','']
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:countries.map((country,index)=>({...nodes()[0],id:index+1,country,name:country||'Unknown'}))}}))
 await page.goto('/')
 const selector=page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})
 await selector.click();await expect(page.getByRole('option')).toHaveCount(14);await page.keyboard.press('Escape')
 await chooseOption(selector,'US');await expect(page.locator('.node-card')).toHaveCount(1)
 for(const width of [721,768,1440]){
  await page.setViewportSize({width,height:900});await expect(selector).toBeVisible();await expect(selector).toHaveAttribute('data-value','US')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
 await chooseOption(selector,'unknown');await expect(page.locator('.node-card')).toHaveCount(1)
 await chooseOption(selector,'all');await expect(page.locator('.node-card')).toHaveCount(13)
})

for(const width of [320,390,720])test('mobile region filters survive detail return at '+width,async({page})=>{
 await page.setViewportSize({width,height:844});await page.goto('/')
 await expect(page.locator('.region-atlas,.map-placeholder')).toHaveCount(0)
 await page.getByRole('button',{name:'筛选节点',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:'日本',exact:true}).click()
 await page.getByRole('button',{name:'显示 1 个节点',exact:true}).click()
 await expect(page.locator('.ma-node')).toHaveCount(1)
 await page.locator('.ma-node [data-node-id]').click()
 await page.getByRole('button',{name:'返回总览',exact:true}).click()
 await expect(page.locator('.ma-node')).toHaveCount(1)
 await page.getByRole('button',{name:'移除筛选：日本',exact:true}).click()
 await expect(page.locator('.ma-node')).toHaveCount(6)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.setViewportSize({width:721,height:844});await expect(page.locator('.home-region-bar')).toBeVisible()
 await page.setViewportSize({width,height:844});await expect(page.locator('.home-region-bar')).toHaveCount(0)
})

for(const appearance of ['light','dark'])test('filter sheet dismissal and focus in '+appearance,async({page})=>{
 await page.addInitScript(a=>localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,appearance:a})),appearance)
 for(const width of [320,390,720]){
  await page.setViewportSize({width,height:844});await page.goto('/')
  const trigger=page.getByRole('button',{name:'筛选节点',exact:true})
  await trigger.click();const dialog=page.getByRole('dialog',{name:'筛选节点'})
  const box=(await dialog.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width)
  expect(Math.round(box.y+box.height)).toBe(844)
  await dialog.getByRole('button',{name:'日本',exact:true}).click()
  await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused()
  await expect(page.locator('.ma-node')).toHaveCount(6)
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden')
  await trigger.click();await dialog.getByRole('button',{name:'日本',exact:true}).click()
  await dialog.getByRole('button',{name:'显示 1 个节点',exact:true}).click()
  await expect(page.locator('.ma-node')).toHaveCount(1)
  await page.getByRole('button',{name:'移除筛选：日本',exact:true}).click()
 }
})
