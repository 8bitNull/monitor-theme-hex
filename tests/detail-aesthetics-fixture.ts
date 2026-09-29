import type {Page} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

export async function detailFixture(page:Page){
 let requests=0
 await page.routeWebSocket('**/api/ws',s=>s.close())
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[{
  ...nodes()[0],name:'Tokyo long node name 东京节点',
  remark:'Long remark 长备注 '.repeat(10),
  ipv6:'2001:db8:1234:5678:abcd:1234:5678:abcd'
 }]}}))
 await page.route('**/api/nodes/*/metrics?*',r=>{
  if(new URL(r.request().url()).searchParams.get('series')==='metrics')requests++
  return r.fulfill({json:metrics()})
 })
 return {resourceRequests:()=>requests}
}
