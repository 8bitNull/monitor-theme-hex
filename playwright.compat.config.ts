import {defineConfig} from '@playwright/test'
import base from './playwright.config'

export default defineConfig({
 ...base,
 testMatch:['**/compatibility.spec.ts','**/session-continuity.spec.ts','**/startup-loading.spec.ts','**/mobile-loading.spec.ts','**/live-polish.spec.ts','**/ux-navigation.spec.ts'],
 workers:2,
 use:{...base.use,channel:undefined},
 projects:[
  {name:'chromium',use:{browserName:'chromium'}},
  {name:'firefox',use:{browserName:'firefox'}},
  {name:'webkit',use:{browserName:'webkit'}},
 ],
})
