import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'

test('desktop controls share one row with selected conditions below',async({page})=>{
 await page.setViewportSize({width:1024,height:1000});await page.goto('/')
 const toolbar=page.locator('.desktop-results-toolbar'),primary=toolbar.locator('.node-toolbar-primary'),filters=toolbar.locator('.node-browser')
 await expect(primary.getByRole('heading',{name:'节点',exact:true})).toBeVisible()
 await expect(primary.getByRole('combobox',{name:'地区',exact:true})).toBeVisible()
 await expect(primary.getByRole('button',{name:'卡片视图',exact:true})).toBeVisible()
 await expect(primary.getByRole('combobox',{name:'卡片密度',exact:true})).toBeVisible()
 await expect(filters).toBeHidden()
 const centers=await primary.locator('h2,[role=combobox],.view-switch').evaluateAll(elements=>elements.map(el=>{const b=el.getBoundingClientRect();return b.y+b.height/2}))
 expect(Math.max(...centers)-Math.min(...centers)).toBeLessThanOrEqual(2)
 await page.getByRole('searchbox').fill('Tokyo')
 await expect(filters.locator('.active-filters')).toContainText('Tokyo')
 const positions=await page.locator('.map-frame,.node-toolbar-primary,.node-browser,.node-grid').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().top))
 expect(positions).toHaveLength(4);expect(positions).toEqual([...positions].sort((a,b)=>a-b))
 await primary.getByRole('button',{name:'表格视图',exact:true}).click()
 await expect(primary.locator('.table-tools-host').getByRole('button',{name:'恢复默认列',exact:true})).toBeVisible()
 await expect(primary.locator('.desktop-card-density')).toHaveCount(0)
 const tableCenters=await primary.locator('h2,[role=combobox],.view-switch,.table-reset-columns').evaluateAll(elements=>elements.map(el=>{const b=el.getBoundingClientRect();return b.y+b.height/2}))
 expect(Math.max(...tableCenters)-Math.min(...tableCenters)).toBeLessThanOrEqual(2)
 await page.locator('.table-node-name').first().click();await page.getByRole('button',{name:'返回总览',exact:true}).click()
 await expect(primary.locator('.table-tools-host .table-reset-columns')).toBeVisible()
})

test('toolbar stays in node area through persistent disabled and fullscreen map states',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'放大查看',exact:true}).click()
 await page.locator('.region-atlas').getByRole('button',{name:'表格视图',exact:true}).click()
 await page.getByRole('button',{name:'退出全屏',exact:true}).click()
 await expect(page.locator('.node-toolbar-primary .table-reset-columns')).toBeVisible()
 await expect(page.locator('.home-map-toggle')).toHaveCount(0)
 await expect(page.locator('.node-toolbar-primary')).toBeVisible()
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{module_map:false}}));await page.reload()
 await expect(page.locator('.map-frame')).toHaveCount(0);await expect(page.locator('.node-toolbar-primary')).toBeVisible()
})

test('toolbar boundaries fit both languages and themes without page overflow',async({page})=>{
 test.setTimeout(90000)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map((n,i)=>({...n,os:i===0?'Windows Server 2022':'Debian 12'}))}}))
 for(const language of ['zh','en'])for(const appearance of ['light','dark'])for(const width of [390,720,721,1024,1440]){
  await page.setViewportSize({width,height:1000});await page.addInitScript(({language,appearance})=>{localStorage.setItem('monitor-next-language',language);localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,appearance}))},{language,appearance})
  await page.goto('/');if(width>720)await page.locator('.node-toolbar-primary').getByRole('button',{name:language==='en'?'Card view':'卡片视图',exact:true}).click();await expect(page.locator(width>720?'.node-card':'.ma-node').first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  if(width>720){
   await expect(page.locator('.desktop-results-toolbar .system-pills')).toBeVisible()
   if(appearance==='light'||language==='en')await page.screenshot({path:`tests/artifacts/toolbar-single-row/toolbar-${language}-${appearance}-${width}.png`})
   await page.locator('.node-toolbar-primary').getByRole('button',{name:language==='en'?'Table view':'表格视图',exact:true}).click()
   await expect(page.locator('.table-tools-host .table-reset-columns')).toBeVisible()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
 }
})
