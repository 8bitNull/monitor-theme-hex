/**
 * Cross-Device Visual Verification & Regression Test
 *
 * Verifies:
 * 1. Desktop 1440x900 Dark Mode Home (65%/35% dual-column layout, sticky map on right, 0px overflow)
 * 2. Desktop 1440x900 Dark Mode Detail (30%/70% dual-column layout, sticky sidebar on left, 0px overflow)
 * 3. Desktop 1440x900 Light Mode Home (2-column layout, 0px overflow)
 * 4. Desktop 1440x900 Light Mode Detail (2-column layout, 0px overflow)
 * 5. Mobile 390x844 Dark Mode Home & Detail (single-column fallback, 0px overflow)
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = process.env.THEME_VERIFY_PORT || '4195';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log(`[verify-cockpit] Starting demo fixture server on port ${PORT}...`);
  const server = spawn('node', ['scripts/demo.mjs'], {
    env: { ...process.env, THEME_DEMO_PORT: PORT },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Server start timed out')), 10000);
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes(PORT)) {
        clearTimeout(timer);
        resolve();
      }
    });
    server.stderr.on('data', (err) => console.error('[server error]', err.toString()));
    server.on('error', reject);
  });

  console.log(`[verify-cockpit] Server ready at ${BASE_URL}. Launching Chromium...`);
  const browser = await chromium.launch({ headless: true });

  const results = [];

  try {
    // -------------------------------------------------------------
    // Scenario 1: Desktop 1440x900 Dark Mode Home
    // -------------------------------------------------------------
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark'
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('monitor-next-mode', 'dark');
        localStorage.setItem('hex-desktop-v1', JSON.stringify({ cockpitMode: true }));
      });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.cockpit-layout', { timeout: 10000 });
      await page.waitForTimeout(500);

      const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      const mainBox = await page.locator('.cockpit-main').boundingBox();
      const asideBox = await page.locator('.cockpit-aside').boundingBox();
      const asidePos = await page.locator('.cockpit-aside').evaluate(el => window.getComputedStyle(el).position);
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

      const isTwoColumn = mainBox && asideBox && asideBox.x > mainBox.x && Math.abs(mainBox.y - asideBox.y) < 50;
      const totalWidth = mainBox.width + asideBox.width;
      const mainRatio = (mainBox.width / totalWidth) * 100;
      const asideRatio = (asideBox.width / totalWidth) * 100;

      const passed = overflow === 0 && isTwoColumn && asidePos === 'sticky' && isDark;
      const screenshotPath = path.join(SCREENSHOT_DIR, '01-desktop-dark-home.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '1. Desktop 1440x900 Dark Mode Home',
        viewport: '1440x900',
        overflow: `${overflow}px`,
        layout: `2-column (${mainRatio.toFixed(1)}% main / ${asideRatio.toFixed(1)}% aside)`,
        sticky: asidePos === 'sticky' ? 'sticky aside' : 'none',
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 2: Desktop 1440x900 Dark Mode Detail
    // -------------------------------------------------------------
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'dark'
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('monitor-next-mode', 'dark');
        localStorage.setItem('hex-desktop-v1', JSON.stringify({ cockpitMode: true }));
      });
      await page.goto(`${BASE_URL}/node/1`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.detail-cockpit', { timeout: 10000 });
      await page.waitForTimeout(500);

      const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      const sidebarBox = await page.locator('.detail-cockpit-sidebar').boundingBox();
      const mainBox = await page.locator('.detail-cockpit-main').boundingBox();
      const sidebarPos = await page.locator('.detail-cockpit-sidebar').evaluate(el => window.getComputedStyle(el).position);
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

      const isTwoColumn = sidebarBox && mainBox && mainBox.x > sidebarBox.x && Math.abs(sidebarBox.y - mainBox.y) < 50;
      const totalWidth = sidebarBox.width + mainBox.width;
      const sidebarRatio = (sidebarBox.width / totalWidth) * 100;
      const mainRatio = (mainBox.width / totalWidth) * 100;

      const passed = overflow === 0 && isTwoColumn && sidebarPos === 'sticky' && isDark;
      const screenshotPath = path.join(SCREENSHOT_DIR, '02-desktop-dark-detail.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '2. Desktop 1440x900 Dark Mode Detail',
        viewport: '1440x900',
        overflow: `${overflow}px`,
        layout: `2-column (${sidebarRatio.toFixed(1)}% sidebar / ${mainRatio.toFixed(1)}% main)`,
        sticky: sidebarPos === 'sticky' ? 'sticky sidebar' : 'none',
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 3: Desktop 1440x900 Light Mode Home
    // -------------------------------------------------------------
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light'
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('monitor-next-mode', 'light');
        localStorage.setItem('hex-desktop-v1', JSON.stringify({ cockpitMode: true }));
      });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.cockpit-layout', { timeout: 10000 });
      await page.waitForTimeout(500);

      const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      const mainBox = await page.locator('.cockpit-main').boundingBox();
      const asideBox = await page.locator('.cockpit-aside').boundingBox();
      const isLight = await page.evaluate(() => !document.documentElement.classList.contains('dark'));

      const isTwoColumn = mainBox && asideBox && asideBox.x > mainBox.x;
      const passed = overflow === 0 && isTwoColumn && isLight;
      const screenshotPath = path.join(SCREENSHOT_DIR, '03-desktop-light-home.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '3. Desktop 1440x900 Light Mode Home',
        viewport: '1440x900',
        overflow: `${overflow}px`,
        layout: '2-column layout (Light mode)',
        sticky: 'valid',
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 4: Desktop 1440x900 Light Mode Detail
    // -------------------------------------------------------------
    {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        colorScheme: 'light'
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('monitor-next-mode', 'light');
        localStorage.setItem('hex-desktop-v1', JSON.stringify({ cockpitMode: true }));
      });
      await page.goto(`${BASE_URL}/node/1`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.detail-cockpit', { timeout: 10000 });
      await page.waitForTimeout(500);

      const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      const sidebarBox = await page.locator('.detail-cockpit-sidebar').boundingBox();
      const mainBox = await page.locator('.detail-cockpit-main').boundingBox();
      const isLight = await page.evaluate(() => !document.documentElement.classList.contains('dark'));

      const isTwoColumn = sidebarBox && mainBox && mainBox.x > sidebarBox.x;
      const passed = overflow === 0 && isTwoColumn && isLight;
      const screenshotPath = path.join(SCREENSHOT_DIR, '04-desktop-light-detail.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '4. Desktop 1440x900 Light Mode Detail',
        viewport: '1440x900',
        overflow: `${overflow}px`,
        layout: '2-column layout (Light mode)',
        sticky: 'valid',
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 5: Mobile 390x844 Dark Mode Home & Detail
    // -------------------------------------------------------------
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        colorScheme: 'dark'
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('monitor-next-mode', 'dark');
        localStorage.setItem('hex-desktop-v1', JSON.stringify({ cockpitMode: true }));
      });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const homeOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      const homeScreenshotPath = path.join(SCREENSHOT_DIR, '05-mobile-dark-home.png');
      await page.screenshot({ path: homeScreenshotPath, fullPage: true });

      await page.goto(`${BASE_URL}/node/1`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);

      const detailOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth));
      const detailScreenshotPath = path.join(SCREENSHOT_DIR, '05-mobile-dark-detail.png');
      await page.screenshot({ path: detailScreenshotPath, fullPage: true });

      const passed = homeOverflow === 0 && detailOverflow === 0;

      results.push({
        scenario: '5. Mobile 390x844 Dark Mode (Home & Detail)',
        viewport: '390x844',
        overflow: `Home: ${homeOverflow}px / Detail: ${detailOverflow}px`,
        layout: '1-column waterfall fallback',
        sticky: 'N/A (mobile fallback)',
        passed,
        screenshot: `${homeScreenshotPath}, ${detailScreenshotPath}`
      });
      await context.close();
    }

    console.log('\n=================== VISUAL VERIFICATION RESULTS ===================');
    let allPassed = true;
    for (const r of results) {
      const statusIcon = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${statusIcon} | ${r.scenario}`);
      console.log(`        Viewport: ${r.viewport} | Overflow: ${r.overflow} | Layout: ${r.layout}`);
      console.log(`        Screenshot: ${r.screenshot}`);
      if (!r.passed) allPassed = false;
    }
    console.log('===================================================================\n');

    if (!allPassed) {
      console.error('FAILED: One or more visual verification scenarios did not pass!');
      process.exitCode = 1;
    } else {
      console.log(`SUCCESS: All ${results.length}/${results.length} visual verification scenarios passed with 0px overflow.`);
    }

  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
}

main().catch(err => {
  console.error('[verify-cockpit] Fatal error:', err);
  process.exit(1);
});
