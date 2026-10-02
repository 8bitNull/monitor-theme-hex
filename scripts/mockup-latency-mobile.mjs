import {chromium} from '@playwright/test'
import {readFileSync,writeFileSync} from 'node:fs'
const out='archive/design/latency-panel'
const browser=await chromium.launch({channel:'chrome'})
try{
 const page=await browser.newPage({viewport:{width:390,height:1100},deviceScaleFactor:2})
 await page.setContent(readFileSync(`${out}/proposal.html`,'utf8'))
 await page.addStyleTag({content:`
 .board{width:390px;padding:18px 12px}.intro{display:block;margin-bottom:14px}.intro h1{font-size:18px}.intro span{display:block;font-size:11px;margin-top:5px}.panel{border-radius:12px}.toolbar{height:auto;display:block;padding:0 12px}.mobile-top{display:flex;height:49px;align-items:center;gap:8px}.mobile-top .tabs{gap:20px;flex:1}.mobile-top button{min-width:44px;min-height:44px;border:0;background:transparent;color:#626d7e;font:12px inherit}.mobile-top button.refresh{font-size:22px;color:#356dcc}.mobile-bottom{display:flex;align-items:center;justify-content:space-between;padding:8px 0 10px}.ranges span{min-width:44px;text-align:center;padding:6px 8px}.toolbar label{font-size:12px}.legendrow{display:block;padding:12px}.routes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.route{min-height:44px;gap:5px;padding:7px;font-size:11px}.route input{width:12px;height:12px;flex-shrink:0}.route .swatch{width:10px;flex-shrink:0}.route>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.route b{margin-left:auto;white-space:nowrap;font-size:11px}.route small{font-size:10px}.stats{display:flex;gap:12px;justify-content:space-between;padding:9px 0 0}.stat{font-size:11px;gap:6px}.stat b{font-size:16px}.mobile-stat-label{display:flex;justify-content:space-between;font-size:11px;color:#788394;padding-top:12px}.mobile-stat-label button{border:0;background:transparent;color:#356dcc;padding:0;font-size:11px}.chart-heading{padding:5px 12px 0}.chart-key{font-size:11px}.chart{padding:0 8px}.chart svg{height:270px}.chart text,.mini text,.loss svg text{font-size:11px}.range-head{padding:6px 12px;gap:8px}.range-head .hint{font-size:11px}.mini{margin:0 8px 10px;height:44px}.mini svg{height:44px}.loss{padding:10px 8px 12px}.loss-head{padding:0 4px;gap:8px}.loss-head select{min-height:36px}.loss-head small{font-size:10px}.loss-foot{padding:0 4px;font-size:10px}.loss svg{height:38px;margin:0}.notes{display:block;font-size:11px;margin:12px 2px 0}.notes span{display:block;margin-top:4px}.mobile-update{text-align:right;font-size:10px;color:#788394;margin-top:10px}
 `})
 await page.evaluate(()=>{
  document.querySelector('.intro h1').textContent='延迟分析 · 手机端方案'
  document.querySelector('.intro>span').textContent='390px 布局预览 · 示例数据'
  document.querySelector('.toolbar').innerHTML='<div class="mobile-top"><div class="tabs"><span>⌁ 资源</span><span class="active">⌁ 延迟</span></div><button>线路⌄</button><button class="refresh" aria-label="刷新">↻</button></div><div class="mobile-bottom"><div class="ranges"><span>1h</span><span class="selected">6h</span><span>24h</span></div><label><input type="checkbox" disabled>平滑</label></div>'
  const stats=document.querySelector('.stats');stats.children[1].remove()
  const label=document.createElement('div');label.className='mobile-stat-label';label.innerHTML='<span>统计线路 · 浙江联通</span><button>详情 / P95 ›</button>';stats.before(label)
  document.querySelector('.chart-key').innerHTML='平均延迟 <span aria-label="采样范围说明">ⓘ</span>'
  document.querySelector('.range-head .hint').textContent='拖动两端缩放'
  document.querySelector('.loss-head small').textContent='时间轴同步'
  document.querySelector('.loss-foot').innerHTML='<span>06:00 — 12:00</span><span>未知留空 · 超时标记</span>'
  document.querySelector('.notes').innerHTML='<span>点按曲线查看延迟、采样范围和丢包</span><span>缩放后显示“恢复全范围”，拖柄触控区 ≥44px</span>'
  const update=document.createElement('div');update.className='mobile-update';update.textContent='更新于 12:04:53';document.querySelector('.legendrow').append(update)
  const NS='http://www.w3.org/2000/svg'
  const addText=(svg,x,y,text,anchor='end')=>{const t=document.createElementNS(NS,'text');t.setAttribute('x',x);t.setAttribute('y',y);t.setAttribute('text-anchor',anchor);t.textContent=text;svg.append(t)}
  for(const selector of ['.chart svg','.mini svg','.loss svg']){
   const svg=document.querySelector(selector)
   const height=selector==='.chart svg'?274:selector==='.mini svg'?50:40
   svg.setAttribute('viewBox',`0 0 348 ${height}`)
   svg.querySelectorAll('text').forEach(t=>t.remove())
   const group=document.createElementNS(NS,'g');group.setAttribute('transform','translate(20.02 0) scale(0.23762 1)')
   while(svg.firstChild){const el=svg.firstChild;if(el.setAttribute)el.setAttribute('vector-effect','non-scaling-stroke');group.append(el)}
   svg.append(group)
   if(selector==='.chart svg'){
    for(const v of [220,240,260,280,300])addText(svg,26,238-(v-220)/80*220+4,v)
    for(const [i,time] of ['06:00','08:00','10:00','12:00'].entries())addText(svg,30+i*96,264,time,i===0?'start':i===3?'end':'middle')
   }
   if(selector==='.mini svg'){
    group.querySelectorAll('rect').forEach((rect,i)=>{if(i>0)rect.remove()})
    for(const x of [30,318]){const rect=document.createElementNS(NS,'rect');for(const [k,v] of Object.entries({x:x-4,y:5,width:8,height:39,rx:3,fill:'#7f8da2'}))rect.setAttribute(k,v);svg.append(rect)}
   }
   if(selector==='.loss svg')addText(svg,24,33,'0%')
  }
 })
 await page.evaluate(()=>document.fonts.ready)
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)
 if(overflow)throw new Error('Mobile mockup overflow')
 await page.locator('.board').screenshot({path:`${out}/mobile.png`})
 writeFileSync(`${out}/mobile.html`,await page.content())
 console.log(`Created ${out}/mobile.png and mobile.html`)
}finally{await browser.close()}
