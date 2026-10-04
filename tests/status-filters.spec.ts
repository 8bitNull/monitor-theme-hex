import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'
import {chooseOption} from './select'

test('offline and pending actions distinguish four states, compose and recover',async({page})=>{
 await page.clock.install()
 let recovered=false
 await page.route('**/api/nodes',route=>{
  const base=nodes()[0], now=Math.floor(Date.now()/1000)
  return route.fulfill({json:{nodes:[
   {...base,id:1,name:'Fresh',last_seen:now,group:'Primary'},
   {...base,id:2,name:'Offline',online:false,metrics:null,last_seen:now-120,group:'Primary'},
   {...base,id:3,name:'Pending stale',last_seen:now-120,country:'US',os:'Windows',group:'Backup'},
   {...base,id:4,name:'Pending missing',last_seen:now,metrics:recovered?base.metrics:null,group:'Primary'},
  ]}})
 })
 await page.goto('/')
 const cards=page.locator('.node-card'),offline=page.getByRole('button',{name:'筛选离线节点',exact:true}),pending=page.getByRole('button',{name:'筛选待更新节点',exact:true})
 await expect(cards).toHaveCount(4)
 await expect(offline).toHaveText('1 离线');await expect(pending).toHaveText('2 待更新')
 await offline.click();await expect(cards).toHaveCount(1);await expect(cards).toContainText('Offline')
 await pending.click();await expect(cards).toHaveCount(2);await expect(pending).toHaveAttribute('aria-pressed','true')
 await expect(page.getByRole('button',{name:'清除状态筛选',exact:true})).toHaveText('待更新 ×')
 await chooseOption(page.getByRole('combobox',{name:'节点分组',exact:true}),'=Primary')
 await chooseOption(page.getByRole('combobox',{name:'地区',exact:true}),'JP')
 await page.getByRole('group',{name:'系统快速筛选'}).getByRole('button',{name:'Linux',exact:true}).click()
 await page.getByRole('searchbox',{name:'搜索节点',exact:true}).fill('missing')
 await expect(cards).toHaveCount(1);await expect(cards).toContainText('Pending missing')
 await expect(pending).toHaveText('2 待更新')
 await expect(page.locator('.filter-composition')).toHaveText('同时满足已选条件')
 await page.getByRole('button',{name:'清除筛选',exact:true}).click()
 await expect(cards).toHaveCount(4)
 await pending.click();recovered=true;await page.clock.runFor(5001)
 await expect(cards).toHaveCount(1);await expect(cards).toContainText('Pending stale');await expect(pending).toHaveText('1 待更新')
 await page.getByRole('button',{name:'清除状态筛选',exact:true}).click();await expect(cards).toHaveCount(4)
 await page.getByRole('button',{name:'筛选在线节点',exact:true}).click();await expect(cards).toHaveCount(3)
 await page.getByRole('button',{name:'显示全部节点',exact:true}).click();await expect(cards).toHaveCount(4)
})
