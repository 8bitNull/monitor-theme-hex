import type {Locator} from '@playwright/test'
/** Select through the same visible menu a mouse or keyboard user operates. */
export async function chooseOption(trigger:Locator,value:string|{index:number}){
 const sheet=await trigger.getAttribute('aria-haspopup')==='dialog'
 await trigger.click()
 const options=sheet?trigger.page().getByRole('dialog').locator('button.ma-row[data-value]'):trigger.page().getByRole('option')
 if(typeof value==='string')await options.and(trigger.page().locator(`[data-value=${JSON.stringify(value)}]`)).click()
 else await options.nth(value.index).click()
}
