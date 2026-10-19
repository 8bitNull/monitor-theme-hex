import {test,expect} from '@playwright/test'
import {chooseOption} from './select'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const [width,density] of [[390,'compact'],[1440,'compact'],[1440,'detailed']] as const)for(const authed of [false,true]){
 test(`${width}px ${density} cards show remarks and restrict prices for ${authed?'signed-in users':'guests'}`,async({page})=>{
  await page.setViewportSize({width,height:1000})
  await page.route('**/api/me',r=>r.fulfill({json:{authed,github:false,site_name:'HEX',public_page:true}}))
  await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{card_info_remarks:true,card_info_price:true}}))
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[
   {...nodes()[0],remark:'公开备注；Backup；'+'长备注'.repeat(40),price:123.45},
   {...nodes()[5],sort:1,remark:'离线备注',price:67.89},
   {...nodes()[1],sort:2,price:0},
   {...nodes()[2],id:7,sort:3,remark:' ； ; ',price:89.01},
  ]}}))
  await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
  await page.goto('/')
  if(width>720)await chooseOption(page.getByRole('combobox',{name:'卡片密度'}),density)
  const cards=page.locator(width<721?'.ma-node':'.node-card')
  await expect(cards).toHaveCount(4)
  await expect(cards.nth(0).getByLabel('备注',{exact:true})).toContainText('公开备注')
  await expect(cards.nth(0).getByLabel('备注',{exact:true})).toContainText('Backup')
  await expect(cards.nth(1).getByLabel('备注',{exact:true})).toContainText('离线备注')
  await expect(cards.getByRole('button',{name:/地图|定位|locate|map/i})).toHaveCount(0)
  await expect(cards.locator('.node-price')).toHaveCount(authed?3:0)
  if(authed){
   await expect(cards.nth(0).locator('.node-price')).toContainText('$123.45')
   await expect(cards.nth(1).locator('.node-price')).toContainText('$67.89')
  }else{
   for(const amount of ['$123.45','$67.89','$89.01','$0.00'])await expect(cards.filter({hasText:amount})).toHaveCount(0)
   await expect(cards.nth(3).locator('.node-secondary,.ma-node-notes')).toHaveCount(0)
  }
  await expect(cards.nth(2).getByLabel('备注',{exact:true})).toHaveCount(0)
  await expect(cards.nth(3).getByLabel('备注',{exact:true})).toHaveCount(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  await cards.first().screenshot({path:`tests/artifacts/card-visibility/${width}-${authed?'signed-in':'guest'}.png`})
 })
}
