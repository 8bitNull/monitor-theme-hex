import {test,expect,type Page,type TestInfo} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function fixture(page:Page){
 await page.routeWebSocket('**/api/ws',socket=>socket.close())
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map((n,i)=>({...n,remark:i===0?'Long note · 长备注 '.repeat(12):n.remark}))}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
}
async function fits(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)}
async function capture(page:Page,testInfo:TestInfo,name:string){
 await page.screenshot({path:testInfo.outputPath(`${name}.png`)})
}
for(const [width,height] of [[320,568],[390,844],[667,375],[768,1024],[1024,768],[1440,1000]])test(`browse and details fit ${width}x${height}`,async({page},testInfo)=>{
 await page.setViewportSize({width,height});await fixture(page)
 if(width===667||width===1024)await page.addInitScript(()=>{localStorage.setItem('monitor-next-language','en');localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:2,appearance:'dark'}))})
 const english=width===667||width===1024,mobile=width<=720,errors:string[]=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto('/');await expect(page.locator(mobile?'.ma-node':'.node-card')).toHaveCount(6)
 await fits(page);await capture(page,testInfo,'home')
 if(mobile){
  const nav=await page.locator('.ma-nav').boundingBox();expect(nav!.y+nav!.height).toBeLessThanOrEqual(height+1)
  await page.getByRole('button',{name:english?'Filter nodes':'筛选节点',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible()
  await fits(page);const box=(await dialog.boundingBox())!;expect(box.y).toBeGreaterThanOrEqual(0);expect(box.y+box.height).toBeLessThanOrEqual(height+1)
  await capture(page,testInfo,'filters');await dialog.getByRole('button',{name:english?'Close':'关闭',exact:true}).click()
 }else{
  await page.getByRole('combobox',{name:english?'Region':'地区',exact:true}).click();await expect(page.getByRole('listbox')).toBeVisible();await fits(page);await capture(page,testInfo,'regions');await page.keyboard.press('Escape')
 }
 await page.goto('/node/1');await expect(page.locator(mobile?'.ma-detail-header':'.detail-live')).toBeVisible();await fits(page)
 if(mobile)await page.getByRole('button',{name:english?'Info':'资料',exact:true}).click()
 const factsToggle=page.locator('.detail-facts-toggle[aria-expanded=false]');if(await factsToggle.count())await factsToggle.click()
 await expect(page.locator('.detail-facts').first()).toBeVisible();await page.locator('.detail-facts').first().scrollIntoViewIfNeeded();await fits(page);await capture(page,testInfo,'facts')
 expect(errors).toEqual([])
})
for(const [width,height] of [[320,568],[667,375]])test(`immersive map remains operable at ${width}x${height}`,async({page},testInfo)=>{
 await page.setViewportSize({width,height});await fixture(page);await page.goto('/?page=map')
 await expect(page.locator('.mm-land')).toBeVisible();await fits(page)
 await page.getByRole('button',{name:'展开节点列表',exact:true}).click();await expect(page.locator('.mm-sheet-content')).toBeVisible()
 await page.locator('.mm-node').first().click();await expect(page.locator('.ma-detail-header')).toBeVisible();await page.getByRole('button',{name:'返回总览',exact:true}).click()
 await expect(page.locator('.mm-land')).toBeVisible();await page.getByRole('button',{name:'收起节点列表',exact:true}).click()
 const map=page.getByRole('group',{name:'世界节点分布地图',exact:true});await map.focus();const initial=await page.locator('.mm-land').getAttribute('transform');await map.press('+');await expect(page.locator('.mm-land')).not.toHaveAttribute('transform',initial!)
 await page.getByRole('button',{name:'查看全球',exact:true}).click();await fits(page);await capture(page,testInfo,'map')
 await page.getByRole('button',{name:'返回概览',exact:true}).click();await expect(page.locator('.ma-hero')).toBeVisible()
})

test.describe('touch map controls',()=>{
 test.use({hasTouch:true})
 test('region taps and sheet actions work without keyboard input',async({page},testInfo)=>{
  await page.setViewportSize({width:390,height:844});await fixture(page);await page.goto('/?page=map')
  await expect(page.locator('.mm-land')).toBeVisible();await page.getByRole('button',{name:'查看全球',exact:true}).tap()
  await page.locator('.mm-marker[data-region=JP]').tap()
  await expect(page.getByRole('combobox',{name:'地图地区',exact:true})).toHaveAttribute('data-value','JP')
  await expect(page.locator('.mm-node')).toHaveCount(1);await page.locator('.mm-node').tap()
  await expect(page.locator('.ma-detail-header')).toBeVisible();await page.getByRole('button',{name:'返回总览',exact:true}).tap()
  await expect(page.getByRole('combobox',{name:'地图地区',exact:true})).toHaveAttribute('data-value','JP')
  await fits(page);await capture(page,testInfo,'touch-map')
 })
})
