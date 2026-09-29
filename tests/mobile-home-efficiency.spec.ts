import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

test('home attention shortcuts clear unrelated filters and show the advertised nodes',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>{
  const data=nodes().map((n,i)=>({...n,group:i===0?'网站':'流量',expires_at:i===2?new Date().toISOString().slice(0,10):null,traffic_limit:i===3?1:0}))
  data[1].metrics!.cpu=95
  // A stale high reading must not be advertised as a current high-load alert.
  data[4].metrics!.cpu=99;data[4].last_seen-=3600
  return r.fulfill({json:{nodes:data}})
 })
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('/')
 await expect(page.locator('.ma-node')).toHaveCount(6)
 const shortcuts=page.getByRole('group',{name:'需要关注',exact:true})
 for(const [label,name] of [['离线','London'],['高负载','Hong Kong'],['到期提醒','Los Angeles'],['流量提醒','Frankfurt']]){
  await page.getByRole('group',{name:'节点分组',exact:true}).getByRole('button',{name:/网站/}).click()
  await page.getByRole('searchbox',{name:'搜索节点',exact:true}).fill('Tokyo')
  await shortcuts.getByRole('button',{name:`${label} 1`,exact:true}).click()
  await expect(page.getByRole('searchbox',{name:'搜索节点',exact:true})).toHaveValue('')
  await expect(page.locator('.ma-node')).toHaveCount(1)
  await expect(page.locator('.ma-node')).toContainText(name)
  await expect(page.getByRole('button',{name:`移除筛选：${label}`,exact:true})).toBeVisible()
  await page.getByRole('button',{name:'清除全部条件',exact:true}).click()
 }
 await expect(page.locator('.ma-identity strong')).toHaveText(nodes().map(n=>n.name))
})

test('healthy home reserves no attention row',async({page})=>{
 await page.setViewportSize({width:390,height:844})
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:nodes().slice(0,3).map(n=>({...n,traffic_limit:0,expires_at:null}))}}))
 await page.goto('/')
 await expect(page.locator('.ma-node')).toHaveCount(3)
 await expect(page.getByRole('group',{name:'需要关注',exact:true})).toHaveCount(0)
})
