import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const tableLayout of ['grouped','separate']) {
 for(const columns of [
  ['cpu','memory','download','latency','expiry'],
  ['memory','latency'],
  ['cpu'],
 ]) test(`visible groups ${tableLayout} ${columns.join('-')}`,async({page})=>{
  await page.setViewportSize({width:1440,height:1000})
  await page.addInitScript(({columns,tableLayout})=>{
   localStorage.setItem('monitor-next-table-columns-v1',JSON.stringify({
    columns,mobileColumns:['cpu','latency'],columnsVersion:5,
    tableLayout,mobileTableLayout:'grouped',
   }))
  },{columns,tableLayout})
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes()}}))
  await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
  await page.goto('/')
  await page.getByRole('button',{name:'表格视图',exact:true}).click()
  const heads=page.locator('.node-table thead th')
  const keys=await heads.evaluateAll(es=>es.map(e=>e.getAttribute('data-column')))
  const firstResource=columns[0]
  await expect(page.locator(`th[data-column="${firstResource}"]`)).toHaveAttribute('data-group-start','true')
  if(columns.includes('memory')&&columns.includes('cpu'))
   await expect(page.locator('th[data-column=memory]')).toHaveAttribute('data-group-start','false')
  if(columns.includes('latency'))
   await expect(page.locator('th[data-column=latency]')).toHaveAttribute('data-group-start','true')
  const header=page.locator(`th[data-column="${firstResource}"]`)
  await header.locator('button').click()
  await expect(header).toHaveAttribute('aria-sort','ascending')
  expect(await heads.evaluateAll(es=>es.map(e=>e.getAttribute('data-column')))).toEqual(keys)
  const cell=page.locator('.node-table tbody tr').first().locator(`td[data-column="${firstResource}"]`)
  await expect(cell).toHaveAttribute('data-group-start','true')
  expect(await cell.evaluate(el=>parseFloat(getComputedStyle(el).borderLeftWidth))).toBeGreaterThan(0)
  await expect(page.locator('.node-table tbody tr')).toHaveCount(6)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 })
}
