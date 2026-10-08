import {test,expect} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'
const key='monitor-next-load-alerts-v1'
test('load records persist across recovery, reload and stale data',async({page})=>{
 await page.clock.install()
 await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next'))localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,modules:{busiest:true,map:false}}))})
 let cpu=92,fail=false
 await page.route('**/api/nodes',r=>fail?r.fulfill({status:503}):r.fulfill({json:{nodes:nodes().slice(0,2).map(n=>({...n,metrics:{...n.metrics,cpu}}))}}))
 await page.goto('/')
 const tile=page.locator('.load-alert-tile')
 await expect(tile.locator('.summary-total')).toHaveText('2告警中')
 cpu=82;await page.clock.runFor(6000);await expect(tile.locator('.summary-total')).toHaveText('2告警中')
 cpu=75;await page.clock.runFor(6000);await expect(tile.locator('.summary-total')).toHaveText('0告警中')
 await page.getByRole('button',{name:'查看高负载记录',exact:true}).click()
 await expect(page.locator('.load-records article[data-status=recovered]')).toHaveCount(2)
 await expect(page.locator('.load-duration').first()).not.toHaveText('0:00:00')
 await page.keyboard.press('Escape');await expect(page.locator('.load-records')).toHaveCount(0)
 await page.reload();await expect(tile).toContainText('已恢复')
 cpu=97;await page.clock.runFor(6000);await expect(tile.locator('.summary-total')).toHaveText('2告警中')
 fail=true;await page.clock.runFor(22000);await expect(tile.locator('.summary-total')).toHaveText('0告警中');await expect(tile).toContainText('监测中断')
 expect(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)!).length,key)).toBe(4)
})
test('load overview and history fit light/dark layouts and restore keyboard focus',async({page})=>{
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{module_map:false,module_busiest:true}}))
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,appearance:'light',modules:{busiest:true,map:false}})))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...nodes()[0],name:'高负载节点 · Long node name '.repeat(5),metrics:{...nodes()[0].metrics,cpu:96}}]}}))
 await page.goto('/');await expect(page.locator('.load-alert-tile')).toContainText('1告警中')
 for(const dark of [false,true]){
  await page.locator('.next-theme').evaluate((el,dark)=>{el.classList.toggle('dark',dark);document.documentElement.classList.toggle('dark',dark)},dark)
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000})
   if(width<=720)await page.locator('.ma-nav').getByRole('button',{name:'概览'}).click()
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
   if(width===1440){
    const tiles=await page.locator('.summary-grid > div').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().top))
    expect(tiles.length).toBeGreaterThan(0);expect(new Set(tiles).size).toBe(1)
   }
   await page.screenshot({path:`tests/artifacts/load-alerts-home-${width}-${dark?'dark':'light'}.png`,fullPage:true})
   const trigger=page.getByRole('button',{name:'查看高负载记录',exact:true});await trigger.click()
   await expect(page.getByRole('dialog',{name:'高负载观测记录'})).toBeVisible()
   expect(await page.getByRole('dialog',{name:'高负载观测记录'}).evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
   await page.screenshot({path:`tests/artifacts/load-alerts-records-${width}-${dark?'dark':'light'}.png`})
   await page.keyboard.press('Escape');await expect(trigger).toBeFocused()
  }
 }
})
