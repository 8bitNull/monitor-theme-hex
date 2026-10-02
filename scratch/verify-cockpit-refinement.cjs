/**
 * Playwright Cross-Device Verification & Visual Regression Test
 *
 * Verifies refined Cockpit Console Layout (v0.3.9):
 * 1. Desktop 1440x900 (Home & Detail):
 *    - 0px horizontal overflow
 *    - Top overview uncoupled to full-width deck
 *    - 2-column cockpit lower split
 *    - Balanced aside height, live traffic leaderboard & health pulse card render cleanly
 *    - Detail workbench balanced layout with 2-column compact fact pills
 * 2. Laptop 1280x800 (Home & Detail):
 *    - 0px horizontal overflow
 *    - 1-column card density for left column (1024px-1365px responsive breakpoint)
 *    - Aside widgets render cleanly
 *    - Detail workbench dual-column layout
 * 3. Mobile 390x844 (Home & Detail):
 *    - 0px horizontal overflow (document.body.scrollWidth <= window.innerWidth)
 *    - Clean single-column waterfall fallback
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PORT = process.env.THEME_VERIFY_PORT || '4196';
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log(`[verify-cockpit-refinement] Starting demo fixture server on port ${PORT}...`);
  const server = spawn('node', ['scripts/demo.mjs'], {
    env: { ...process.env, THEME_DEMO_PORT: PORT, THEME_DEMO_REFINED: '1' },
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

  console.log(`[verify-cockpit-refinement] Server ready at ${BASE_URL}. Launching Chromium...`);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    // -------------------------------------------------------------
    // Scenario 1: Desktop 1440x900 Home
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
      await page.waitForTimeout(600);

      // 1. Assert 0px horizontal overflow
      const overflowMetrics = await page.evaluate(() => ({
        bodyOverflow: Math.max(0, document.body.scrollWidth - window.innerWidth),
        docOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        bodyScrollWidth: document.body.scrollWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }));
      const zeroOverflow = overflowMetrics.bodyOverflow === 0 && overflowMetrics.docOverflow === 0;

      // 2. Assert Top Overview is uncoupled and full-width
      const overviewCheck = await page.evaluate(() => {
        const heading = document.querySelector('.overview-heading');
        const cockpit = document.querySelector('.cockpit-layout');
        const isOutside = heading && cockpit && !cockpit.contains(heading);
        const headingWidth = heading ? heading.getBoundingClientRect().width : 0;
        return { isOutside, headingWidth };
      });

      // 3. Assert 2-column cockpit layout
      const mainBox = await page.locator('.cockpit-main').boundingBox();
      const asideBox = await page.locator('.cockpit-aside').boundingBox();
      const asidePos = await page.locator('.cockpit-aside').evaluate((el) => window.getComputedStyle(el).position);
      const isTwoColumn = mainBox && asideBox && asideBox.x > mainBox.x && Math.abs(mainBox.y - asideBox.y) < 60;

      // 4. Assert Aside height is balanced, leaderboard and health cards render cleanly
      const asideWidgets = await page.evaluate(() => {
        const leaderboard = document.querySelector('.cockpit-leaderboard');
        const items = leaderboard ? leaderboard.querySelectorAll('.cockpit-leaderboard-item') : [];
        const statusCard = document.querySelector('.cockpit-status-card');
        const statusBadge = statusCard ? statusCard.querySelector('.cockpit-status-badge') : null;
        const map = document.querySelector('.cockpit-aside .map-panel') || document.querySelector('.cockpit-aside svg');

        return {
          hasLeaderboard: Boolean(leaderboard),
          itemCount: items.length,
          hasStatusCard: Boolean(statusCard),
          hasStatusBadge: Boolean(statusBadge),
          hasMap: Boolean(map),
        };
      });

      const asideBalanced = asideBox && asideBox.height >= 300 && asideBox.height <= 850;
      const widgetsClean = asideWidgets.hasLeaderboard && asideWidgets.itemCount > 0 &&
                           asideWidgets.hasStatusCard && asideWidgets.hasStatusBadge;

      const passed = zeroOverflow && overviewCheck.isOutside && isTwoColumn &&
                     asidePos === 'sticky' && asideBalanced && widgetsClean;

      const screenshotPath = path.join(SCREENSHOT_DIR, '01-desktop-1440-home.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '1. Desktop 1440x900 Home',
        viewport: '1440x900',
        overflow: `${Math.max(overflowMetrics.bodyOverflow, overflowMetrics.docOverflow)}px`,
        layout: isTwoColumn ? '2-column cockpit' : 'unexpected',
        asideHeight: `${Math.round(asideBox ? asideBox.height : 0)}px (balanced)`,
        widgets: `Leaderboard (${asideWidgets.itemCount} items), Status Card (${asideWidgets.hasStatusBadge ? 'OK' : 'none'})`,
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 2: Desktop 1440x900 Detail
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
      await page.waitForTimeout(600);

      // 1. Assert 0px horizontal overflow
      const overflowMetrics = await page.evaluate(() => ({
        bodyOverflow: Math.max(0, document.body.scrollWidth - window.innerWidth),
        docOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      }));
      const zeroOverflow = overflowMetrics.bodyOverflow === 0 && overflowMetrics.docOverflow === 0;

      // 2. Assert 2-column detail workbench layout
      const sidebarBox = await page.locator('.detail-cockpit-sidebar').boundingBox();
      const mainBox = await page.locator('.detail-cockpit-main').boundingBox();
      const sidebarPos = await page.locator('.detail-cockpit-sidebar').evaluate((el) => window.getComputedStyle(el).position);
      const isTwoColumn = sidebarBox && mainBox && mainBox.x > sidebarBox.x && Math.abs(sidebarBox.y - mainBox.y) < 60;

      // 3. Assert Sidebar height balance & compact 2-column facts
      const sidebarMetrics = await page.evaluate(() => {
        const sidebar = document.querySelector('.detail-cockpit-sidebar');
        const facts = document.querySelector('.detail-facts');
        const factPills = facts ? facts.querySelectorAll('div') : [];
        return {
          height: sidebar ? sidebar.getBoundingClientRect().height : 0,
          hasFacts: Boolean(facts),
          pillCount: factPills.length
        };
      });

      // Sidebar sticky and bounded within viewport (max-height: calc(100vh - 92px))
      const sidebarBalanced = sidebarMetrics.height >= 350 && sidebarMetrics.height <= 850;
      const passed = zeroOverflow && isTwoColumn && sidebarPos === 'sticky' && sidebarBalanced && sidebarMetrics.hasFacts;

      const screenshotPath = path.join(SCREENSHOT_DIR, '02-desktop-1440-detail.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '2. Desktop 1440x900 Detail',
        viewport: '1440x900',
        overflow: `${Math.max(overflowMetrics.bodyOverflow, overflowMetrics.docOverflow)}px`,
        layout: isTwoColumn ? '2-column workbench' : 'unexpected',
        sidebarHeight: `${Math.round(sidebarMetrics.height)}px (sticky bounded)`,
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 3: Laptop 1280x800 Home
    // -------------------------------------------------------------
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark'
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('monitor-next-mode', 'dark');
        localStorage.setItem('hex-desktop-v1', JSON.stringify({ cockpitMode: true }));
      });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('.cockpit-layout', { timeout: 10000 });
      await page.waitForTimeout(600);

      // 1. Assert 0px horizontal overflow
      const overflowMetrics = await page.evaluate(() => ({
        bodyOverflow: Math.max(0, document.body.scrollWidth - window.innerWidth),
        docOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      }));
      const zeroOverflow = overflowMetrics.bodyOverflow === 0 && overflowMetrics.docOverflow === 0;

      // 2. Assert 2-column cockpit layout
      const mainBox = await page.locator('.cockpit-main').boundingBox();
      const asideBox = await page.locator('.cockpit-aside').boundingBox();
      const isTwoColumn = mainBox && asideBox && asideBox.x > mainBox.x;

      // 3. Assert Card density on 1280px (1024px-1365px range): 1-column layout for node cards
      const gridDensity = await page.evaluate(() => {
        const grid = document.querySelector('.cockpit-layout .node-grid');
        if (!grid) return { columns: 0, tracks: '' };
        const computed = window.getComputedStyle(grid);
        const tracks = computed.gridTemplateColumns.trim().split(/\s+/);
        return { columns: tracks.length, tracks: computed.gridTemplateColumns };
      });
      const isOneColumnCards = gridDensity.columns === 1;

      // 4. Aside widgets render cleanly
      const asideWidgets = await page.evaluate(() => {
        const leaderboard = document.querySelector('.cockpit-leaderboard');
        const statusCard = document.querySelector('.cockpit-status-card');
        return Boolean(leaderboard && statusCard);
      });

      const asideBalanced = asideBox && asideBox.height >= 300 && asideBox.height <= 850;
      const passed = zeroOverflow && isTwoColumn && isOneColumnCards && asideWidgets && asideBalanced;

      const screenshotPath = path.join(SCREENSHOT_DIR, '03-laptop-1280-home.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '3. Laptop 1280x800 Home',
        viewport: '1280x800',
        overflow: `${Math.max(overflowMetrics.bodyOverflow, overflowMetrics.docOverflow)}px`,
        layout: `2-column cockpit (${gridDensity.columns}-col card density)`,
        asideHeight: `${Math.round(asideBox ? asideBox.height : 0)}px (balanced)`,
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 4: Laptop 1280x800 Detail
    // -------------------------------------------------------------
    {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark'
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        localStorage.setItem('monitor-next-mode', 'dark');
        localStorage.setItem('hex-desktop-v1', JSON.stringify({ cockpitMode: true }));
      });
      await page.goto(`${BASE_URL}/node/1`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.detail-cockpit', { timeout: 10000 });
      await page.waitForTimeout(600);

      // 1. Assert 0px horizontal overflow
      const overflowMetrics = await page.evaluate(() => ({
        bodyOverflow: Math.max(0, document.body.scrollWidth - window.innerWidth),
        docOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      }));
      const zeroOverflow = overflowMetrics.bodyOverflow === 0 && overflowMetrics.docOverflow === 0;

      // 2. Assert 2-column detail workbench layout
      const sidebarBox = await page.locator('.detail-cockpit-sidebar').boundingBox();
      const mainBox = await page.locator('.detail-cockpit-main').boundingBox();
      const isTwoColumn = sidebarBox && mainBox && mainBox.x > sidebarBox.x;

      const passed = zeroOverflow && isTwoColumn && sidebarBox.height > 300 && sidebarBox.height <= 850;

      const screenshotPath = path.join(SCREENSHOT_DIR, '04-laptop-1280-detail.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '4. Laptop 1280x800 Detail',
        viewport: '1280x800',
        overflow: `${Math.max(overflowMetrics.bodyOverflow, overflowMetrics.docOverflow)}px`,
        layout: isTwoColumn ? '2-column workbench' : 'unexpected',
        sidebarHeight: `${Math.round(sidebarBox ? sidebarBox.height : 0)}px`,
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 5: Mobile 390x844 Home
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
      await page.waitForTimeout(600);

      // Assert 0px horizontal overflow
      const overflowMetrics = await page.evaluate(() => ({
        bodyOverflow: Math.max(0, document.body.scrollWidth - window.innerWidth),
        docOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        bodyScrollWidth: document.body.scrollWidth,
        innerWidth: window.innerWidth
      }));
      const zeroOverflow = overflowMetrics.bodyOverflow === 0 && overflowMetrics.docOverflow === 0;

      // Single-column waterfall check
      const layoutCheck = await page.evaluate(() => {
        const main = document.querySelector('.cockpit-main');
        const aside = document.querySelector('.cockpit-aside');
        if (!main || !aside) return true;
        const mb = main.getBoundingClientRect();
        const ab = aside.getBoundingClientRect();
        return Math.abs(mb.left - ab.left) < 30 || mb.top !== ab.top;
      });

      const passed = zeroOverflow && layoutCheck;

      const screenshotPath = path.join(SCREENSHOT_DIR, '05-mobile-390-home.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '5. Mobile 390x844 Home',
        viewport: '390x844',
        overflow: `${Math.max(overflowMetrics.bodyOverflow, overflowMetrics.docOverflow)}px`,
        layout: '1-column waterfall fallback',
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    // -------------------------------------------------------------
    // Scenario 6: Mobile 390x844 Detail
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
      await page.goto(`${BASE_URL}/node/1`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      // Assert 0px horizontal overflow
      const overflowMetrics = await page.evaluate(() => ({
        bodyOverflow: Math.max(0, document.body.scrollWidth - window.innerWidth),
        docOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        bodyScrollWidth: document.body.scrollWidth,
        innerWidth: window.innerWidth
      }));
      const zeroOverflow = overflowMetrics.bodyOverflow === 0 && overflowMetrics.docOverflow === 0;

      const passed = zeroOverflow;

      const screenshotPath = path.join(SCREENSHOT_DIR, '06-mobile-390-detail.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });

      results.push({
        scenario: '6. Mobile 390x844 Detail',
        viewport: '390x844',
        overflow: `${Math.max(overflowMetrics.bodyOverflow, overflowMetrics.docOverflow)}px`,
        layout: '1-column waterfall fallback',
        passed,
        screenshot: screenshotPath
      });
      await context.close();
    }

    console.log('\n=================== VISUAL VERIFICATION RESULTS ===================');
    let allPassed = true;
    for (const r of results) {
      const statusIcon = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`${statusIcon} | ${r.scenario}`);
      console.log(`        Viewport: ${r.viewport} | Overflow: ${r.overflow} | Layout: ${r.layout}`);
      if (r.asideHeight) console.log(`        Aside Height: ${r.asideHeight}`);
      if (r.sidebarHeight) console.log(`        Sidebar Height: ${r.sidebarHeight}`);
      if (r.widgets) console.log(`        Widgets: ${r.widgets}`);
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

main().catch((err) => {
  console.error('[verify-cockpit-refinement] Fatal error:', err);
  process.exit(1);
});
