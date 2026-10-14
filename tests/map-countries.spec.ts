import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'
import geometry from '../src/data/map-paths.json' with {type:'json'}
import anchors from '../src/data/map-flat-points.json' with {type:'json'}

test('all mapped regions render and France filters its nodes',async({page})=>{
 const codes=Object.keys(geometry.points)
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,infoDensity:'full',modules:{map:true}})))
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:codes.map((country,index)=>({...nodes()[0],id:index+1,country,name:`Node ${country}`}))}}))
 // Keep the full country fixture while avoiding hundreds of unrelated card charts.
 await page.addInitScript(()=>sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({view:'table'})))
 await page.goto('/')
 const map=page.locator('.region-atlas')
 await expect(map.locator('.map-land')).toBeVisible({timeout:15000})
 const targets=map.locator('.map-cluster,.map-region-group')
 const identities=()=>targets.evaluateAll(elements=>elements.flatMap(el=>(el.getAttribute('data-members')??el.getAttribute('data-region')!).split(',')).sort())
 await expect.poll(identities).toEqual(codes.sort())
 const rendered=await identities()
 expect(new Set(rendered).size).toBe(codes.length)
 const placement=await targets.evaluateAll((elements,points)=>{
  const m=(document.querySelector('.map-land') as SVGGraphicsElement).getScreenCTM()!
  return elements.map(el=>{
   const codes=(el.getAttribute('data-members')??el.getAttribute('data-region')!).split(',')
   const anchor=new DOMPoint(codes.reduce((sum,code)=>sum+points[code][0],0)/codes.length,codes.reduce((sum,code)=>sum+points[code][1],0)/codes.length).matrixTransform(m)
   const core=el.querySelector('.region-core,circle')!.getBoundingClientRect(),hit=el.querySelector('.small-region-hit,circle')!.getBoundingClientRect()
   return {codes,distance:Math.hypot(anchor.x-core.x-core.width/2,anchor.y-core.y-core.height/2),x:hit.x+hit.width/2,y:hit.y+hit.height/2,r:hit.width/2,visible:el.getAttribute('aria-hidden')!=='true'}
  })
 },anchors as Record<string,number[]>)
 for(const target of placement)expect(target.distance).toBeLessThan(.1)
 const visible=placement.filter(target=>target.visible)
 for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++)expect(Math.hypot(visible[i].x-visible[j].x,visible[i].y-visible[j].y)).toBeGreaterThanOrEqual(visible[i].r+visible[j].r)
 for(const [name,code] of Object.entries({France:'FR','United Kingdom':'GB',Russia:'RU',Serbia:'RS','Timor-Leste':'TL','Burkina Faso':'BF',Benin:'BJ',Myanmar:'MM',Congo:'CG','Dem. Rep. Congo':'CD'})){
  expect(geometry.shapes.find(shape=>shape.name===name)?.code).toBe(code)
  await expect(map.locator(`.map-land [data-region="${code}"]`)).toHaveAttribute('data-tone','good')
 }
 for(const code of ['GF','GI','TV','CC','CX','YT'])expect(rendered).toContain(code)
 const france=map.locator('.map-cluster[data-region="FR"][role="button"]')
 if(await france.count()){
  await france.focus();await france.press('Enter');await expect(france).toHaveAttribute('aria-pressed','true')
 }else{
  const id=placement.find(target=>target.codes.includes('FR'))!.codes.join(',')
  const group=map.locator(`.map-region-group[data-members="${id}"]`)
  await group.focus();await group.press('Enter')
  const member=map.getByRole('dialog',{name:'选择地区',exact:true}).getByRole('button',{name:/法国/})
  await member.focus();await member.press('Enter')
 }
 await expect(page.locator('.desktop-results-toolbar').getByRole('combobox',{name:'地区',exact:true})).toHaveAttribute('data-value','FR')
 await expect(map.locator('.map-land [data-region="FR"]')).toHaveAttribute('data-selected','true')
 await page.locator('.desktop-results-toolbar').getByRole('button',{name:'卡片视图',exact:true}).click()
 await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.node-card')).toContainText('Node FR')
 await map.screenshot({path:'tests/artifacts/map-countries-france.png'})
})
