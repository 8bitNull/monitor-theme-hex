import {chromium} from '@playwright/test'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
const out='archive/design/card-billing-aligned';mkdirSync(out,{recursive:true})
const browser=await chromium.launch({channel:'chrome'})
try{
 const page=await browser.newPage({viewport:{width:1100,height:1300},deviceScaleFactor:2})
 await page.setContent(readFileSync('archive/design/card-billing-indicators/proposal.html','utf8'))
 await page.evaluate(()=>{
  document.querySelector('h1').textContent='首页卡片 · 用量与到期三层对齐'
  document.querySelector('.lead').textContent='标题识别内容，数值突出重点，第三行统一呈现额度与到期状态。'
  for(const bar of document.querySelectorAll('.quota')){
   const meter=document.createElement('div');meter.className='quota-meter';bar.replaceWith(meter);meter.append(bar)
   const value=document.createElement('span');value.className='percent';value.textContent=bar.classList.contains('danger')?'104%':bar.classList.contains('warning')?'90%':'44%';meter.append(value)
  }
  const examples=document.querySelectorAll('.variant')
  examples[0].querySelector('.usage').insertAdjacentHTML('afterend','<div class="reset-note">10月1日重置</div>')
  examples[0].querySelector('p').textContent='无限额度不画条；有重置数据时显示重置日。'
  examples[1].querySelector('p').textContent='正常日期保持中性色，仅额度和剩余天数变色。'
  examples[2].classList.add('narrow-example')
  examples[2].querySelector('.variant-name').textContent='窄屏简化'
  examples[2].querySelector('.mini-billing').innerHTML=document.querySelector('.billing').innerHTML
  examples[2].querySelector('p').textContent='空间不足时省略百分比，日期与主数值保持完整。'
  document.querySelector('.footnote').textContent='布局示意 · 示例额度 220 / 500 GB（44%）；重置日仅在有实际数据时显示。图中曲线为示例。'
 })
 await page.addStyleTag({content:`
 .billing>div,.mini-billing>div{display:grid;grid-template-rows:18px 24px 20px;align-items:center;min-width:0}
 .billing .caption,.mini-billing .caption{margin:0;white-space:nowrap}
 .billing .usage,.mini-billing .usage{margin:0;white-space:nowrap;line-height:24px}
 .billing .usage b{font-size:14px;font-weight:600}.billing .usage span{font-size:10px}
 .billing .expiry>b,.mini-billing .expiry>b{margin:0;line-height:24px;white-space:nowrap}
 .billing .expiry>b{font-size:14px;font-weight:500}
 .billing .expiry small,.mini-billing .expiry small{margin:0;line-height:20px;align-self:center}
 .quota-meter{display:flex;align-items:center;gap:8px;min-width:0;height:20px}
 .quota-meter .quota{flex:1;min-width:0;margin:0;height:3px}
 .percent{font-size:10px;line-height:20px;color:#758196;font-variant-numeric:tabular-nums}
 .warning+.percent{color:#a77c24}.danger+.percent{color:#bd5454}
 .reset-note{font-size:10px;color:#7e899b;line-height:20px}
 .narrow-example .percent{display:none}
 .mini-billing .usage b,.mini-billing .expiry>b{font-size:12px}
 .mini-billing .usage span{font-size:10px}
 .phone .billing .usage b,.phone .billing .expiry>b{font-size:13px}
 .variant{padding:14px 12px}.mini-billing{gap:12px}
 `})
 await page.evaluate(()=>document.fonts.ready)
 writeFileSync(`${out}/proposal.html`,await page.content())
 await page.locator('.board').screenshot({path:`${out}/proposal.png`})
}finally{await browser.close()}
