import {test,expect} from '@playwright/test'
import {detailFixture} from './detail-aesthetics-fixture'
import {nodes} from '../scripts/fixtures.mjs'

test('long phone facts stay readable and copy reports failure',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied')}}}))
 await detailFixture(page)
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[{
  ...nodes()[0],name:'Tokyo long node name 东京节点',remark:'Long remark 长备注 '.repeat(10),
  cpu_name:'AMD EPYC 7B13 64-Core Processor Production Edition',
  kernel:'6.12.0-production-long-kernel-version-amd64',
  ipv4:'192.0.2.10',
  ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd'
 }]}}))
 await page.goto('/node/1?section=info')
 const value=page.locator('.fact-value').filter({hasText:'2001:db8:1234:5678:abcd:1234:5678:abcd'})
 await expect(value).toBeVisible()
 expect(await value.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true)
 await page.getByRole('button',{name:'复制：IPv6',exact:true}).click()
 await expect(page.getByRole('status')).toContainText('复制失败，请手动选择文本')
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 const hardware=page.locator('.detail-fact-groups>section').first().locator('dt')
 expect(await hardware.allTextContents()).toEqual(['CPU','内存 / 硬盘','系统','架构 / 虚拟化','交换空间','Agent'])
 await page.screenshot({path:'artifacts/mobile-completion/facts-320.png',fullPage:true})
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844})
  for(const label of ['CPU','系统','IPv4','IPv6','内存 / 硬盘']){
   const row=page.locator('.detail-facts>div').filter({has:page.locator('dt',{hasText:new RegExp(`^${label}$`)})})
   await expect(row.locator('dd')).toHaveCSS('text-align','right')
   await expect(row.locator('.fact-value')).toHaveCSS('text-align','right')
   expect(await row.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true)
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  for(const colorScheme of ['light','dark'] as const){
   await page.emulateMedia({colorScheme})
   await page.screenshot({path:`artifacts/mobile-completion/facts-${width}-${colorScheme}.png`,fullPage:true})
  }
 }
 await page.setViewportSize({width:1440,height:1000})
 await page.emulateMedia({colorScheme:'light'})
 await expect(page.locator('.detail-information')).toBeVisible()
 expect(await hardware.allTextContents()).toEqual(['Agent','系统','CPU','内存 / 硬盘','架构 / 虚拟化','交换空间'])
 await page.screenshot({path:'artifacts/mobile-completion/facts-desktop.png',fullPage:true})
})
