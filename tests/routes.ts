import {expect,type Page} from '@playwright/test'
export async function expandRoutes(page:Page){
 await expect(page.locator('.expand-routes')).toHaveCount(0)
 await expect(page.locator('.route-chips')).toBeVisible()
}
