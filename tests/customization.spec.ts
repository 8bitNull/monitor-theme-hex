// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {chooseOption} from './select'
import {settingsCategory} from './settings'
import {setting,settingsButton} from './settings'
import {test,expect,type Page} from './desktopTest'
import {readFile} from 'node:fs/promises'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {toggleSettings} from './settings'
const keys=['traffic','connections','uptime','expiry','remarks','price']
const all=Object.fromEntries(keys.map(k=>[k,true]))
async function setup(page:Page){
 await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next'))localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,infoDensity:'full'}))})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],remark:'国际线路;Backup;Production;More',expires_at:'2026-10-05',price:5}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/');await page.locator('.route-matrix').scrollIntoViewIfNeeded();await page.locator('.latency-reading').waitFor()
}
test('site card information choices remove empty rows and preserve detail information',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:800,height:1000})
 let config:any={cardInfo:all,modules:{map:false}}
 await page.route('**/theme-config.json',r=>r.fulfill({json:config}))
 await page.route('**/api/themes/hex/config',r=>r.fulfill({status:404}))
 await setup(page)
 const card=page.locator('.node-card')
 for(const mask of [0,1,2,4,8,16,32,63]){
  config={...config,cardInfo:Object.fromEntries(keys.map((key,i)=>[key,Boolean(mask&(1<<i))]))}
  await page.reload()
  for(const [i,selector] of ['.traffic-summary','.node-connections','.card-uptime','.card-expiry','.node-remarks','.node-price'].entries())await expect(card.locator(selector)).toHaveCount(mask&(1<<i)?1:0)
  await expect(card.locator('.node-timing')).toHaveCount(0);await expect(card.locator('.node-footer')).toHaveCount(mask&48?1:0);await expect(card.locator('.node-secondary')).toHaveCount(mask&48?1:0)
  expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
 }
 config={...config,cardInfo:Object.fromEntries(keys.map(key=>[key,false]))};await page.reload()
 await card.locator('.node-open').click();await expect(page.locator('.detail-metric-network')).toContainText('TCP');await page.locator('.detail-facts-toggle').click();await expect(page.locator('.detail-fact-groups')).toBeVisible();await expect(page.locator('.overview-account')).toContainText('$5.00')
})
test('site mobile card choices respect the 720px boundary and follow mode',async({page})=>{
 await page.setViewportSize({width:390,height:1000})
 await page.addInitScript(()=>localStorage.setItem('hex-mobile-v1',JSON.stringify({detailed:true})))
 let config:any={cardInfo:all,mobileInfoMode:'custom',mobileCardInfo:{...all,traffic:false},modules:{map:false}}
 await page.route('**/theme-config.json',r=>r.fulfill({json:config}))
 await page.route('**/api/themes/hex/config',r=>r.fulfill({status:404}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
 await page.goto('/')
 await expect(page.locator('.ma-extra')).not.toContainText('本月用量')
 await page.setViewportSize({width:721,height:1000});await expect(page.locator('.traffic-summary')).toBeVisible()
 await page.setViewportSize({width:720,height:1000});await expect(page.locator('.ma-extra')).not.toContainText('本月用量')
 config={...config,mobileInfoMode:'follow'};await page.reload();await expect(page.locator('.ma-extra')).toContainText('本月用量')
})
test.skip('explicit equal-default display choices survive site changes, unrelated changes, export and import (removed backup controls)',async({page})=>{
 let config:any={cardInfo:all,desktopColumns:'auto'};await page.route('**/theme-config.json',r=>r.fulfill({json:config}));await setup(page);await toggleSettings(page)
 const group=page.getByRole('group',{name:'通用卡片信息',exact:true})
 await group.getByLabel('价格',{exact:true}).uncheck();await group.getByLabel('价格',{exact:true}).check()
 await chooseOption((await setting(page,'桌面列数',{exact:true})),'2');await chooseOption((await setting(page,'桌面列数',{exact:true})),'auto')
 await chooseOption((await setting(page,'明暗模式',{exact:true})),'dark');await toggleSettings(page)
 config={cardInfo:{...all,price:false,uptime:false},desktopColumns:'4'};await page.reload();await expect(page.locator('.node-price')).toBeVisible();await expect(page.locator('.card-uptime')).toHaveCount(0);await expect(page.locator('.node-grid')).toHaveAttribute('data-columns','auto')
 await toggleSettings(page);const downloadPromise=page.waitForEvent('download');await (await settingsButton(page,'导出主题配置',{exact:true})).click();const download=await downloadPromise;const exported=JSON.parse(await readFile((await download.path())!,'utf8'));expect(exported.preferences.cardInfo.price).toBe(true);expect(exported.preferences.cardInfo.uptime).toBe(false)
 await (await settingsButton(page,'重置全部偏好',{exact:true})).click();await page.getByRole('button',{name:'确认重置'}).click();await settingsCategory(page,'cards');await expect(group.getByLabel('价格',{exact:true})).not.toBeChecked()
 await (await setting(page,'导入主题配置',{exact:true})).setInputFiles({name:'prefs.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await settingsCategory(page,'cards');await expect(group.getByLabel('价格',{exact:true})).toBeChecked();await expect((await setting(page,'桌面列数',{exact:true}))).toHaveAttribute('data-value','auto')
 await page.reload();await expect(page.locator('.node-price')).toBeVisible()
})
for(const width of [768,800,850,899,721,1024,1440,1920])test('site column layout stays readable at '+width,async({page})=>{
 await page.setViewportSize({width,height:1000})
 let columns='4'
 await page.route('**/theme-config.json',r=>r.fulfill({json:{desktopColumns:columns,modules:{map:false}}}))
 await page.route('**/api/themes/hex/config',r=>r.fulfill({status:404}))
 await setup(page)
 const grid=page.locator('.node-grid'),card=page.locator('.node-card')
 for(const value of ['2','3','4','auto']){
  columns=value;await page.reload()
  const count=await grid.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)
  if(value!=='auto'){expect(count).toBeLessThanOrEqual(Number(value));expect((await card.boundingBox())!.width).toBeGreaterThanOrEqual(300)}
  if(width===1440&&value==='4')expect(count).toBe(4)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  expect(await card.evaluate(el=>[...el.querySelectorAll('.resource')].every(r=>[...r.querySelectorAll('.bar-number,.metric-ring strong,.resource small')].every(n=>{const box=n.getBoundingClientRect(),parent=r.getBoundingClientRect();return !box.width||(box.right<=parent.right+1&&box.left>=parent.left-1)})))).toBeTruthy()
 }
})
