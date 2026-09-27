import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'
import {chooseOption} from './select'

for(const width of [1440,390,320])test(`node groups compose with search and support both views at ${width}`,async({page})=>{
 await page.setViewportSize({width,height:900})
 const source=nodes()[0]
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[
  {...source,id:1,name:'Website Alpha',group:'网站'},
  {...source,id:2,name:'Traffic Beta',group:'流量'},
  {...source,id:3,name:'Legacy Gamma'},
  {...source,id:4,name:'Reserved Delta',group:'all'},
 ]}}))
 await page.goto('/')
 if(width<=720){
  await expect(page.locator('.ma-node')).toHaveCount(4)
  for(const [group,name] of [['网站','Website Alpha'],['未分组','Legacy Gamma'],['all','Reserved Delta']]){
   await page.getByRole('button',{name:'筛选节点',exact:true}).click()
   await page.getByRole('dialog').getByRole('button',{name:group,exact:true}).click()
   await page.getByRole('button',{name:'显示 1 个节点',exact:true}).click()
   await expect(page.locator('.ma-node')).toHaveCount(1)
   await expect(page.locator('.ma-node')).toContainText(name)
   await page.getByRole('button',{name:`移除筛选：${group}`,exact:true}).click()
  }
  await page.getByRole('searchbox',{name:'搜索节点'}).fill('Beta')
  await expect(page.locator('.ma-node')).toHaveCount(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  return
 }
 const picker=page.getByRole('combobox',{name:'节点分组'})
 await expect(picker).toHaveText('全部分组')
 await expect(page.locator('.node-card')).toHaveCount(4)
 await chooseOption(picker,'=网站')
 await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.node-card')).toContainText('Website Alpha')
 await page.getByLabel('表格视图',{exact:true}).click()
 await expect(page.locator('#node-results')).toContainText('Website Alpha')
 await expect(page.locator('#node-results')).not.toContainText('Traffic Beta')
 await page.getByLabel('卡片视图',{exact:true}).click()
 await chooseOption(picker,'none')
 await expect(page.locator('.node-card')).toContainText('Legacy Gamma')
 await chooseOption(picker,'=all')
 await expect(page.locator('.node-card')).toContainText('Reserved Delta')
 await chooseOption(picker,'all')
 await expect(page.locator('.node-card')).toHaveCount(4)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
 await picker.scrollIntoViewIfNeeded()
 await page.screenshot({path:`tests/artifacts/node-groups-${width}.png`})
 if(width===1440){
  await page.getByRole('searchbox',{name:'搜索节点'}).fill('Beta')
  await chooseOption(picker,'=网站')
  await expect(page.getByText('没有符合条件的节点',{exact:true})).toBeVisible()
  await page.locator('.empty-state').getByRole('button',{name:'清除筛选',exact:true}).click()
  await expect(picker).toHaveText('全部分组')
  await expect(page.locator('.node-card')).toHaveCount(4)
 }
})

test('older hubs do not show an empty group control',async({page})=>{
 await page.goto('/')
 await expect(page.locator('.node-card').first()).toBeVisible()
 await expect(page.getByRole('combobox',{name:'节点分组'})).toHaveCount(0)
})
