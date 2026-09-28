import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'

async function fixture(page:import('@playwright/test').Page,config:Record<string,unknown>,mixed=false){
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:config}))
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().map((n,i)=>({...n,os:mixed&&i===0?'Windows Server 2022':'Debian 12',remark:'测试备注',price:8}))}}))
}
test('disabled map leaves no empty browser bar and search feedback still works',async({page})=>{
 await fixture(page,{module_map:false});await page.goto('/')
 await expect(page.locator('.node-card')).toHaveCount(6)
 await expect(page.locator('.map-frame')).toHaveCount(0)
 await expect(page.locator('.node-browser')).toBeHidden()
 await page.getByRole('searchbox').fill('Tokyo')
 await expect(page.locator('.node-browser')).toBeVisible()
 await expect(page.locator('.node-browser .filters')).toBeHidden()
 await page.getByRole('button',{name:'清除筛选',exact:true}).click()
 await expect(page.locator('.node-browser')).toBeHidden()
 await page.screenshot({path:'artifacts/settings-layout/map-disabled-after.png'})
})
test('disabled map keeps meaningful system filters',async({page})=>{
 await fixture(page,{module_map:false},true);await page.goto('/')
 await expect(page.getByRole('group',{name:'系统快速筛选'})).toBeVisible()
 await page.getByRole('button',{name:'Windows',exact:true}).click()
 await expect(page.locator('.node-card')).toHaveCount(1)
})
for(const [traffic,speed] of [[false,false],[true,false],[false,true],[true,true]])test(`mobile statistics reflow with traffic=${traffic} speed=${speed}`,async({page})=>{
 await page.setViewportSize({width:390,height:844});await fixture(page,{module_traffic:traffic,module_speed:speed,module_map:false})
 await page.goto('/?page=overview')
 await expect(page.locator('.ma-hero')).toBeVisible()
 const grid=page.locator('.ma-stat-grid'),cards=grid.locator('.ma-panel')
 if(!traffic&&!speed){await expect(grid).toHaveCount(0);return}
 await expect(cards).toHaveCount(Number(traffic)+Number(speed))
 if(traffic!==speed){const p=(await grid.boundingBox())!,c=(await cards.first().boundingBox())!;expect(c.width).toBeCloseTo(p.width,0)}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
for(const mode of ['follow','custom'])test(`mobile detailed cards omit empty extras in ${mode} mode`,async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.addInitScript(()=>localStorage.setItem('hex-mobile-v1',JSON.stringify({detailed:true})))
 const prefix=mode==='follow'?'card_info_':'mobile_card_info_'
 await fixture(page,{mobileInfoMode:mode,...Object.fromEntries(['traffic','uptime','connections'].map(k=>[prefix+k,false]))})
 await page.goto('/');await expect(page.locator('.ma-node')).toHaveCount(6)
 await expect(page.locator('.ma-extra')).toHaveCount(0)
})
test('only remarks or price does not add a second empty separator',async({page})=>{
 await fixture(page,{...Object.fromEntries(['traffic','uptime','connections','expiry','price'].map(k=>['card_info_'+k,false]))})
 await page.goto('/')
 const extra=page.locator('.node-card').first().locator('.node-supplementary')
 await expect(extra).toBeVisible()
 await expect(extra.locator('.node-more')).toHaveCSS('border-top-width','0px')
 await expect(extra.locator('.node-remarks')).toBeVisible()
})

for(const count of [0,1,2,3,4,5,6])test(`summary ${count} enabled modules fills each row without empty slots`,async({page})=>{
 const keys=['online','traffic','speed','busiest','regions','clock']
 await fixture(page,{module_map:false,...Object.fromEntries(keys.map((key,i)=>['module_'+key,i<count]))})
 for(const width of [900,1101,1440]){
  await page.setViewportSize({width,height:900});await page.goto('/')
  await expect(page.locator('.node-card')).toHaveCount(6)
  if(!count){await expect(page.locator('.overview-summary')).toHaveCount(0);continue}
  const grid=page.locator('.summary-grid');await expect(grid.locator(':scope > div')).toHaveCount(count)
  const gaps=await grid.evaluate(el=>{
   const parent=el.getBoundingClientRect(),rows=new Map<number,DOMRect[]>()
   for(const child of el.children){const box=child.getBoundingClientRect(),key=Math.round(box.y);rows.set(key,[...(rows.get(key)??[]),box])}
   return [...rows.values()].map(row=>parent.right-Math.max(...row.map(b=>b.right)))
  })
  for(const gap of gaps)expect(gap).toBeLessThanOrEqual(2)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
 }
})

test('summary surfaces still honor the glass switch after reflow',async({page})=>{
 let glass=false
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{glass}}))
 const backgrounds:string[]=[]
 for(const value of [false,true]){
  glass=value;await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-glass',String(value))
  await expect(page.locator('.summary-grid > div').first()).toBeVisible()
  backgrounds.push(await page.locator('.summary-grid > div').first().evaluate(el=>getComputedStyle(el).backgroundColor))
 }
 expect(backgrounds[1]).not.toBe(backgrounds[0])
})
