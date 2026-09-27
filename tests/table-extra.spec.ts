// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'
import {availableTableColumns} from '../src/lib/browse'

test('all extra metrics preserve zero, offline and missing values',async({page})=>{
 await page.addInitScript(columns=>sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({columnsVersion:5,columns,tableLayout:'grouped',view:'table'})),availableTableColumns)
 await page.route('**/api/nodes',r=>{const n=nodes()[0];return r.fulfill({json:{nodes:[{...n,price:0,day_rx:0,day_tx:0,metrics:{...n.metrics,tcp:0,udp:8,uptime:0,load:[0,1.25,2.5],swap_total:1024,swap_used:512,procs:0}},{...n,id:2,name:'Offline',online:false},{...n,id:3,name:'Missing',last_seen:0,metrics:null}]}})})
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),loss:{1:0}}}))
 await page.goto('/');const row=page.locator('tbody tr').first(),cell=(key:string)=>row.locator(`[data-column=${key}]`)
 await expect(page.locator('thead th')).toHaveCount(21)
 await expect(cell('connections')).toHaveText('TCP 0UDP 8');await expect(cell('uptime')).toHaveText('0 分');await expect(cell('processes')).toHaveText('0')
 await expect(cell('billing')).toContainText('$0.00 USD');await expect(cell('todayTraffic')).toContainText('上传 0 B下载 0 B')
 await expect(cell('swap')).toContainText('50.0%');await expect(cell('load')).toContainText('0.00 / 1.25 / 2.50')
 await expect(cell('system')).toContainText('x86_64');await expect(cell('country')).toHaveText('日本');await expect(cell('lastSeen').locator('time')).toHaveAttribute('datetime',/T/)
 for(const i of [1,2])for(const key of ['connections','uptime','load','swap','processes'])await expect(page.locator('tbody tr').nth(i).locator(`[data-column=${key}]`)).not.toContainText(/NaN|undefined|Infinity|96%/)
 await expect(page.locator('tbody tr').nth(2).locator('[data-column=lastSeen]')).toHaveText('—')
 await cell('loss').scrollIntoViewIfNeeded();await expect(cell('loss')).toContainText('0.0%');await expect(cell('probe')).toContainText('Tokyo gateway');await expect(cell('latency')).not.toContainText('Tokyo gateway');await expect(cell('latency')).not.toContainText('丢包')
})

test('compact desktop can show only packet loss or only the probe route and retains selection',async({page})=>{
 await page.setViewportSize({width:800,height:844});await page.addInitScript(()=>{if(!sessionStorage.getItem('monitor-next-browse-v1'))sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({columnsVersion:5,columns:['loss'],view:'table',tableLayout:'grouped'}))})
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:{...metrics(),loss:{1:0}}}));await page.goto('/');await expect(page.locator('thead th')).toHaveCount(3);await expect(page.locator('td[data-column=loss]').first()).toContainText('0.0%')
 await page.evaluate(()=>localStorage.setItem('monitor-next-table-columns-v1',JSON.stringify({columnsVersion:5,columns:['probe'],mobileColumns:['probe'],tableLayout:'grouped',mobileTableLayout:'grouped'})))
 await page.reload()
 await expect(page.locator('thead [data-column=loss]')).toHaveCount(0);await expect(page.locator('td[data-column=probe]').first()).toContainText('Tokyo gateway');await expect(page.locator('thead th')).toHaveCount(3)
 await page.reload();await expect(page.locator('thead [data-column=probe]')).toHaveCount(1);await expect(page.locator('thead [data-column=latency]')).toHaveCount(0)
})

test('compact desktop hides an empty remark column and keeps remark details when current results contain one',async({page})=>{
 await page.setViewportSize({width:800,height:844})
 await page.addInitScript(()=>sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({columnsVersion:5,mobileColumns:['cpu','latency'],view:'table',mobileTableLayout:'grouped'})))
 await page.route('**/api/nodes',route=>{const node=nodes()[0];return route.fulfill({json:{nodes:[{...node,remark:''},{...node,id:2,name:'With note',remark:'first detail；second detail'}]}})})
 await page.goto('/')
 await expect(page.locator('thead [data-column=remark]')).toHaveCount(1)
 await page.getByLabel('查看备注：With note').click()
 await expect(page.getByRole('dialog')).toContainText('first detail；second detail')
 await page.getByRole('dialog').getByRole('button',{name:'关闭'}).click()
 await page.route('**/api/nodes',route=>{const node=nodes()[0];return route.fulfill({json:{nodes:[{...node,remark:''},{...node,id:2,name:'Still empty',remark:'   '}]}})})
 await page.reload()
 await expect(page.locator('thead [data-column=remark]')).toHaveCount(0)
 await expect(page.locator('.table-scroll')).toHaveAttribute('aria-label','节点表格，可横向滚动')
})

test('legacy network columns expand without restoring hidden metrics',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('monitor-next-table-columns-v1',JSON.stringify({columnsVersion:4,columns:['latency'],mobileColumns:['cpu','latency'],tableLayout:'grouped',mobileTableLayout:'grouped'})))
 await page.goto('/');await page.getByLabel('表格视图',{exact:true}).click();await expect(page.locator('thead th')).toHaveCount(5);await expect(page.locator('thead [data-column=loss]')).toHaveCount(1);await expect(page.locator('thead [data-column=cpu]')).toHaveCount(0)
 await page.setViewportSize({width:390,height:844});await expect(page.locator('.ma-node')).toHaveCount(6);await expect(page.locator('table')).toHaveCount(0)
 await page.setViewportSize({width:800,height:844});await expect(page.locator('thead th')).toHaveCount(5);await expect(page.locator('thead [data-column=cpu]')).toHaveCount(0)
})
