import {test,expect,type Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function setup(page:Page){
 const base=nodes(),today=new Date().toISOString().slice(0,10)
 const many=Array.from({length:24},(_,i)=>({...base[i%6],id:i+1,sort:i,group:i<12?'网站':'流量',name:`${i+1} · ${base[i%6].name}${i===0?' · Very long production server name with IPv6 gateway':''}`,expires_at:i===0?today:null,traffic_limit:i===1?1:base[i%6].traffic_limit}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:many}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.setViewportSize({width:390,height:844});await page.goto('/')
}
test('filter drafts, independent removal, group search and fixed sheet actions',async({page})=>{
 await setup(page);await expect(page.locator('.ma-node')).toHaveCount(24)
 await page.getByRole('group',{name:'节点分组',exact:true}).getByRole('button',{name:/网站/}).click();await expect(page.locator('.ma-node')).toHaveCount(12)
 await page.getByRole('button',{name:'筛选节点',exact:true}).click()
 const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'离线',exact:true}).click();await expect(dialog.getByRole('button',{name:'显示 2 个节点',exact:true})).toBeVisible()
 await page.setViewportSize({width:320,height:640});expect(await dialog.locator('.ma-sheet-body').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true)
 const actions=(await dialog.locator('.ma-sheet-actions').boundingBox())!;expect(actions.y+actions.height).toBeLessThanOrEqual(640)
 await page.keyboard.press('Escape');await expect(page.locator('.ma-node')).toHaveCount(12);await expect(page.getByRole('button',{name:'筛选节点',exact:true})).toBeFocused()
 await page.getByRole('button',{name:'筛选节点',exact:true}).click();await dialog.getByRole('button',{name:'名称',exact:true}).click();await dialog.getByRole('button',{name:'显示 12 个节点',exact:true}).click()
 await expect(page.getByRole('button',{name:'移除筛选：名称',exact:true})).toBeVisible();await page.getByRole('button',{name:'移除筛选：网站',exact:true}).click();await expect(page.locator('.ma-node')).toHaveCount(24)
 await page.getByRole('searchbox',{name:'搜索节点',exact:true}).fill('不存在');await expect(page.locator('.ma-node')).toHaveCount(0);await page.getByRole('button',{name:'仅清除搜索',exact:true}).click();await expect(page.locator('.ma-node')).toHaveCount(24);await expect(page.getByRole('button',{name:'移除筛选：名称',exact:true})).toBeVisible()
 await page.getByRole('searchbox',{name:'搜索节点',exact:true}).fill('流量');await expect(page.locator('.ma-node')).toHaveCount(12)
})
test('overview reminders and settings records, reset and undo preserve unrelated preferences',async({page})=>{
 await setup(page);const nav=page.getByRole('navigation',{name:'主导航'})
 await nav.getByRole('button',{name:'概览',exact:true}).click();await expect(page.locator('.ma-region')).toHaveCount(6);await expect(page.getByRole('button',{name:'查看全部地区',exact:true})).toHaveCount(0)
 await page.locator('.ma-reminder-shortcuts').getByRole('button',{name:/流量提醒/}).click();await expect(page.locator('.ma-node')).toHaveCount(1);await expect(page.getByRole('button',{name:'移除筛选：流量提醒',exact:true})).toBeVisible()
 await nav.getByRole('button',{name:/设置$/}).click();await page.getByRole('button',{name:/本机负载记录/}).click();await expect(page.getByRole('dialog')).toContainText('高负载观测记录');await page.getByRole('button',{name:'关闭',exact:true}).click();await expect(nav.getByRole('button',{name:/设置$/})).toHaveAttribute('aria-current','page')
 await page.getByLabel('明暗模式',{exact:true}).selectOption('dark');await page.getByLabel('节点列表',{exact:true}).selectOption('detailed');await page.getByLabel('新详情页默认历史范围',{exact:true}).selectOption('24');await page.getByRole('checkbox',{name:'详情页显示资源容量',exact:true}).uncheck()
 await page.getByRole('button',{name:/恢复手机显示默认设置/}).click();await expect(page.getByLabel('节点列表',{exact:true})).toHaveValue('compact');await expect(page.getByLabel('明暗模式',{exact:true})).toHaveValue('dark')
 await page.getByRole('button',{name:'撤销',exact:true}).click();await expect(page.getByLabel('节点列表',{exact:true})).toHaveValue('detailed');await expect(page.getByLabel('新详情页默认历史范围',{exact:true})).toHaveValue('24');await expect(page.getByRole('checkbox',{name:'详情页显示资源容量',exact:true})).not.toBeChecked()
 await page.getByRole('button',{name:/主要探测线路/}).click();await page.getByRole('searchbox',{name:'搜索线路',exact:true}).fill('missing-route');await expect(page.getByRole('dialog')).toContainText('无该线路记录');await page.getByRole('dialog').getByRole('button',{name:'关闭',exact:true}).click()
 await expect(page.locator('body')).not.toHaveCSS('overflow','hidden')
})

