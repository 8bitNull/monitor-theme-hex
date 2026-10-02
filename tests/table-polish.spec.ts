// Desktop composition coverage; phone workflows live in mobile-app/refinement/charts-refined and ux-* suites.
import {expect,test} from './classicTest'
import {nodes} from '../scripts/fixtures.mjs'

test('desktop table keeps clipped headers out of view while retaining horizontal access',async({page})=>{
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:nodes()}}))
 await page.setViewportSize({width:1280,height:900})
 await page.goto('/')
 await page.getByRole('button',{name:'表格视图',exact:true}).click()
 const shell=page.locator('.table-shell'),scroll=page.locator('.table-scroll')
 await expect(shell).toHaveAttribute('data-right','true')
 const clipped=page.locator('.node-table th[data-partial]')
 await expect(clipped).toHaveCount(1)
 await expect(clipped).toHaveCSS('color','rgba(0, 0, 0, 0)')
 const columns=await page.locator('.node-table thead th').evaluateAll(headers=>headers.map(header=>header.getAttribute('data-column')))
 expect(columns).toContain('remark')
 await page.locator('.desktop-results-toolbar').getByRole('button',{name:'向右查看其他列'}).click()
 await expect(shell).toHaveAttribute('data-left','true')
 await expect(page.locator('th[data-column=remark]')).not.toHaveAttribute('data-partial','')

 await page.setViewportSize({width:1440,height:900})
 await scroll.evaluate(element=>{element.scrollLeft=0})
 await expect(shell).toHaveAttribute('data-right','false')
 await expect(clipped).toHaveCount(0)

 await page.setViewportSize({width:390,height:844})
 await expect(page.locator('.ma-node')).toHaveCount(6)
 await expect(page.locator('.node-table')).toHaveCount(0)
 await expect(clipped).toHaveCount(0)
})
