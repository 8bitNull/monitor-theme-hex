import {chromium} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import {nodes,metrics} from './fixtures.mjs'

const out='archive/design/card-network'
mkdirSync(out,{recursive:true})
const browser=await chromium.launch({channel:'chrome'})
try {
 const page=await browser.newPage({viewport:{width:1180,height:1000},deviceScaleFactor:2})
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message))
 await page.addInitScript(()=>{
  localStorage.setItem('monitor-next',JSON.stringify({_storageVersion:1,designVersion:1,appearance:'light',infoDensity:'full'}))
  localStorage.setItem('monitor-next-language','zh')
 })
 await page.route('**/api/me',r=>r.fulfill({json:{authed:false,github:false,site_name:'Monitor HEX',public_page:true}}))
 const fleet=nodes();fleet[1].expires_at=new Date(Date.now()+14*86400000).toISOString()
 await page.route('**/api/nodes',r=>r.fulfill({json:{nodes:fleet}}))
 await page.route('**/api/nodes/*/metrics?*',r=>r.fulfill({json:metrics()}))
 await page.goto('http://127.0.0.1:4295')
 await page.locator('.node-card').first().waitFor()
 await page.locator('.latency-reading').first().waitFor()
 await page.evaluate(()=>document.fonts.ready)
 const source=await page.locator('.node-card').nth(1).evaluate(el=>el.outerHTML)
 const styles=await page.evaluate(()=>[...document.styleSheets].map(s=>{try{return [...s.cssRules].map(r=>r.cssText).join('\n')}catch{return ''}}).join('\n'))
 const html=await page.evaluate(({source,styles})=>{
  const base=document.createElement('div');base.innerHTML=source
  const proposed=base.firstElementChild.cloneNode(true)
  const wave=(color,d)=>`<svg viewBox="0 0 144 23" preserveAspectRatio="none" role="img" aria-label="示例速率趋势"><path d="${d}" fill="none" stroke="var(--${color})" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  const panel=document.createElement('section');panel.className='proposal-network'
  panel.innerHTML=`<div class="proposal-speeds"><div><div class="proposal-caption"><span>↑ 上行</span><b>1.32 <small>Mbps</small></b></div>${wave('upload','M1 17 C7 17 9 12 15 13 S24 21 31 15 S39 14 44 9 S51 18 58 13 S66 16 72 11 S80 3 87 10 S96 18 103 12 S111 14 117 9 S128 16 135 11 L143 12')}</div><div><div class="proposal-caption"><span>↓ 下行</span><b>3.86 <small>Mbps</small></b></div>${wave('download','M1 16 C8 16 10 8 16 11 S25 17 31 10 S39 11 45 6 S53 13 59 12 S66 18 73 11 S81 9 88 6 S96 15 104 11 S112 5 118 8 S129 13 135 8 L143 9')}</div></div><div class="proposal-connections"><div><span>TCP</span><b>102</b></div><div><span>UDP</span><b>24</b></div></div><div class="proposal-billing"><div><span>本月用量</span><div><b>66.0 GB</b><small> / 1.00 TB</small></div><div class="proposal-quota"><i></i></div></div><div class="proposal-expiry"><span>到期时间</span><div><b>2026.10.07</b></div><small>剩余 14 天</small></div></div>`
  proposed.querySelector('.speed-pair').replaceWith(panel)
  proposed.querySelector('.traffic-summary')?.remove()
  proposed.querySelector('.node-connections')?.remove()
  const timing=proposed.querySelector('.node-timing');if(timing?.children.length>1)timing.lastElementChild.remove()
  const price=proposed.querySelector('.node-price')
  if(timing&&price)timing.append(price)
  const footer=proposed.querySelector('.node-footer')
  if(footer&&!footer.children.length)footer.remove()
  const remarks=document.createElement('div')
  remarks.className='proposal-remarks node-remarks'
  remarks.setAttribute('aria-label','备注')
  for(const [index,text] of ['国际线路','Backup','Production'].entries()){
   const tag=document.createElement('span')
   tag.className=`detail-remark-tag remark-hue-${index}`
   tag.textContent=text
   remarks.append(tag)
  }
  proposed.querySelector('.node-more').append(remarks)
  proposed.classList.add('proposal-card')
  const css=`
  body{background:#f3f5f8;margin:0;color:#202631;font-family:Inter,'Segoe UI','Microsoft YaHei',sans-serif}
  .mockup-board{padding:32px;max-width:1180px;margin:auto}.mockup-heading{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:24px}.mockup-heading h1{font-size:23px;font-weight:600;margin:0}.mockup-heading p{font-size:12px;color:#626d7e;margin:0}.mockup-columns{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;align-items:start}.mockup-label{font-size:13px;color:#626d7e;margin-bottom:12px;display:flex;justify-content:space-between}.mockup-label b{color:#202631;font-weight:500}.mockup-column .node-card{width:100%;margin:0;pointer-events:none}.mockup-column.dark{background:transparent}.mockup-column .next-theme{background:transparent}.mockup-note{font-size:12px;color:#626d7e;margin:18px 0 0;line-height:1.8}.mockup-column .node-secondary-disclosure{display:block}.mockup-column .node-secondary-disclosure>summary{display:none}
  .proposal-network{text-align:left;margin:0 var(--card-pad);padding:5px 0 10px;font-variant-numeric:tabular-nums}
  .proposal-speeds{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.proposal-caption{display:flex;justify-content:space-between;align-items:baseline;gap:4px}.proposal-caption>span{font-size:11px;white-space:nowrap;color:var(--muted-foreground)}.proposal-caption b{font-size:16px;letter-spacing:-.3px;font-weight:600;white-space:nowrap;color:var(--foreground)}.proposal-caption small{font-size:10px;font-weight:400;color:var(--muted-foreground)}.proposal-speeds svg{display:block;width:100%;height:23px;margin-top:5px}
  .proposal-connections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:8px 0 11px}.proposal-connections>div{display:flex;justify-content:space-between;align-items:center}.proposal-connections span{font-size:11px;color:var(--muted-foreground)}.proposal-connections b{font-size:12px;font-weight:500;color:var(--foreground)}
  .proposal-billing{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:20px;border-top:1px solid var(--border);padding-top:9px}.proposal-billing>div>span{display:block;font-size:11px;color:var(--muted-foreground);margin-bottom:4px}.proposal-billing b{font-size:12px;font-weight:500;color:var(--foreground)}.proposal-billing small{font-size:10px;color:var(--muted-foreground)}.proposal-expiry{text-align:right}.proposal-quota{height:3px;background:var(--muted);margin-top:8px;border-radius:2px}.proposal-quota i{display:block;width:6.6%;height:3px;background:var(--tone);border-radius:2px}.proposal-expiry>small{display:block;margin-top:3px}.proposal-card .node-more{border-top:1px solid var(--border);margin-top:4px}.mockup-footer{font-size:11px;color:#626d7e;margin-top:24px}
  .proposal-card .node-timing{display:flex;align-items:center;justify-content:space-between;flex-wrap:nowrap;gap:12px;padding:4px 0 14px}.proposal-card .node-timing .node-price{margin-left:auto;text-align:right;white-space:nowrap;justify-content:flex-end}
  .proposal-card .node-timing:has(+.proposal-remarks){padding-bottom:8px}.proposal-card .proposal-remarks{display:flex;width:100%;justify-content:flex-start;align-items:center;flex-wrap:wrap;gap:6px;text-align:left;padding:0 0 14px}.proposal-card .proposal-remarks:empty{display:none}.proposal-card .proposal-remarks .detail-remark-tag{max-width:100%;white-space:normal;overflow-wrap:anywhere}
  @media(max-width:700px){.mockup-board{padding:18px}.mockup-columns{grid-template-columns:1fr}.mockup-heading{display:block}.mockup-heading p{margin-top:8px}.mockup-column:first-child,.mockup-column:last-child{display:none}.mockup-column{max-width:400px;width:100%;margin:auto}}
  `
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>首页卡片 · 紧凑网络区方案</title><style>${styles}\n${css}</style></head><body><main class="mockup-board"><header class="mockup-heading"><h1>首页卡片 · 紧凑网络区</h1><p>布局提案 / 示例数据 / 2026.09.23</p></header><div class="mockup-columns"><section class="mockup-column"><div class="mockup-label"><b>当前布局</b><span>信息分散</span></div><div class="next-theme">${source}</div></section><section class="mockup-column"><div class="mockup-label"><b>推荐方案</b><span>两条独立细波线</span></div><div class="next-theme">${proposed.outerHTML}</div><p class="mockup-note">速率与连接数上下对齐<br>用量、到期并列，集中在延迟区域之前</p></section><section class="mockup-column dark"><div class="mockup-label"><b>深色预览</b><span>相同信息层级</span></div><div class="next-theme">${proposed.outerHTML}</div></section></div><footer class="mockup-footer">波形为布局示意；落地时使用真实采样。没有历史数据时显示空态，离线时显示「—」。</footer></main></body></html>`
 },{source,styles})
 writeFileSync(`${out}/proposal.html`,html)
 await page.setContent(html)
 await page.evaluate(()=>document.fonts.ready)
 await page.locator('.mockup-board').screenshot({path:`${out}/comparison.png`})
 await page.setViewportSize({width:390,height:900})
 await page.screenshot({path:`${out}/mobile.png`,fullPage:true})
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
 if(overflow)throw new Error('Mobile horizontal overflow')
 console.log(`Created ${out}/comparison.png, mobile.png and proposal.html; mobile overflow check passed.`)
}finally{await browser.close()}

