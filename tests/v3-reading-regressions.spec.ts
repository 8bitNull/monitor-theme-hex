import {test,expect,type Locator} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function themeColor(locator:Locator,token:string){
 return locator.evaluate((el,token)=>{
  const probe=document.createElement('span')
  probe.style.color=`var(${token})`;el.append(probe)
  const color=getComputedStyle(probe).color;probe.remove();return color
 },token)
}

for(const appearance of ['light','dark']){
 test(`minimal desktop disk and load retain warning colors in ${appearance}`,async({page})=>{
  const base=nodes()[0]
  await page.addInitScript(appearance=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:2,appearance})),appearance)
  await page.route('**/theme-config.json',r=>r.fulfill({json:{graph:'minimal'}}))
  await page.route('**/api/themes/hex/config',r=>r.fulfill({status:404}))
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...base,cpu_cores:4,metrics:{...base.metrics,disk_used:base.metrics!.disk_total*.95,load:[3.2,0,0]}}]}}))
  await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
  await page.goto('/')
  const card=page.locator('.node-card'),disk=card.locator('.resource').nth(2),load=card.locator('.resource').nth(3)
  await expect(card).toHaveAttribute('data-indicator','minimal')
  await expect(disk).toHaveClass(/danger/);await expect(load).toHaveClass(/warning/)
  await expect(disk.locator('.bar-number')).toHaveCSS('color',await themeColor(card,'--destructive'))
  await expect(load.locator('.bar-number')).toHaveCSS('color',await themeColor(card,'--warn'))
 })

 test(`mobile memory warning clears on recovery in ${appearance}`,async({page})=>{
  await page.setViewportSize({width:390,height:844})
  await page.addInitScript(appearance=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:2,appearance})),appearance)
  const base=nodes()[0]
  let hot=true
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{...base,metrics:{...base.metrics,mem_used:base.metrics!.mem_total*(hot ? 0.92 : 0.25)}}]}}))
  await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
  await page.goto('/')
  const card=page.locator('.ma-node'),track=card.locator('.ma-meter').nth(1).locator('.ma-track')
  await expect(track).toHaveAttribute('data-hot','true')
  const warning=await themeColor(card,'--warn')
  await expect(track.locator('i')).toHaveCSS('background-color',warning)
  hot=false;await page.reload()
  await expect(track).toHaveAttribute('data-hot','false')
  await expect(track.locator('i')).not.toHaveCSS('background-color',warning)
 })

 test(`desktop glass opacity remains configurable in ${appearance}`,async({page})=>{
  await page.addInitScript(appearance=>localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:2,appearance})),appearance)
  await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{glass:true,cardOpacity:60,cardBlur:8}}))
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-glass','true')
  const card=page.locator('.node-card').first()
  const expected=await card.evaluate(el=>{
   const probe=document.createElement('span')
   probe.style.backgroundColor='color-mix(in srgb,var(--card) 60%,transparent)';el.append(probe)
   const color=getComputedStyle(probe).backgroundColor;probe.remove();return color
  })
  await expect(card).toHaveCSS('background-color',expected)
  await expect(card).toHaveCSS('background-image','none')
  await expect(card).toHaveCSS('backdrop-filter','blur(8px)')
 })
}
