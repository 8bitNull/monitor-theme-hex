import {test,expect} from '@playwright/test'
import {nodes,metrics} from '../scripts/fixtures.mjs'

for(const width of [900,1440])for(const language of ['zh','en'])for(const state of ['empty','failed']){
 test(`table network ${state} stays inside cells at ${width}px ${language}`,async({page})=>{
  await page.setViewportSize({width,height:900})
  await page.addInitScript(language=>{
   localStorage.setItem('monitor-next-language',language)
   sessionStorage.setItem('monitor-next-browse-v1',JSON.stringify({columnsVersion:5,columns:['cpu','memory','disk','upload','download','latency','loss','probe'],view:'table',tableLayout:'grouped'}))
  },language)
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:[nodes()[0]]}}))
  let recovered=false
  await page.route('**/api/nodes/*/metrics?*',r=>recovered?r.fulfill({json:metrics()}):state==='failed'?r.fulfill({status:503}):r.fulfill({json:{...metrics(),ping:[]}}))
  await page.goto('/')
  const columns=['latency','loss','probe']
  for(const column of columns){
   const cell=page.locator(`tbody td[data-column=${column}]`).first()
   await cell.scrollIntoViewIfNeeded()
   await expect(cell).toContainText(state==='empty'?(language==='en'?'No records for this probe':'无该线路记录'):(language==='en'?'Retry':'重试'))
   const contained=await cell.evaluate(td=>{
    const value=td.querySelector('.table-ping-value')!
    const range=document.createRange();range.selectNodeContents(value)
    const box=td.getBoundingClientRect()
    return [...range.getClientRects()].filter(r=>r.width&&r.height).every(r=>r.left>=box.left-.01&&r.right<=box.right+.01&&r.top>=box.top-.01&&r.bottom<=box.bottom+.01)
   })
   expect(contained,`${column} text must remain readable inside its own cell`).toBe(true)
  }
  if(state==='failed'){
   recovered=true
   const cell=page.locator('tbody td[data-column=latency]').first()
   await cell.getByRole('button').click()
   await expect(cell).toContainText('ms')
   await expect(cell.getByRole('button')).toHaveCount(0)
  }
 })
}
