import { defineConfig } from '@playwright/test'
const port = process.env.THEME_DEMO_PORT || '4173'
const baseURL = `http://127.0.0.1:${port}`
export default defineConfig({
  testDir: './tests', testIgnore: '**/artifacts/**', fullyParallel: false,
  use: { baseURL, channel: process.env.TEST_BROWSER === 'chromium' ? undefined : process.env.TEST_BROWSER || 'chrome', reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } },
  webServer: { command: 'npm run demo', url: baseURL, reuseExistingServer: false },
})
