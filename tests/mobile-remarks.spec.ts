import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

const remarks=['短标签','中'.repeat(24),'长'.repeat(25),'A long remark with spaces that must remain a complete tag','https://example.test/'+ 'continuous-token-'.repeat(12),'🚀'.repeat(25)]
for(const width of [320,390,430])test(`mobile remarks keep long text in wrapping tags at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],remark:remarks.join('；')}]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/node/1')
 await page.getByRole('navigation',{name:'详情分区'}).getByRole('button',{name:'资料',exact:true}).click()
 const tags=page.locator('.ma-remark-tag')
 await expect(tags).toHaveText(remarks)
 await expect(page.locator('.ma-remark-text')).toHaveCount(0)
 const parent=(await page.locator('.ma-remarks-content').boundingBox())!
 for(const tag of await tags.all()){
  await expect(tag).toHaveCSS('border-top-width','1px')
  const rect=(await tag.boundingBox())!
  expect(rect.x).toBeGreaterThanOrEqual(parent.x-1)
  expect(rect.x+rect.width).toBeLessThanOrEqual(parent.x+parent.width+1)
  expect(await tag.evaluate(el=>el.scrollWidth<=el.clientWidth&&el.scrollHeight<=el.clientHeight)).toBe(true)
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.locator('.ma-remarks').scrollIntoViewIfNeeded()
 await page.locator('.ma-remarks').screenshot({path:`artifacts/mobile-remarks/fixed-${width}.png`})
 await page.evaluate(()=>document.documentElement.classList.add('dark'))
 await expect(tags).toHaveText(remarks)
})
