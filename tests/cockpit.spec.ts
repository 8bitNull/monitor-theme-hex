import {test, expect, type Page} from '@playwright/test'
import {nodes, metrics} from '../scripts/fixtures.mjs'

const fresh = (id = 1, name = `Node ${id}`, rate = 0) => {
 const node = nodes()[0]
 return {...node, id, name, last_seen: Math.floor(Date.now()/1000), metrics: {...node.metrics, cpu: 5, net_rx: rate, net_tx: 0}}
}
async function fleet(page: Page, reports: ReturnType<typeof nodes>, config: Record<string, unknown> = {}) {
 await page.route('**/api/themes/hex/config', r => r.fulfill({json: {cockpitMode: true, module_map: false, ...config}}))
 await page.route('**/api/nodes', r => r.fulfill({json: {nodes: reports}}))
 await page.route('**/api/nodes/*/metrics?*', r => r.fulfill({json: metrics()}))
}

for (const state of ['offline', 'stale', 'missing', 'empty'] as const) {
 test(`fleet ${state} never claims every system is healthy`, async ({page}) => {
  const node = fresh()
  const reports = state === 'empty' ? [] : [state === 'offline' ? {...node, online: false} : state === 'stale' ? {...node, last_seen: Math.floor(Date.now()/1000)-120} : {...node, metrics: null}]
  await fleet(page, reports)
  await page.goto('/')
  const status = page.locator('.cockpit-status-card').getByRole('status')
  await expect(status).toBeVisible()
  await expect(status).not.toContainText('全系统健康运转中')
  await expect(status).not.toHaveClass(/is-healthy/)
  await expect(status).toContainText({offline: '离线', stale: '数据过期', missing: '缺失数据', empty: '暂无节点'}[state])
  await expect(page.locator('.cockpit-leaderboard')).toContainText('暂无实时网络吞吐数据')
  await expect(page.locator('.cockpit-leaderboard').getByRole('button')).toHaveCount(0)
 })
}

test('mixed fleet identifies each unavailable state and counts only live nodes as normal', async ({page}) => {
 await fleet(page, [fresh(), {...fresh(2), online: false}, {...fresh(3), last_seen: Math.floor(Date.now()/1000)-120}, {...fresh(4), metrics: null}])
 await page.goto('/')
 const status = page.locator('.cockpit-status-card').getByRole('status')
 await expect(status).toContainText('1/4 正常')
 for (const label of ['1 离线', '1 数据过期', '1 缺失数据']) await expect(status).toContainText(label)
 await expect(status).not.toContainText('全系统健康运转中')
})

test('fresh idle fleet remains healthy and displays valid zero throughput', async ({page}) => {
 await fleet(page, [fresh(1, 'Idle A'), fresh(2, 'Idle B')])
 await page.goto('/')
 await expect(page.locator('.cockpit-status-card').getByRole('status')).toContainText('全系统健康运转中 · 2/2 正常')
 const list = page.locator('.cockpit-leaderboard').getByRole('list')
 await expect(list.getByRole('button', {name: '查看 Idle A', exact: true})).toBeVisible()
 await expect(list.getByRole('button', {name: '查看 Idle B', exact: true})).toBeVisible()
 await expect(list.locator('.throughput-down')).toHaveText(['0 B/s', '0 B/s'])
 await expect(list.locator('.throughput-up')).toHaveText(['0 B/s', '0 B/s'])
 await expect(page.locator('.cockpit-leaderboard')).not.toContainText('暂无实时网络吞吐数据')
})

test('rankings omit stale, offline and missing metrics while preserving a live zero', async ({page}) => {
 await fleet(page, [fresh(), {...fresh(2, 'Stale', 9999), last_seen: Math.floor(Date.now()/1000)-120}, {...fresh(3, 'Offline', 9999), online: false}, {...fresh(4, 'Missing'), metrics: null}])
 await page.goto('/')
 const list = page.locator('.cockpit-leaderboard').getByRole('list')
 await expect(list.getByRole('button')).toHaveCount(1)
 await expect(list.getByRole('button')).toHaveAccessibleName('查看 Node 1')
})

test('rankings sort total throughput and keep the five fastest valid nodes', async ({page}) => {
 await fleet(page, [fresh(1, 'A', 100), {...fresh(2, 'B', 150), metrics: {...fresh().metrics, net_rx: 150, net_tx: 500}}, fresh(3, 'C', 300), fresh(4, 'D', 400), fresh(5, 'E', 500), fresh(6, 'F', 600)])
 await page.goto('/')
 const list = page.locator('.cockpit-leaderboard').getByRole('list')
 await expect(list.getByRole('listitem')).toHaveCount(5)
 await expect(list.getByRole('button')).toHaveCount(5)
 await expect(list.locator('.leaderboard-name')).toHaveText(['B', 'F', 'E', 'D', 'C'])
})

