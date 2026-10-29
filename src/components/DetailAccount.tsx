import type {Node} from '@/lib/api'
import {tr} from '@/lib/i18n'
import {bytes,daysUntil,money,CYCLES} from '@/lib/format'
import {trafficUsage,trafficPeriodLabel} from '@/lib/traffic'

function TrafficTotals({node}:{node:Node}){
 return <dl className="account-traffic-totals">{[
  {label:tr('今日流量'),tx:node.day_tx,rx:node.day_rx},
  {label:tr('累计流量'),tx:node.total_tx,rx:node.total_rx},
 ].map(({label,tx,rx})=><div key={label}><dt>{label}</dt><dd><span>{tr('上传')} {bytes(tx)}</span><span>{tr('下载')} {bytes(rx)}</span></dd></div>)}</dl>
}

export function TrafficUsageCard({node}:{node:Node}){
 const traffic=trafficUsage(node)
 const mode=node.traffic_mode==='up'?tr('仅上传'):node.traffic_mode==='down'?tr('仅下载'):node.traffic_mode==='max'?tr('上传与下载取较大值'):tr('上传与下载合计')
 const resetKnown=Number.isInteger(node.traffic_reset_day)&&node.traffic_reset_day>=1&&node.traffic_reset_day<=31
 const reset=resetKnown?tr('每月 {0} 日重置',traffic.resetDay):tr('流量重置未知')
 return <section className="account-card account-traffic" aria-label={tr('流量用量')}>
  <h3>{tr('流量用量')}</h3>
  <div className="overview-usage" title={resetKnown?tr('流量周期：每月 {0} 日重置，本周期自 {1} 起',traffic.resetDay,traffic.periodKey):reset}>
   <span>{tr(trafficPeriodLabel(node))}</span><b>{bytes(traffic.value)} <small>/ {node.traffic_limit>0?bytes(node.traffic_limit):tr('不限量')}</small></b>
   {node.traffic_limit>0&&<progress aria-label={tr('流量额度使用率')} max={node.traffic_limit} value={Math.min(node.traffic_limit,Math.max(0,traffic.value))}/>}
  </div>
   <p className="account-note">{reset} · {mode}</p>
   <TrafficTotals node={node}/>
 </section>
}
export function CostCard({node,authed}:{node:Node;authed:boolean}){
 if(!authed)return null
 const price=node.price>0?money(node.price,node.currency):node.price===0?tr('免费 / 未填写'):tr('价格未知')
 const cycle=tr(Object.hasOwn(CYCLES,node.billing_cycle)?CYCLES[node.billing_cycle]:node.billing_cycle)
 return <section className="account-card account-cost" aria-label={tr('费用与周期')}>
  <h3>{tr('费用')}</h3><div className="account-values">
   <div><span>{tr('费用')}</span><b className="overview-price">{price}</b></div>
   <div className="account-cycle"><span>{tr('付费周期')}</span><b>{cycle||'—'}</b></div>
  </div>
 </section>
}
export function ExpiryCard({node,mobile=false}:{node:Node;mobile?:boolean}){
 const days=daysUntil(node.expires_at),date=days!==null&&node.expires_at?node.expires_at.replaceAll('-','.'):'—'
 const status=days===null?tr('未设到期'):days<0?tr('已过期 {0} 天',-days):days===0?tr('今日到期'):tr('{0} 天后到期',days)
 return <section className="account-card account-expiry" aria-label={tr('到期与剩余天数')}>
  <h3>{tr('到期')}</h3>
  <div className={`overview-expiry account-values ${days!==null&&days<=7?'expiring':''}`}>
   <div className="account-date"><span>{tr('到期日期')}</span><b>{date}</b></div>
   <div className="account-days"><span>{days!==null&&days<0?tr('已到期'):tr('剩余天数')}</span><b>{days===null?'—':Math.abs(days)} {days!==null&&<small>{tr('天')}</small>}</b></div>
  </div>
  {mobile?<p className="account-note">{days===null?status:days<=0?`${date} · ${status}`:tr('{0} 到期',date)}</p>:days===null||days<=0?<p className={`account-note${days!==null?' account-expiry-status':''}`}>{status}</p>:null}
 </section>
}
export function DetailAccount({node,authed,mobile=false}:{node:Node;authed:boolean;mobile?:boolean}){
  return <section id="detail-account" tabIndex={-1} className={`detail-account${mobile?' ma-billing-panel':''}`} aria-label={tr('流量与账期')}>
   <h2 className="detail-section-title">{tr('流量与账期')}</h2>
  <div className="overview-account" data-price-visible={authed} id={mobile?'ma-billing-details':undefined}>
   <TrafficUsageCard node={node}/><CostCard node={node} authed={authed}/><ExpiryCard node={node} mobile={mobile}/>
  </div>
 </section>
}
