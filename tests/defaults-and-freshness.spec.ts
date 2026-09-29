import {chooseOption} from './select'
import {setting,settingsButton} from './settings'
import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'
import {toggleSettings,visualSelect} from './settings'

test.skip('site defaults propagate while explicit choices and module overrides persist (legacy theme overrides removed)',async({page})=>{
 let config:any={palette:'ocean',graph:'columns',modules:{regions:false,clock:false}}
 await page.route('**/theme-config.json',r=>r.fulfill({json:config}))
 await page.goto('/')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','ocean')
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('monitor-next')!))).not.toHaveProperty('palette')
 await toggleSettings(page);await visualSelect(page,'palette','rose');await (await setting(page,'当前时间',{exact:true})).check();await toggleSettings(page)
 config={palette:'forest',graph:'bar',modules:{regions:true,clock:false}}
 await page.reload()
 await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','rose')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','bar')
 await toggleSettings(page)
 await expect((await setting(page,'地区统计',{exact:true}))).toBeChecked();await expect((await setting(page,'当前时间',{exact:true}))).toBeChecked()
 await (await settingsButton(page,'恢复默认外观',{exact:true})).click();await toggleSettings(page)
 await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','forest')
 config={...config,palette:'ocean',graph:'minimal'};await page.reload()
 await expect(page.locator('.next-theme')).toHaveAttribute('data-palette','ocean')
 await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','minimal')
})

test('stale reports and transport loss invalidate every live view and recover',async({page})=>{
 await page.clock.install()
 let fail=false,stale=false
 await page.route('**/api/nodes',r=>fail?r.fulfill({status:503}):r.fulfill({json:{nodes:[{...nodes()[0],last_seen:Math.floor(Date.now()/1000)-(stale?120:0)}]}}))
 await page.goto('/')
 const card=page.locator('.node-card')
 await expect(card.locator('.bar-number').first()).toHaveText('28.0%')
 fail=true;await page.clock.runFor(21000)
 await expect(card.locator('.status-pill')).toHaveText('数据已过期')
 await expect(card.locator('.bar-number').first()).toHaveText('—')
 await expect(card.locator('.speed-indicators strong').first()).toHaveText('—')
 await expect(page.locator('.summary-grid>div').nth(2)).toContainText('1 个节点暂无实时数据')
 await page.getByLabel('表格视图').click();await expect(page.locator('tbody tr .status-pill')).toHaveText('数据已过期');await expect(page.locator('.table-metric')).toHaveCount(0)
 await page.locator('.table-node-name').click();await expect(page.locator('.overview-unavailable')).toContainText('数据已过期');await expect(page.locator('.desktop-detail-metrics')).toHaveCount(0);await expect(page.locator('.overview-account')).toBeVisible()
 fail=false;await page.clock.runFor(5001)
 await expect(page.locator('.detail-metric-card[data-metric=cpu] .detail-metric-value')).toHaveText('28.0%')
 stale=true;await page.clock.runFor(5001)
 await expect(page.locator('.overview-unavailable')).toContainText('数据已过期');await expect(page.locator('.desktop-detail-metrics')).toHaveCount(0);await expect(page.locator('.overview-account')).toBeVisible()
})

test('route selection explicitly distinguishes inherited and fixed routes',async({page})=>{
 await page.goto('/')
 const first=page.locator('.node-card').first();const select=first.getByLabel('节点探测线路')
 await select.click();await expect(page.getByRole('option').first()).toHaveText(/全局：/);await page.keyboard.press('Escape')
 await select.scrollIntoViewIfNeeded();await chooseOption(select,{index:1})
 await expect(first.getByRole('button',{name:'恢复跟随全局线路'})).toBeVisible()
 await first.getByRole('button',{name:'恢复跟随全局线路'}).click()
 await expect(select).toHaveAttribute('data-value','auto')
 await expect(first.getByRole('button',{name:'恢复跟随全局线路'})).toHaveCount(0)
})

test('partial stale fleet excludes expired high load and traffic from live totals',async({page})=>{
 const [fresh,old]=nodes()
 old.last_seen=Math.floor(Date.now()/1000)-120
 old.metrics={...old.metrics!,cpu:99,net_rx:100000000,net_tx:100000000}
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[fresh,old]}}))
 await page.goto('/')
 await expect(page.locator('.node-card').nth(1).locator('.bar-number').first()).toHaveText('—')
 await expect(page.locator('.high-load-alert')).toHaveCount(0)
 const summary=page.locator('.summary-grid>div')
 await expect(summary.first()).toContainText('0 离线 · 1 待更新')
 await expect(summary.nth(2).locator('.summary-total')).toHaveText('1.30 Mbps')
 await expect(summary.nth(2)).toContainText('1 个节点暂无实时数据')
})