for (const key of ['Enter', 'Space']) test(`leaderboard exposes buttons and ${key} opens a filtered-out target`, async ({page}) => {
 await fleet(page, [fresh(1, 'Visible', 100), fresh(2, 'Hidden', 200)])
 await page.goto('/')
 await page.getByRole('searchbox', {name: '搜索节点', exact: true}).fill('Visible')
 await expect(page.locator('.node-card')).toHaveCount(1)
 const button = page.locator('.cockpit-leaderboard').getByRole('button', {name: '查看 Hidden', exact: true})
 await expect(button).toBeVisible()
 await button.focus()
 await page.keyboard.press(key)
 await expect(page).toHaveURL(/\/node\/2$/)
 await expect(page.locator('.node-detail')).toBeVisible()
})

test('active load alerts still open the local load records', async ({page}) => {
 const node = fresh()
 await fleet(page, [{...node, metrics: {...node.metrics, cpu: 90}}])
 await page.goto('/')
 const badge = page.locator('.cockpit-status-card').getByRole('button', {name: '查看高负载记录详情'})
 await expect(badge).toContainText('1 项告警进行中')
 await badge.click()
 await expect(page.getByRole('dialog')).toBeVisible()
 await expect(page.getByRole('dialog')).toContainText('Node 1')
})

test('backend cockpit and glass settings win over legacy local settings after reload', async ({page}) => {
 let cockpitMode = false
 await page.addInitScript(() => localStorage.setItem('monitor-next', JSON.stringify({schemaVersion: 3, cockpitMode: true, glass: true, appearance: 'dark'})))
 await page.route('**/api/themes/hex/config', r => r.fulfill({json: {cockpitMode, glass: false, module_map: false}}))
 await page.route('**/api/nodes', r => r.fulfill({json: {nodes: [fresh()]}}))
 await page.route('**/api/nodes/*/metrics?*', r => r.fulfill({json: metrics()}))
 await page.goto('/')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-cockpit', 'false')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-glass', 'false')
 await expect(page.locator('.cockpit-leaderboard')).toHaveCount(0)
 cockpitMode = true
 await page.reload()
 await expect(page.locator('.next-theme')).toHaveAttribute('data-cockpit', 'true')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-glass', 'false')
 await expect(page.locator('html')).toHaveClass(/\bdark\b/)
 await page.locator('.node-open').click()
 await expect(page.locator('.node-detail')).toHaveAttribute('data-cockpit', 'true')
 cockpitMode = false
 await page.reload()
 await expect(page.locator('.node-detail')).toHaveAttribute('data-cockpit', 'false')
})

test('leaderboard opens a target outside the current table page', async ({page}) => {
 await fleet(page, Array.from({length: 45}, (_, i) => ({...fresh(i+1, `Node ${i+1}`, i*1024), sort: i})))
 await page.goto('/')
 await page.getByRole('button', {name: '表格视图', exact: true}).click()
 await expect(page.locator('tbody tr')).toHaveCount(20)
 await page.locator('.cockpit-leaderboard').getByRole('button', {name: '查看 Node 45', exact: true}).click()
 await expect(page).toHaveURL(/\/node\/45$/)
 await page.getByRole('button', {name: '返回总览', exact: true}).click()
 await expect(page.locator('tbody tr')).toHaveCount(20)
})

test('leaderboard scrolls to a visible card with reduced motion', async ({page}) => {
 await page.emulateMedia({reducedMotion: 'reduce'})
 await fleet(page, Array.from({length: 12}, (_, i) => fresh(i+1, `Node ${i+1}`, i*1024)))
 await page.goto('/')
 const target = page.locator('.node-card').filter({has: page.locator('[data-node-id="12"]')})
 await page.locator('.cockpit-leaderboard').getByRole('button', {name: '查看 Node 12', exact: true}).click()
 await expect(target).toHaveClass(/node-card-highlight/)
 await expect(target).toHaveCSS('animation-name', 'none')
 await expect(page).toHaveURL(/\/$/)
 await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
})

test('cockpit map filters the list and clearing the region restores the fleet', async ({page}) => {
 await fleet(page, [fresh(), {...fresh(2), country: 'HK'}], {module_map: true})
 await page.goto('/')
 const marker = page.locator('.map-cluster[data-region="JP"]')
 await expect(marker).toBeVisible()
 await marker.click()
 await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.node-card')).toContainText('Node 1')
 await expect(page.locator('#node-results')).toBeFocused()
 await page.getByRole('button', {name: '清除地区筛选', exact: true}).click()
 await expect(page.locator('.node-card')).toHaveCount(2)
})

