import {chromium} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'

const horizontal=process.argv.includes('--horizontal')
const out=horizontal?'archive/design/detail-horizontal':'archive/design/detail-network'
mkdirSync(out,{recursive:true})
const fixed=Date.parse('2026-09-23T04:00:00Z'),original=Date.now
Date.now=()=>fixed
const fleet=nodes().map(n=>({...n,expires_at:'2026-10-07',remark:'国际线路;Backup;Production'})),history=metrics()
Date.now=original
const css=`
.proposal-banner{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;color:var(--muted-foreground);font-size:12px}.proposal-banner b{color:var(--foreground);font-size:14px;font-weight:500}
.node-detail .detail-workspace{grid-template-columns:380px minmax(0,1fr);grid-template-areas:'live history' 'facts facts';grid-template-rows:auto auto;gap:20px;align-items:start}
.node-detail .detail-live{padding:0 20px 16px}.node-detail .detail-live .detail-module-heading{margin:0 -20px 18px;padding:0 20px;min-height:48px;border-bottom:1px solid var(--detail-line)}
.node-detail .detail-live .detail-resources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 22px}.node-detail .detail-live .detail-resources>.resource{padding:0;border:0}.node-detail .detail-live .resource-label{display:flex;flex-direction:row;justify-content:space-between}.node-detail .detail-live .resource small{display:block;margin-top:5px;font-size:11px}.node-detail .detail-live .resource-bar{margin-top:7px;height:3px}
.proposal-speed{margin-top:18px;padding-top:14px;border-top:1px solid var(--detail-line)}.proposal-speed-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;color:var(--muted-foreground);font-size:11px}.proposal-speed-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.proposal-speed-label{display:flex;justify-content:space-between;align-items:baseline;gap:6px}.proposal-speed-label span{font-size:12px;color:var(--muted-foreground)}.proposal-speed-label b{font-size:18px;font-weight:600;white-space:nowrap;letter-spacing:-.3px}.proposal-speed-label small{font-size:11px;font-weight:400;color:var(--muted-foreground)}.proposal-speed svg{display:block;width:100%;height:36px;margin-top:8px}.proposal-connections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;padding:8px 0 14px}.proposal-connections>div{display:flex;justify-content:space-between;align-items:baseline;font-size:12px}.proposal-connections span{color:var(--muted-foreground)}.proposal-connections b{font-size:13px;font-weight:500}
.proposal-billing{display:grid;grid-template-columns:1.15fr 1fr;gap:20px;border-top:1px solid var(--detail-line);padding:12px 0}.proposal-billing label{display:block;font-size:12px;color:var(--muted-foreground);margin-bottom:7px}.proposal-billing b{font-size:13px;font-weight:500}.proposal-billing small{font-size:11px;color:var(--muted-foreground)}.proposal-expiry{text-align:right}.proposal-expiry small{display:block;margin-top:5px}.proposal-quota{height:3px;border-radius:2px;background:var(--muted);margin-top:10px}.proposal-quota i{display:block;height:3px;width:6.6%;background:var(--tone);border-radius:2px}
.proposal-meta{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:12px;border-top:1px solid var(--detail-line);font-size:12px;color:var(--muted-foreground)}.proposal-meta>span:first-child{display:flex;align-items:center;gap:6px}.proposal-meta>span:last-child{margin-left:auto;text-align:right}.proposal-remarks{display:flex;justify-content:flex-start;flex-wrap:wrap;gap:6px;margin-top:12px}.proposal-remarks .detail-remark-tag{font-size:11px}
.node-detail .detail-information .detail-fact-groups{display:grid;grid-template-columns:1fr 1fr}.node-detail .detail-information .detail-fact-groups>section{border-radius:12px}.node-detail .detail-information .detail-fact-groups>section+section{border-left:1px solid var(--detail-line)}.proposal-caption{font-size:11px;color:var(--muted-foreground);margin:14px 0 0}.node-detail .detail-history{min-height:0}
@media(max-width:899px){.node-detail .detail-workspace{grid-template-columns:minmax(0,1fr);grid-template-areas:'live' 'history' 'facts';gap:16px}.node-detail .detail-live{padding:0 16px 16px}.node-detail .detail-live .detail-module-heading{margin:0 -16px 16px;padding:0 16px}.node-detail .detail-information .detail-fact-groups{grid-template-columns:1fr}.proposal-banner{align-items:flex-start;flex-direction:column;gap:4px}.proposal-speed-label b{font-size:18px}.proposal-speed-grid,.proposal-connections{gap:18px}}
`
const browser=await chromium.launch({channel:'chrome'})
const horizontalCss=`
.node-detail{--plot-height:340px}
.node-detail .detail-workspace{grid-template-columns:minmax(0,1fr);grid-template-areas:'live' 'history' 'facts';gap:18px}
.node-detail .detail-live{padding:0 22px 0}
.node-detail .detail-live .detail-module-heading{margin:0 -22px;padding:0 22px;min-height:46px}
.proposal-overview-grid{display:grid;grid-template-columns:1fr 1.08fr 1fr;padding:20px 0;gap:24px;align-items:stretch}
.proposal-overview-grid>section{min-width:0}
.proposal-overview-grid>section+section{border-left:1px solid var(--detail-line);padding-left:24px}
.proposal-section-title{font-size:12px;font-weight:500;color:var(--muted-foreground);margin:0 0 16px}
.node-detail .detail-live .detail-resources{gap:16px 22px}
.proposal-overview-grid .proposal-speed{border:0;margin:0;padding:0}
.proposal-overview-grid .proposal-speed-heading{margin-bottom:16px;font-size:12px}
.proposal-overview-grid .proposal-speed svg{height:40px;margin-top:12px}
.proposal-overview-grid .proposal-connections{padding:12px 0 0}
.proposal-overview-grid .proposal-billing{border:0;padding:0 0 14px}
.proposal-overview-grid .proposal-meta{padding-top:12px}
.node-detail .proposal-remarks{margin:0;padding:11px 0 12px;border-top:1px solid var(--detail-line)}
.proposal-remarks-caption{font-size:11px;color:var(--muted-foreground);margin-right:8px;align-self:center}
@media(max-width:899px){
 .node-detail{--plot-height:300px}
 .node-detail .detail-live{padding:0 16px}
 .node-detail .detail-live .detail-module-heading{margin:0 -16px;padding:0 16px}
 .proposal-overview-grid{grid-template-columns:minmax(0,1fr);gap:18px;padding:18px 0}
 .proposal-overview-grid>section+section{padding:16px 0 0;border-left:0;border-top:1px solid var(--detail-line)}
 .proposal-section-title{margin-bottom:14px}
 .proposal-overview-grid .proposal-speed-heading{margin-bottom:12px}
 .proposal-overview-grid .proposal-speed svg{height:32px;margin-top:8px}
}
`
try{
 for(const [width,mode] of [[1440,'light'],[1440,'dark'],[390,'light']]){
  const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:1.5,reducedMotion:'reduce'})
  await page.clock.setFixedTime(fixed)
  await page.addInitScript(mode=>{localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,designVersion:1,appearance:mode,detailInfoMode:'expanded'}));localStorage.setItem('monitor-next-language','zh')},mode)
  await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:fleet}}))
  await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:history}))
  await page.goto('http://127.0.0.1:4297/node/2')
  await page.locator('.resource-chart-panel .recharts-area-curve').first().waitFor()
  await page.addStyleTag({content:css})
  await page.evaluate(()=>{
   document.querySelectorAll('header').forEach(el=>el.remove())
   const root=document.querySelector('.node-detail'),live=root.querySelector('.detail-live')
   const uptime=root.querySelector('.detail-subtitle>span:last-child').cloneNode(true)
   root.querySelector('.detail-subtitle>span:last-child').remove()
   const tags=root.querySelector('.detail-meta-tags');tags.className='proposal-remarks'
   const resources=live.querySelector('.detail-resources')
   const load=resources.lastElementChild.cloneNode(true)
   load.querySelector('.resource-label>span').textContent='负载'
   load.querySelector('.bar-number').textContent='0.28'
   load.querySelector('small').textContent='1 分钟 · 2 核'
   const fill=load.querySelector('.resource-bar i');if(fill)fill.style.width='14%'
   resources.append(load)
   resources.children[0].querySelector('small').textContent='2 核'
   resources.children[1].querySelector('small').textContent='2.70 / 8.00 GB'
   resources.children[2].querySelector('small').textContent='22.00 / 80.00 GB'
   live.querySelector('.detail-speed').remove();live.querySelector('.detail-auxiliary').remove()
   const wave=(color,d)=>`<svg viewBox="0 0 150 36" preserveAspectRatio="none" role="img" aria-label="示例速率趋势"><path d="${d}" fill="none" stroke="var(--${color})" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`
   const network=document.createElement('div')
   network.innerHTML=`<div class="proposal-speed"><div class="proposal-speed-heading"><span>实时网速</span><span>最近 60 秒</span></div><div class="proposal-speed-grid"><div><div class="proposal-speed-label"><span>↑ 上行</span><b>1.33 <small>Mbps</small></b></div>${wave('upload','M1 27 C8 27 10 20 16 21 S24 28 31 19 S40 23 47 16 S54 26 62 21 S72 24 80 14 S89 6 97 15 S106 25 115 18 S125 13 133 17 S142 23 149 18')}</div><div><div class="proposal-speed-label"><span>↓ 下行</span><b>3.86 <small>Mbps</small></b></div>${wave('download','M1 25 C8 25 11 14 17 17 S25 24 32 13 S41 17 48 9 S57 21 64 17 S72 24 80 15 S88 14 95 9 S105 19 113 13 S123 8 130 14 S141 17 149 11')}</div></div></div><div class="proposal-connections"><div><span>TCP</span><b>102</b></div><div><span>UDP</span><b>24</b></div></div><div class="proposal-billing"><div><label>本月用量</label><b>66.0 GB <small>/ 1.00 TB</small></b><div class="proposal-quota"><i></i></div></div><div class="proposal-expiry"><label>到期时间</label><b>2026.10.07</b><small>剩余 14 天</small></div></div>`
   live.append(network)
   const meta=document.createElement('div');meta.className='proposal-meta';meta.append(uptime)
   const price=document.createElement('span');price.textContent='$7.00 / 月付';meta.append(price);live.append(meta,tags)
   const facts=root.querySelector('.detail-fact-groups');facts.lastElementChild.remove();facts.querySelector('.detail-quota').remove()
   const banner=document.createElement('div');banner.className='proposal-banner';banner.innerHTML='<b>详情页 · 布局方案</b><span>示例数据与示意波形 · 2026.09.23</span>';root.prepend(banner)
   const note=document.createElement('p');note.className='proposal-caption';note.textContent='布局预览：实时信息集中展示，历史图表保持独立。波形为示意，落地时使用真实采样。';root.append(note)
  })
  if(horizontal){
   await page.addStyleTag({content:horizontalCss})
   await page.evaluate(()=>{
    const root=document.querySelector('.node-detail'),live=root.querySelector('.detail-live')
    live.querySelector('h2').lastChild.textContent='节点概览'
    const resources=live.querySelector('.detail-resources'),speed=live.querySelector('.proposal-speed'),connections=live.querySelector('.proposal-connections'),billing=live.querySelector('.proposal-billing'),meta=live.querySelector('.proposal-meta'),remarks=live.querySelector('.proposal-remarks')
    const grid=document.createElement('div');grid.className='proposal-overview-grid'
    const group=(title)=>{const el=document.createElement('section');if(title){const heading=document.createElement('h3');heading.className='proposal-section-title';heading.textContent=title;el.append(heading)}grid.append(el);return el}
    group('资源使用').append(resources)
    group('').append(speed,connections)
    group('用量与账期').append(billing,meta)
    const label=document.createElement('span');label.className='proposal-remarks-caption';label.textContent='备注';remarks.prepend(label)
    live.replaceChildren(live.querySelector('.detail-module-heading'),grid,remarks)
    root.querySelector('.proposal-banner b').textContent='详情页 · 横向概览方案'
    root.querySelector('.proposal-caption').textContent='布局预览：资源、网络、账期分组呈现；历史图表使用整行宽度。示例数据与示意波形。'
   })
  }
  await page.evaluate(()=>document.fonts.ready)
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
  if(overflow)throw new Error(`Overflow at ${width}`)
  await page.locator('.node-detail').screenshot({path:`${out}/${width}-${mode}.png`})
  if(width===390)await page.locator('.detail-live').screenshot({path:`${out}/mobile-panel.png`})
  const html=await page.evaluate(()=>{
   const styles=[...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('\n')}catch{return ''}}).join('\n')
   return `<!doctype html><html lang="zh-CN" class="${document.documentElement.className}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>详情页布局方案</title><style>${styles}</style></head><body>${document.body.innerHTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')}</body></html>`
  })
  writeFileSync(`${out}/${width}-${mode}.html`,html)
  await page.close()
 }
 console.log(`Created desktop light/dark and mobile mockups in ${out}; no horizontal overflow.`)
}finally{await browser.close()}
