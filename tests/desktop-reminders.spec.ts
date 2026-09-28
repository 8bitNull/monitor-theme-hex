import {test,expect,type Page} from '@playwright/test'
import {nodes} from '../scripts/fixtures.mjs'

// Catches threshold drift, double counting, lost focus and incorrect detail routing.
function reminderNodes(){
 return nodes().map((n,i)=>({...n,name:['Both reminders','Quota only','Expired offline','Outside thresholds','Invalid expiry','No limits'][i],
  expires_at:['2026-10-05',null,'2026-09-26','2026-10-06','invalid',null][i],
  online:i!==2,traffic_limit:i===5?0:100,month_used:[90,100,0,89,0,1000][i]}))
}
async function setup(page:Page,rows=reminderNodes()){
 await page.clock.setFixedTime(new Date('2026-09-28T12:00:00'))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:rows}}))
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{module_map:false}}))
}
test('reminder count deduplicates nodes and includes exact thresholds and offline expiry',async({page})=>{
 await setup(page);await page.goto('/')
 const trigger=page.getByRole('button',{name:'到期与用量 · 3 个节点需要关注'})
 await expect(trigger).toBeVisible();expect((await trigger.boundingBox())!.height).toBeGreaterThanOrEqual(44);await trigger.click()
 const dialog=page.getByRole('dialog',{name:'到期与用量'})
 await expect(dialog.getByRole('button',{name:/Both reminders/})).toContainText('剩余 7 天')
 await expect(dialog.getByRole('button',{name:/Both reminders/})).toContainText('流量已用 90%')
 await expect(dialog.getByRole('button',{name:/Expired offline/})).toContainText('已到期')
 await expect(dialog.getByRole('button',{name:/Quota only/})).toContainText('流量已用 100%')
 await expect(dialog.locator('.billing-reminder-node')).toHaveCount(3)
 await expect(dialog).not.toContainText('Outside thresholds')
 await expect(dialog).not.toContainText('Invalid expiry')
 await expect(dialog).not.toContainText('No limits')
 await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);await expect(trigger).toBeFocused()
 await trigger.press('Enter');await dialog.getByRole('button',{name:/Quota only/}).click()
 await expect(page).toHaveURL(/\/node\/2/)
 await expect(page.locator('.detail-identity')).toContainText('Quota only')
})
test('no reminders leaves no trigger or empty container',async({page})=>{
 await setup(page,nodes());await page.goto('/')
 await expect(page.locator('.node-card')).toHaveCount(6)
 await expect(page.locator('.billing-reminders')).toHaveCount(0)
})
test('mobile keeps existing reminder counts and has no desktop entry',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await page.goto('/?page=overview')
 await expect(page.locator('.ma-reminder-shortcuts').getByRole('button',{name:/到期提醒/})).toContainText('2')
 await expect(page.locator('.ma-reminder-shortcuts').getByRole('button',{name:/流量提醒/})).toContainText('2')
 await expect(page.locator('.billing-reminders')).toHaveCount(0)
})
for(const width of [721,900,1440])test(`desktop reminder fits ${width}px and restores scroll when resized to mobile`,async({page})=>{
 await page.setViewportSize({width,height:900});await setup(page);await page.goto('/')
 await page.getByRole('button',{name:'到期与用量 · 3 个节点需要关注'}).click()
 const dialog=page.getByRole('dialog',{name:'到期与用量'})
 await expect(dialog).toBeVisible()
 const box=(await dialog.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 await page.setViewportSize({width:390,height:844})
 await expect(dialog).toHaveCount(0)
 await expect(page.locator('body')).not.toHaveCSS('overflow','hidden')
})
test('open reminder list updates as account warnings resolve without fetching resource history',async({page})=>{
 let rows=reminderNodes()
 await setup(page)
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:rows}}))
 const historyRequests:string[]=[]
 page.on('request',r=>{const url=new URL(r.url());if(url.pathname.endsWith('/metrics')&&url.searchParams.get('series')!=='ping')historyRequests.push(r.url())})
 await page.goto('/')
 await page.getByRole('button',{name:'到期与用量 · 3 个节点需要关注'}).click()
 rows=rows.map(n=>({...n,expires_at:null,month_used:0}))
 await expect(page.getByRole('dialog')).toContainText('暂无到期或流量提醒',{timeout:10000})
 await expect(page.locator('.billing-reminder-trigger')).toHaveCount(0)
 await page.getByRole('button',{name:'关闭',exact:true}).click()
 await expect(page.locator('.billing-reminders')).toHaveCount(0)
 expect(historyRequests).toHaveLength(0)
})
test('English long names stay readable and the entry remains global during search',async({page})=>{
 await page.setViewportSize({width:721,height:700})
 await page.addInitScript(()=>localStorage.setItem('monitor-next-language','en'))
 const rows=reminderNodes();rows[0].name='LongUnbrokenNodeName'.repeat(10)
 await setup(page,rows);await page.goto('/')
 await page.getByRole('searchbox').fill('Outside thresholds')
 await expect(page.locator('.node-card')).toHaveCount(1)
 await page.getByRole('button',{name:'Expiry and usage · 3 nodes need attention'}).click()
 const row=page.getByRole('dialog').getByRole('button',{name:new RegExp(rows[0].name)})
 await expect(row).toBeVisible()
 expect(await row.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true)
 await expect(row).toContainText('7 days left')
})
