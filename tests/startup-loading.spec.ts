import {test, expect} from './desktopTest'

test('starts backend config while packaged config is pending and renders their final merge', async ({page}) => {
  let releasePackaged!: () => void
  const packagedHeld = new Promise<void>(resolve => { releasePackaged = resolve })
  let backendStarted!: () => void
  const backendRequested = new Promise<void>(resolve => { backendStarted = resolve })
  await page.route('**/theme-config.json', async route => {
    await packagedHeld
    await route.fulfill({json: {palette: 'forest', graph: 'ring'}})
  })
  await page.route('**/api/themes/hex/config', async route => {
    backendStarted()
    await route.fulfill({json: {palette: 'ocean'}})
  })

  try {
    await page.goto('/')
    await expect(page.locator('.bootstrap-loading')).toBeVisible()
    await Promise.race([
      backendRequested,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('backend config waited for packaged config')), 1500)),
    ])
    await expect(page.locator('.next-theme')).toHaveCount(0)
  } finally {
    releasePackaged()
  }
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'ocean')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-graph', 'ring')
})

test('uses backend config when packaged config is malformed', async ({page}) => {
  await page.route('**/theme-config.json', route => route.fulfill({body: '{bad json'}))
  await page.route('**/api/themes/hex/config', route => route.fulfill({json: {palette: 'ocean'}}))
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'ocean')
})

test('uses backend config when packaged config is unavailable', async ({page}) => {
  await page.route('**/theme-config.json', route => route.fulfill({status: 404}))
  await page.route('**/api/themes/hex/config', route => route.fulfill({json: {palette: 'ocean'}}))
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'ocean')
})

test('uses packaged config when backend config is unavailable', async ({page}) => {
  await page.route('**/theme-config.json', route => route.fulfill({json: {palette: 'forest'}}))
  await page.route('**/api/themes/hex/config', route => route.fulfill({status: 503}))
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'forest')
})

test('uses packaged config when backend config is malformed', async ({page}) => {
  await page.route('**/theme-config.json', route => route.fulfill({json: {palette: 'forest'}}))
  await page.route('**/api/themes/hex/config', route => route.fulfill({body: '{bad json'}))
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'forest')
})

test('each stalled config source times out without blocking the dashboard', async ({page}) => {
  await page.route('**/theme-config.json', async route => {
    await new Promise(resolve => setTimeout(resolve, 4000))
    await route.fulfill({json: {palette: 'forest'}}).catch(() => {})
  })
  await page.route('**/api/themes/hex/config', async route => {
    await new Promise(resolve => setTimeout(resolve, 4000))
    await route.fulfill({json: {palette: 'ocean'}}).catch(() => {})
  })
  await page.goto('/')
  await expect(page.locator('.bootstrap-loading')).toBeVisible()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'default', {timeout: 7000})
})
