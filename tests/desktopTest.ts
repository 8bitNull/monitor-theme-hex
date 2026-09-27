import {test as base} from '@playwright/test'
export * from '@playwright/test'

// Legacy suites inspect the full desktop card and expanded map. Fresh compact defaults are covered
// separately by ux-layout.spec.ts; phone preferences remain independent.
export const test=base.extend({
 page:async({page},runWithPage)=>{
  await page.addInitScript(()=>{
   if(!localStorage.getItem('hex-desktop-v1'))localStorage.setItem('hex-desktop-v1',JSON.stringify({cardDensity:'detailed',mapExpanded:true}))
  })
  await runWithPage(page)
 },
})
