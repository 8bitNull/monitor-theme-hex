import {test, expect} from './desktopTest'
import {readFileSync} from 'node:fs'
import {applySiteConfig} from '../src/lib/siteConfig'
import {defaults,parsePreferences} from '../src/lib/appearance'
import {nodes} from '../scripts/fixtures.mjs'

const manifest=JSON.parse(readFileSync(new URL('../theme.json',import.meta.url),'utf8')) as {config:Array<{key?:string;type:string;default?:unknown;options?:Array<{value:string}>}>}
const packaged=JSON.parse(readFileSync(new URL('../public/theme-config.json',import.meta.url),'utf8'))

test('backend route changes do not become personal overrides after reload',async({page})=>{
 let probe='2'
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{probe}}))
 await page.goto('/')
 await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('monitor-next-browse-v1')||'{}').probe)).toBe('2')
 probe='5'
 await page.reload()
 await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('monitor-next-browse-v1')||'{}').probe)).toBe('5')
 await page.reload()
 await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('monitor-next-browse-v1')||'{}').probe)).toBe('5')
})

test('legacy copied route preference yields to backend without losing other preferences',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,probe:'2',appearance:'dark',detailInfoMode:'expanded'}))
  localStorage.setItem('monitor-next-node-probes-v1',JSON.stringify({'1':'4'}))
 })
 await page.route('**/api/themes/hex/config',r=>r.fulfill({json:{probe:'5'}}))
 await page.goto('/')
 await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('monitor-next-browse-v1')||'{}').probe)).toBe('5')
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('monitor-next')||'{}').appearance)).toBe('dark')
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('monitor-next-node-probes-v1')||'{}')['1'])).toBe('4')
})

test('every backend theme field matches packaged defaults and reaches preferences',()=>{
  expect(parsePreferences(JSON.stringify(packaged))).toEqual(defaults)
  const fields=manifest.config.filter((field):field is typeof field & {key:string}=>typeof field.key==='string')
  const read=(value:ReturnType<typeof applySiteConfig>,key:string):unknown=>{
    if(key.startsWith('module_'))return value.modules[key.slice(7) as keyof typeof value.modules]
    if(key.startsWith('card_info_'))return value.cardInfo[key.slice(10) as keyof typeof value.cardInfo]
    if(key.startsWith('mobile_card_info_'))return (value.mobileCardInfo ?? value.cardInfo)[key.slice(17) as keyof typeof value.cardInfo]
    return value[key as keyof typeof value]
  }
  for(const field of fields){
    const key=field.key
    const declared=key==='latencyScale'||key==='latencyWindow'?Number(field.default):field.default
    expect(read(defaults,key),`${key} default`).toBe(declared)
    const sample=field.type==='boolean'?!field.default:field.type==='number'?Number(field.default)+1:field.type==='select'?field.options!.find(option=>option.value!==field.default)!.value:key==='probe'?'2':'/background.svg'
    const expected=key==='latencyScale'||key==='latencyWindow'?Number(sample):sample
    expect(read(applySiteConfig({[key]:sample},defaults),key),`${key} applied`).toBe(expected)
    const invalid=field.type==='boolean'?'false':field.type==='number'?Infinity:field.type==='select'?'invalid':42
    expect(applySiteConfig({[key]:invalid},defaults),`${key} invalid fallback`).toEqual(defaults)
  }
})

test('disabling expiry hides both the card fact and the heading warning',async({page})=>{
  await page.route('**/api/themes/hex/config',route=>route.fulfill({json:{card_info_expiry:false}}))
  await page.route('**/api/nodes',async route=>{
    const source=await route.fetch()
    const data=await source.json()
    data.nodes[0].expires_at=new Date(Date.now()+3*86400000).toISOString().slice(0,10)
    await route.fulfill({json:data})
  })
  await page.goto('/')
  const card=page.locator('.node-card').first()
  await expect(card.locator('.card-expiry')).toHaveCount(0)
  await expect(card.locator('.card-expiry-tag')).toHaveCount(0)
  await expect(card.locator('.node-heading')).not.toContainText('即将到期')
})

