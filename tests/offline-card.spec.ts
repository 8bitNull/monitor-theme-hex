import {test,expect,type Page} from './desktopTest'
import {nodes,metrics} from '../scripts/fixtures.mjs'

async function setup(page:Page){
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes()}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:metrics()}))
 await page.goto('/')
}

test('offline card condenses live readings while retaining report, billing, and routes',async({page})=>{
 await setup(page)

 const offline=page.locator('.node-card.node-offline')
 await expect(offline).toHaveCount(1)
 await expect(offline.locator('.node-heading .status-pill')).toContainText('离线')
 await expect(offline.locator('.offline-last-report time')).toHaveAttribute('datetime',/T/)
 await expect(offline.locator('.card-billing .traffic-summary')).toBeVisible()
 await expect(offline.locator('.resources,.card-network,.speed-pair,.node-connections,.card-uptime')).toHaveCount(0)
 await expect(offline.locator('.route-matrix')).toBeVisible()

 const online=page.locator('.node-card:not(.node-offline)').first()
 await expect(online.locator('.resources,.card-network')).toHaveCount(2)
})

test('offline card fits a narrow homepage viewport',async({page})=>{
 await page.setViewportSize({width:320,height:844})
 await setup(page)
 await expect(page.locator('.ma-node[data-state=offline]')).toContainText('离线')
 await expect(page.locator('.ma-node[data-state=offline] .ma-notice')).toBeVisible()
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy()
})
