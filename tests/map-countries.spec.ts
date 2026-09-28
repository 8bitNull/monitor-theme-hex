import {test,expect} from './desktopTest'
import {nodes} from '../scripts/fixtures.mjs'
import geometry from '../src/data/map-paths.json' with {type:'json'}

test('all mapped regions render and France filters its nodes',async({page})=>{
 const codes=Object.keys(geometry.points)
 await page.addInitScript(()=>localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,infoDensity:'full',modules:{map:true}})))
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:codes.map((country,index)=>({...nodes()[0],id:index+1,country,name:`Node ${country}`}))}}))
 // Keep the full country fixture while avoiding hundreds of unrelated card charts.
 await page.addInitScript(()=>sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({view:'table'})))
 await page.goto('/')
 const map=page.locator('.region-atlas')
 await expect(map.locator('.map-land')).toBeVisible({timeout:15000})
 const rendered=await map.locator('svg [data-region][role=button]').evaluateAll(elements=>[...new Set(elements.map(element=>element.getAttribute('data-region')))].sort())
 expect(rendered).toEqual(codes.sort())
 for(const [name,code] of Object.entries({France:'FR','United Kingdom':'GB',Russia:'RU',Serbia:'RS','Timor-Leste':'TL','Burkina Faso':'BF',Benin:'BJ',Myanmar:'MM',Congo:'CG','Dem. Rep. Congo':'CD'})){
  expect(geometry.shapes.find(shape=>shape.name===name)?.code).toBe(code)
  await expect(map.locator(`.map-land [data-region="${code}"]`)).toHaveAttribute('data-tone','good')
 }
 for(const code of ['GF','GI','TV','CC','CX','YT'])await expect(map.locator(`.map-cluster[data-region="${code}"]`)).toBeAttached()
 const france=map.locator('.map-cluster[data-region="FR"][role="button"]')
 await france.focus()
 await france.press('Enter')
 await expect(france).toHaveAttribute('aria-pressed','true')
 await page.locator('.desktop-results-toolbar').getByRole('button',{name:'卡片视图',exact:true}).click()
 await expect(page.locator('.node-card')).toHaveCount(1)
 await expect(page.locator('.node-card')).toContainText('Node FR')
 await map.screenshot({path:'tests/artifacts/map-countries-france.png'})
})
