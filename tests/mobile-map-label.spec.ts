import {test,expect} from '@playwright/test'
import {chooseOption} from './select'
import {nodes} from '../scripts/fixtures.mjs'

test('selected region label agrees with its list and accessible marker',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0],{...nodes()[5],country:'JP'}]}}))
 await page.goto('/?page=map')
 await chooseOption(page.getByRole('combobox',{name:'地图地区',exact:true}),'JP')
 const map=page.getByRole('group',{name:'世界节点分布地图',exact:true})
 await map.focus();await page.keyboard.press('+')
 await expect(page.locator('.mm-region-label[data-region=JP]')).toContainText('日本 · 1/2 在线')
 await expect(page.locator('.mm-marker[data-region=JP]')).toHaveAttribute('aria-label','日本：1 / 2 在线')
 await expect(page.locator('.mm-results-heading')).toContainText('1 / 2 在线')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})

test('long English region keeps the full count at 320px in dark mode',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],country:'AE'},{...nodes()[5],country:'AE'}]}}))
 await page.goto('/?page=map')
 await page.evaluate(()=>document.documentElement.classList.add('dark'))
 await chooseOption(page.getByRole('combobox',{name:'Map region',exact:true}),'AE')
 const map=page.getByRole('group',{name:'World node distribution map',exact:true})
 await map.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight')
 const label=page.locator('.mm-region-label[data-region=AE]')
 await expect(label).toContainText(' · 1/2 online')
 await expect(label).toContainText('…')
 await expect(page.locator('.mm-results-heading')).toContainText('1 / 2 online')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
