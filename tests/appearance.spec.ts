// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from './desktopTest'
import {setStoredPreference,setSiteDefault,toggleSettings,settingsCategory} from './settings'
test('each card layout fits its indicator, keeps data visible and persists selection',async({page})=>{
 test.setTimeout(90000)
 await page.addInitScript(()=>{if(!localStorage.getItem('monitor-next'))localStorage.setItem('monitor-next',JSON.stringify({designVersion:1,modules:{map:false},homeRoutes:1}))})
 await page.goto('/')
 const card=page.locator('.node-card').first();await card.locator('.route-matrix').scrollIntoViewIfNeeded();await card.locator('.latency-reading').waitFor()
 await card.getByLabel('节点探测线路').click();await expect(page.getByRole('option').first()).toHaveText(/^全局：/);await page.keyboard.press('Escape')
 for(const appearance of ['light','dark']){
  await setStoredPreference(page,'appearance',appearance)
  for(const graph of ['columns','bar','ring','minimal']){
   await setSiteDefault(page,'graph',graph)
   await expect(card).toHaveAttribute('data-indicator',graph)
   for(const width of [1440,1024,800,768]){
    await page.setViewportSize({width,height:1000})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
    expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy()
    await expect(card.locator('.node-secondary-disclosure')).toHaveCount(0)
    for(const metric of await card.locator('.resource').all()){
     const number=metric.locator(graph==='ring'?'.metric-ring strong':'.bar-number');await expect(number).toBeVisible()
     const box=(await metric.boundingBox())!,value=(await number.boundingBox())!
     expect(value.x+value.width).toBeLessThanOrEqual(box.x+box.width+1)
    }
    if(width===800)await card.screenshot({path:`tests/artifacts/appearance-card-${graph}-${appearance}.png`})
   }
  }
 }
 await page.reload();await expect(card).toHaveAttribute('data-indicator','minimal')
 await expect(card.locator('.latency-columns')).toBeHidden()
 })
test.skip('settings option borders stay neutral while selection remains visible (removed drawer controls)',async({page})=>{
 await page.goto('/');await toggleSettings(page)
 const colors=await page.locator('.settings-drawer').evaluate(drawer=>{
  const styles=getComputedStyle(drawer),read=(name:string)=>{const probe=document.createElement('span');probe.style.color=styles.getPropertyValue(name).trim();document.body.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color}
  return {border:read('--border'),foreground:read('--foreground'),muted:read('--muted-foreground')}
 })
 const assertBorder=async(selector:string,color=colors.border)=>{const button=page.locator(selector).first();await button.hover();await expect(button).toHaveCSS('border-top-color',color)}
 await settingsCategory(page,'cards')
 await assertBorder('.info-presets button[aria-pressed=false]',colors.border)
 await assertBorder('.info-presets button[aria-pressed=true]',colors.border)
 await settingsCategory(page,'appearance')
 for(const selector of ['.graph-options button[aria-pressed=false]','.graph-options button[aria-pressed=true]','.density-options button[aria-pressed=false]','.density-options button[aria-pressed=true]'])await assertBorder(selector,colors.border)
 const swatch=page.locator('.palette-options button[aria-pressed=false]').first();await swatch.hover();await expect(swatch).toHaveCSS('border-top-color','rgba(0, 0, 0, 0)')
 await assertBorder('.palette-options button[aria-pressed=true]',colors.border)
 const focused=page.locator('.graph-options button[aria-pressed=true]').first();await page.keyboard.press('Tab');await focused.focus();await expect(focused).toHaveCSS('outline-color',colors.foreground)
 const select=page.getByLabel('明暗模式',{exact:true});await select.focus();await expect(select).toHaveCSS('outline-color',colors.muted)
 await settingsCategory(page,'network')
 await assertBorder('.latency-presets button[aria-pressed=false]',colors.border)
 await assertBorder('.latency-presets button[aria-pressed=true]',colors.border)
})
test.skip('settings categories keep related controls together (removed drawer categories)',async({page})=>{
 await page.goto('/');await toggleSettings(page);await settingsCategory(page,'appearance');const drawer=page.locator('dialog.settings-drawer')
 await expect(drawer.locator('.settings-nav button')).toHaveText(['外观','显示内容','网络','偏好'])
 await expect(drawer.locator('[data-settings=appearance]')).toBeVisible();await expect(drawer.locator('[data-settings=layout]')).toBeVisible();await expect(drawer.locator('[data-settings=indicators]')).toBeVisible();await expect(drawer.locator('.advanced-appearance')).toBeVisible()
 await settingsCategory(page,'cards');await expect(drawer.locator('[data-settings=card-info]')).toBeVisible();await expect(drawer.getByText('仅影响首页卡片，详情页保留完整资料。',{exact:true})).toHaveCount(0);await expect(drawer.locator('.information-density')).toHaveCount(0);await expect(drawer.locator('[data-settings=home] input[type=checkbox]')).toHaveCount(7);await expect(drawer.locator('[data-settings=detail]')).toBeVisible();await expect(drawer.locator('[data-settings=layout]')).toBeHidden()
 await settingsCategory(page,'network');await expect(drawer.locator('[data-settings=routes]')).toBeVisible();await expect(drawer.locator('.latency-presets button')).toHaveCount(3);await expect(drawer.locator('[data-settings=home]')).toBeHidden()
 await settingsCategory(page,'other');await expect(drawer.locator('.settings-language')).toBeVisible();await expect(drawer.locator('.settings-reset')).toBeVisible();await expect(drawer.locator('.preference-action-group')).toHaveCount(2)
})