test('recommended packaged display works on desktop and mobile',async({page})=>{
  await page.route('**/api/themes/hex/config',route=>route.fulfill({status:404}))
  await page.route('**/api/nodes',route=>route.fulfill({json:{nodes:[{...nodes()[0],remark:'国际线路'}]}}))
  await page.setViewportSize({width:1440,height:900})
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-layout','comfortable')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-graph','bar')
  await expect(page.locator('.node-grid')).toHaveAttribute('data-columns','auto')
  await expect(page.locator('.map-frame')).toBeVisible()
  await expect(page.locator('.summary-grid > div')).toHaveCount(4)
  await expect(page.locator('.node-card').first().locator('.card-billing')).toBeVisible()
  await expect(page.locator('.node-card').first().locator('.node-remarks')).toBeVisible()
  await page.locator('.node-card').first().scrollIntoViewIfNeeded()
  await expect(page.locator('.latency-bars svg').first()).toHaveAttribute('aria-label',/0–500 ms.*150.*300/)
  await page.screenshot({path:'tests/artifacts/site-default-desktop.png'})
  await page.setViewportSize({width:390,height:844})
  await page.reload()
  await expect(page.locator('.map-frame')).toHaveCount(0)
  await expect(page.locator('.ma-node')).toHaveCount(1)
  await expect(page.locator('.ma-meters')).toBeVisible()
  await expect(page.locator('.ma-nav')).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy()
  await page.screenshot({path:'tests/artifacts/site-default-mobile.png'})
})

test('hub site settings win over legacy theme overrides while appearance stays personal', async ({page}) => {
  let writes = 0
  await page.route('**/api/me', route => route.fulfill({json: {authed: true, github: false, site_name: 'My Monitor', public_page: true}}))
  await page.route('**/api/themes/hex/config', route => {
    if (route.request().method() === 'PUT') writes++
    return route.fulfill({json: {palette: 'ocean', module_map: false, latencyScale: '500', desktopColumns: '3'}})
  })
  await page.addInitScript(()=>{if(!sessionStorage.getItem('legacy-seeded')){localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,schemaVersion:3,designVersion:1,palette:'rose',appearance:'dark'}));sessionStorage.setItem('legacy-seeded','1')}})
  await page.goto('/')
  await expect(page).toHaveTitle('My Monitor')
  await expect(page.locator('.brand')).toHaveText('My Monitor')
  await expect(page.locator('.brand small')).toHaveCount(0)
  await expect(page.locator('.site-footer')).toContainText('HEX ·')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'ocean')
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await expect(page.locator('.node-grid')).toHaveAttribute('data-columns', '3')
  await expect(page.locator('.map-frame')).toHaveCount(0)
  await expect(page.locator('dialog.settings-drawer')).toHaveCount(0)
  await expect(page.locator('header').getByRole('button',{name:/显示与偏好|Display & preferences/})).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'ocean')
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('monitor-next')!))).not.toHaveProperty('palette')
  expect(writes).toBe(0)
})

test('header dark and language controls persist without a settings drawer',async({page})=>{
  await page.goto('/')
  const header=page.locator('header')
  await expect(header.getByRole('button',{name:'Language / 语言'})).toBeVisible()
  await expect(header.getByRole('button',{name:'切换明暗模式'})).toBeVisible()
  await expect(page.locator('.settings-drawer')).toHaveCount(0)
  await header.getByRole('button',{name:'切换明暗模式'}).click()
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await header.getByRole('button',{name:'Language / 语言'}).click()
  await expect(page.locator('html')).toHaveAttribute('lang','en-US')
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)
  await expect(page.locator('html')).toHaveAttribute('lang','en-US')
  await header.getByRole('button',{name:'Toggle light / dark'}).click()
  await expect(page.locator('html')).not.toHaveClass(/\bdark\b/)
})

test('home route and table column settings are absent from the public page',async({page})=>{
  await page.goto('/')
  await expect(page.getByLabel('主要探测线路',{exact:true})).toHaveCount(0)
  await page.getByLabel('表格视图',{exact:true}).click()
  await expect(page.locator('details.table-options')).toHaveCount(0)
  await expect(page.locator('thead [data-column=cpu]')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('主要探测线路',{exact:true})).toHaveCount(0)
  await expect(page.locator('details.table-options')).toHaveCount(0)
})

test('an unavailable hub config silently falls back to packaged defaults', async ({page}) => {
  await page.route('**/api/themes/hex/config', route => route.fulfill({status: 404}))
  await page.goto('/')
  await expect(page.locator('.next-theme')).toHaveAttribute('data-palette', 'default')
  await expect(page.locator('dialog.settings-drawer')).toHaveCount(0)
})