test('long mobile lists and grouped picker fit narrow English dark mode and responsive boundaries',async({page})=>{
 await setup(page)
 const nav=page.getByRole('navigation',{name:'主导航'})
 await nav.getByRole('button',{name:/设置$/}).click();await page.getByLabel('明暗模式',{exact:true}).selectOption('dark');await page.getByLabel('Language / 语言',{exact:true}).selectOption('en')
 await page.getByRole('navigation',{name:'Main navigation'}).getByRole('button',{name:'Nodes',exact:true}).click();await page.locator('.ma-node>button').first().click()
 for(const width of [320,430,720]){
  await page.setViewportSize({width,height:844});await page.getByRole('button',{name:'Switch node',exact:true}).click();const sheet=page.getByRole('dialog')
  await expect(sheet.getByRole('searchbox',{name:'Search nodes',exact:true})).not.toBeFocused()
  await sheet.getByRole('searchbox',{name:'Search nodes',exact:true}).fill('24 ·');await expect(sheet.locator('.node-picker-group button')).toHaveCount(1);await expect(sheet).toContainText('London')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await sheet.getByRole('button',{name:'Close',exact:true}).click()
  await page.screenshot({path:`tests/artifacts/refinement-detail-dark-en-${width}.png`})
 }
 for(const width of [721,899,900,1440]){
  await page.setViewportSize({width,height:1000});await expect(page.locator('.ma-detail-tabs')).toHaveCount(0);await expect(page.locator('.detail-live')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
})

test('long record sheet scrolls independently and opens the observed resource interval',async({page})=>{
 await page.addInitScript(()=>{const now=Date.now();localStorage.setItem('monitor-next-load-alerts-v1',JSON.stringify(Array.from({length:30},(_,i)=>({id:`record-${i}`,nodeId:i===0?999:1,name:`Observed node ${i} with a long production name`,start:now-(i+2)*60000,last:now-(i+1)*60000,end:now-(i+1)*60000,peak:96,status:'recovered'}))))})
 await setup(page);await page.setViewportSize({width:320,height:740});await page.getByRole('navigation',{name:'主导航'}).getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:/本机负载记录/}).click()
 const sheet=page.getByRole('dialog');await expect(sheet.locator('article')).toHaveCount(30);await expect(sheet.getByRole('button',{name:'Observed node 0 with a long production name',exact:true})).toBeDisabled()
 expect(await sheet.locator('.ma-sheet-body').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true)
 await sheet.getByRole('button',{name:'Observed node 29 with a long production name',exact:true}).scrollIntoViewIfNeeded();await expect(sheet.getByRole('button',{name:'关闭',exact:true})).toBeInViewport()
 await sheet.getByRole('button',{name:'Observed node 29 with a long production name',exact:true}).click();await expect(page).toHaveURL(/eventStart=/);await expect(page.locator('.detail-resource-charts')).toBeVisible();await expect(page.locator('.event-context')).toBeVisible();await expect(page.locator('body')).not.toHaveCSS('overflow','hidden')
})
