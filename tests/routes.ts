import {expect,type Page} from '@playwright/test'
export async function expandRoutes(page:Page){
 const expand=page.getByRole('button',{name:/^(比较线路|收起线路|Compare routes|Collapse routes)$/})
 await expect(expand).toBeVisible()
 if(await expand.getAttribute('aria-expanded')==='false')await expand.click()
 await expect(expand).toHaveAttribute('aria-expanded','true')
 await expect(page.locator('.route-chips')).toBeVisible()
}
