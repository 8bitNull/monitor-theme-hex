import {defineConfig} from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
 ...base,
 testMatch:['**/status-filters.spec.ts','**/toolbar-grouping.spec.ts','**/compatibility.spec.ts','**/session-continuity.spec.ts','**/startup-loading.spec.ts','**/mobile-loading.spec.ts','**/live-polish.spec.ts','**/ux-navigation.spec.ts','**/detail-aesthetics.spec.ts','**/resource-summary.spec.ts','**/mobile-facts-reading.spec.ts','**/mobile-map-label.spec.ts','**/mobile-detail-efficiency.spec.ts','**/desktop-detail-refinement.spec.ts','**/experience-stability.spec.ts'],
 workers:2,
 use:{...base.use,channel:undefined},
 projects:[
  {name:'chromium',use:{browserName:'chromium'}},
  {name:'firefox',use:{browserName:'firefox'}},
  {name:'webkit',use:{browserName:'webkit'}},
 ],
})
