import {chromium} from '@playwright/test'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {dirname,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {nodes,metrics} from './fixtures.mjs'

export const base=process.env.OBS_BASE_URL||'http://127.0.0.1:4190'
export const root=process.env.OBS_ARTIFACT_DIR||'artifacts/hex-observatory'
export async function loadFixture(){
 const path=process.env.OBS_FIXTURE_PATH||`${root}/fixture.json`
 await mkdir(dirname(path),{recursive:true})
 let fixture
 try{fixture=JSON.parse(await readFile(path,'utf8'))}catch(error){
  if(error.code!=='ENOENT')throw error
  fixture={now:Date.now(),nodes:nodes(),history:metrics()}
  await writeFile(path,JSON.stringify(fixture,null,2))
 }
 if(!fixture.now||!fixture.nodes?.length||!fixture.history?.metrics?.length)throw new Error(`Incomplete fixture: ${path}`)
 return fixture
}
export async function prepare(page,fixture,language='zh',appearance='light'){
 await page.clock.setFixedTime(fixture.now)
 await page.addInitScript(({language,appearance})=>{
  localStorage.setItem('monitor-next-language',language)
  localStorage.setItem('monitor-next',JSON.stringify({schemaVersion:3,appearance}))
 },{language,appearance})
 await page.routeWebSocket('**/api/ws',socket=>socket.close())
 await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:fixture.nodes}}))
 await page.route('**/api/nodes/*/metrics?*',route=>route.fulfill({json:fixture.history}))
}
async function capture(){
 const fixture=await loadFixture(),out=process.env.OBS_CAPTURE_DIR||`${root}/before`,errors=[]
 await mkdir(out,{recursive:true})
 const browser=await chromium.launch()
 try{
  for(const [width,height] of [[320,568],[390,844],[667,375],[720,900],[721,900],[1024,768],[1440,900],[1920,1080]]){
   for(const language of ['zh','en'])for(const appearance of ['light','dark']){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'})
    page.on('pageerror',error=>errors.push({width,language,appearance,error:String(error)}))
    await prepare(page,fixture,language,appearance)
    const stem=`${out}/${width}-${language}-${appearance}`
    await page.goto(base)
    await page.locator(width<=720?'.ma-node':'.node-card').first().waitFor()
    await page.screenshot({path:`${stem}-home.png`,fullPage:true})
    if(width>720){
     await page.locator('.node-toolbar-primary').getByRole('button',{name:language==='en'?'Table view':'表格视图',exact:true}).click()
     await page.locator('.table-scroll').waitFor()
     await page.screenshot({path:`${stem}-table.png`,fullPage:true})
    }
    await page.goto(`${base}/node/${fixture.nodes[0].id}`)
    await page.locator(width<=720?'.ma-detail-overview':'.detail-live').waitFor()
    await page.locator(width<=720?'.ma-detail-overview':'.recharts-area-curve').first().waitFor()
    await page.screenshot({path:`${stem}-detail.png`,fullPage:true})
    if(width<=720)for(const [name,selector,suffix] of language==='en'?[['Resources','.detail-resource-charts','resources'],['Network','.latency-view','network'],['Info','.detail-facts','info']]:[['资源','.detail-resource-charts','resources'],['网络','.latency-view','network'],['资料','.detail-facts','info']]){
     await page.locator('.ma-detail-tabs').getByRole('button',{name,exact:true}).click()
     await page.locator(selector).first().waitFor()
     if(suffix==='resources')await page.locator('.recharts-area-curve').first().waitFor()
     await page.screenshot({path:`${stem}-${suffix}.png`,fullPage:true})
    }
    await page.close()
   }
  }
 }finally{
  await browser.close()
  await writeFile(`${out}/pageerrors.json`,JSON.stringify(errors,null,2))
 }
 if(errors.length)throw new Error(`${errors.length} page errors; see ${out}/pageerrors.json`)
 console.log(`Captured 128 screenshots in ${out}`)
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await capture()