test('map failure preserves list and leaderboard actions', async ({page}) => {
 await fleet(page, [fresh(1, 'Available', 1024)], {module_map: true})
 await page.route('**/assets/WorldMap-*.js', r => r.abort())
 await page.goto('/')
 await expect(page.locator('.map-frame').getByRole('alert')).toContainText('地图暂时无法加载')
 await expect(page.locator('.node-card')).toBeVisible()
 await expect(page.locator('.cockpit-leaderboard').getByRole('button', {name: '查看 Available'})).toBeVisible()
 await page.locator('.node-open').click()
 await expect(page).toHaveURL(/\/node\/1$/)
})

test('pending nodes keep the cockpit map loading without a healthy claim', async ({page}) => {
 await fleet(page, [fresh()], {module_map: true})
 let finish!: () => void
 const pending = new Promise<void>(resolve => {finish = resolve})
 await page.route('**/api/nodes', async r => {await pending; await r.fulfill({json: {nodes: [fresh()]}})})
 await page.goto('/')
 await expect(page.getByLabel('正在加载节点')).toBeVisible()
 await expect(page.locator('.map-frame')).toContainText('等待节点数据')
 await expect(page.locator('.cockpit-status-card')).toHaveCount(0)
 finish()
 await expect(page.locator('.node-card')).toBeVisible()
 await expect(page.locator('.cockpit-status-card').getByRole('status')).toContainText('1/1 正常')
})

for (const cockpitMode of [true, false]) for (const width of [320,390,768,900,1024,1280,1366,1440,1920]) {
 test(`${cockpitMode ? 'cockpit' : 'classic'} home and detail stay contained at ${width}px in both themes`, async ({page}) => {
  test.setTimeout(60000)
  await page.setViewportSize({width, height: 900})
  await page.addInitScript(() => localStorage.setItem('monitor-next-language', 'en'))
  const long = {...fresh(1, 'Long node name 东京 '.repeat(12), 123456789), cpu_name: 'Long processor model '.repeat(20), kernel: 'production-kernel-'.repeat(16), ipv6: '2001:db8:1234:5678:abcd:1234:5678:abcd'}
  await fleet(page, [long, {...fresh(2), online: false}, {...fresh(3), last_seen: Math.floor(Date.now()/1000)-120}], {cockpitMode})
  for (const appearance of ['light', 'dark']) {
   await page.addInitScript(appearance => localStorage.setItem('monitor-next', JSON.stringify({appearance})), appearance)
   await page.goto('/')
   await expect(page.locator(width <= 720 ? '.ma-node' : '.node-card').first()).toBeVisible()
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
   await page.goto('/node/1')
   await expect(page.locator('.node-detail')).toBeVisible()
   if (width > 720) {
    await expect(page.locator('.recharts-area-curve').first()).toBeVisible()
    const live = page.locator('.detail-live')
    await expect(live).toBeVisible()
    expect(await live.evaluate(e => e.scrollWidth <= e.clientWidth+1)).toBe(true)
    for (const card of await page.locator('.detail-metric-card').all()) {
     expect(await card.evaluate(e => e.scrollWidth <= e.clientWidth+1)).toBe(true)
    }
    if (width >= 1024 && cockpitMode) {
     const side = (await page.locator('.detail-cockpit-sidebar').boundingBox())!
     const chart = (await page.locator('.detail-cockpit-main').boundingBox())!
     expect(chart.x).toBeGreaterThanOrEqual(side.x+side.width)
     expect(chart.x+chart.width).toBeLessThanOrEqual(width)
     expect(await page.locator('.detail-cockpit-sidebar').evaluate(e => e.scrollWidth <= e.clientWidth+1)).toBe(true)
    }
    const preview = page.getByRole('button', {name: 'View disk history trend', exact: true})
    await preview.click()
    await expect(page.locator('.detail-resource-charts')).toHaveAttribute('data-metric', 'disk_used')
   } else {
    await page.getByRole('navigation', {name: 'Node detail sections'}).getByRole('button', {name: 'Info', exact: true}).click()
    await expect(page.locator('.fact-value').filter({hasText: 'Long processor model'})).toBeVisible()
   }
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
 })
}

for (const graph of ['bar', 'ring', 'columns', 'minimal']) test(`cockpit ${graph} metrics stay readable in the narrow sidebar`, async ({page}) => {
 await page.setViewportSize({width: 1024, height: 900})
 await fleet(page, [fresh(1, 'Network', 123456789)], {graph})
 await page.goto('/node/1')
 await expect(page.locator('.recharts-area-curve').first()).toBeVisible()
 await expect(page.locator('.detail-metric-network .speed-amount').first()).toHaveText('0.0')
 for (const selector of ['.detail-live', '.detail-metric-network', '.detail-metric-network .upload', '.detail-metric-network .download']) {
  expect(await page.locator(selector).evaluate(e => e.scrollWidth <= e.clientWidth+1)).toBe(true)
 }
 expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
