import {test as base} from './desktopTest'
export * from '@playwright/test'

// These suites retain the full-width desktop contract. Cockpit composition has
// separate coverage in cockpit.spec.ts; site settings remain authoritative.
export const test = base.extend({
 page: async ({page}, runWithPage) => {
  await page.route('**/api/themes/hex/config', route => route.fulfill({json: {cockpitMode: false, glass: false}}))
  await runWithPage(page)
 },
})
