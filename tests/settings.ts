import type {Page} from '@playwright/test'
export async function setStoredPreference(page:Page,key:string,value:unknown){
 await page.evaluate(({key,value})=>{
  const current=JSON.parse(localStorage.getItem('monitor-next')||'{}')
  localStorage.setItem('monitor-next',JSON.stringify({...current,_storageVersion:1,schemaVersion:3,designVersion:1,[key]:value}))
 },{key,value})
 await page.reload()
}
export async function setSiteDefault(page:Page,key:string,value:unknown){
 const cockpitMode = await page.locator('.next-theme').getAttribute('data-cockpit') === 'true'
 await page.route('**/theme-config.json',route=>route.fulfill({json:{cockpitMode,[key]:value}}))
 await page.route('**/api/themes/hex/config',route=>route.fulfill({status:404}))
 await page.reload()
}
export async function toggleSettings(page:Page) {
 const drawer=page.locator('dialog.settings-drawer')
 if(await drawer.isVisible()) await drawer.getByRole('button',{name:/^(关闭设置|Close settings)$/}).click()
 else {await page.locator('header').getByRole('button',{name:/^(显示与偏好|Display & preferences)$/}).click();await settingsCategory(page,'cards')}
}
export async function visualSelect(page:Page, kind:string,value:string) {
 const names:Record<string,Record<string,string[]>>={palette:{default:['经典蓝','Classic blue'],ocean:['海洋','Ocean'],sunset:['落日','Sunset'],forest:['森林','Forest'],midnight:['午夜','Midnight'],rose:['玫瑰','Rose']},graph:{ring:['圆环','Ring'],bar:['进度条','Bar'],columns:['分段柱条','Columns'],minimal:['极简数字','Minimal']},layout:{comfortable:['舒适','Comfortable'],compact:['紧凑','Compact']}}
 const drawer=page.locator('dialog.settings-drawer')
 await settingsCategory(page,kind==='palette'||kind==='graph'||kind==='layout'?'appearance':'cards')
 const buttons=drawer.locator(kind==='palette'?'.palette-options':kind==='graph'?'.graph-options':'.density-options').getByRole('button')
 const keys=Object.keys(names[kind]);await buttons.nth(keys.indexOf(value)).click()
}

export async function settingsCategory(page:Page,category:'appearance'|'cards'|'network'|'other') {
 const names={appearance:/^(外观|Appearance)$/,cards:/^(显示内容|Display)$/,network:/^(网络|Network)$/,other:/^(偏好|Preferences)$/}
 await page.locator('.settings-nav').getByRole('button',{name:names[category]}).click()
}
export async function setting(page:Page,label:string,options?:{exact?:boolean}) {
 const locator=page.getByLabel(label,options)
 const section=await locator.evaluate(el=>el.closest('[data-settings]')?.getAttribute('data-settings') || (el.closest('.settings-language,.settings-reset')?'other':''))
 const category=({appearance:'appearance','card-info':'cards',indicators:'appearance',layout:'appearance',detail:'cards',table:'cards',routes:'network',home:'cards',alerts:'cards',other:'other'} as const)[section as 'appearance']
 if(category)await settingsCategory(page,category)
 return locator
}
export async function settingsButton(page:Page,label:string,options?:{exact?:boolean}) {
 await settingsCategory(page,'other')
 return page.getByRole('button',{name:label,...options})
}
