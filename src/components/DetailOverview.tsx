import type {ResourcePreview} from './ResourceTrend'
import type {ResourceTrendMetric} from '@/lib/resourceTrend'
import type {Node} from '@/lib/api'
import {liveMetrics,nodeState} from '@/lib/freshness'
import {tr,locale} from '@/lib/i18n'
import {osName,bytes,daysUntil,money,CYCLES,FOREVER} from '@/lib/format'
import {Activity,Clock,Monitor,MapPin} from 'lucide-react'
import {NodePicker} from './NodePicker'
import {Status} from './NodeIdentity'
import {RemarkTags} from './RemarkTags'
import {DesktopDetailMetrics} from './DesktopDetailMetrics'
import {trafficUsage,trafficPeriodLabel} from '@/lib/traffic'
export function DetailIdentity({node,nodes,onSwitch}:{node:Node;nodes:Node[];onSwitch:(id:number)=>void}){
 let country=node.country;try{country=new Intl.DisplayNames([locale()],{type:'region'}).of(node.country.toUpperCase()) || node.country}catch{/* Preserve unknown country text. */}
 const lastSeen=node.last_seen>0?new Date(node.last_seen*1000):null
 const reported=lastSeen&&Number.isFinite(lastSeen.getTime())?lastSeen:null
 return (      <div className="detail-identity">
        <div className="detail-title-row"><div className="detail-title"><NodePicker node={node} nodes={nodes} onSwitch={onSwitch}/></div><div className="node-status-group"><div className="node-ip-tags" aria-label={tr("IP 协议")}>{(node.ipv4 || node.ipv4_pin) && <span className="tag">V4</span>}{(node.ipv6 || node.ipv6_pin) && <span className="tag">V6</span>}</div><Status node={node}/></div></div>
        <div className="detail-subtitle">{country&&<span><MapPin size={14}/>{country}</span>}<span title={tr("系统")}><Monitor size={14}/>{osName(node.os)}</span><span className="detail-last-seen"><Clock size={13}/>{reported?<time dateTime={reported.toISOString()}>{tr("上次上报：{0}",reported.toLocaleString(locale()))}</time>:tr("上次上报时间未知")}</span></div>
      </div>
)
}
export function DetailLiveOverview({node,preview,onSelectResource}:{node:Node;preview:ResourcePreview;onSelectResource:(metric:ResourceTrendMetric)=>void}){
 const m=liveMetrics(node)
 const state=nodeState(node)
 const remarkTags=(node.remark??'').split(/[;；]/).map(text=>text.trim()).filter(Boolean)
 const traffic=trafficUsage(node),days=daysUntil(node.expires_at)
 const expiry=days===null?tr('未设到期'):days<0?tr('已过期 {0} 天',-days):tr('{0} 天后到期',days)
 return <section className="detail-live" data-layout="metric-cards" aria-label={tr("实时指标")}>
  <div className="detail-module-heading sr-only"><h2><Activity size={15}/>{tr("节点概览")}</h2><small>{m?tr("当前数据"):state==='offline'?tr("离线"):state==='stale'?tr("数据已过期"):tr("等待数据")}</small></div>
  <div className="detail-overview-grid" data-live={!!m}>
   {m?<DesktopDetailMetrics node={node} preview={preview} onSelectResource={onSelectResource}/>:<section className="overview-unavailable" role="status"><h3>{state==='offline'?tr("离线"):state==='stale'?tr("数据已过期"):tr("等待数据")}</h3><p>{tr("实时资源与网速暂不可用")}</p></section>}
   <section className="overview-account"><h3>{tr("用量与账期")}</h3>
    <div className="overview-billing">
     <div className="overview-usage" title={tr("流量周期：每月 {0} 日重置，本周期自 {1} 起",traffic.resetDay,traffic.periodKey)}><span>{tr(trafficPeriodLabel(node))}</span><b>{bytes(traffic.value)} <small>/ {node.traffic_limit>0?bytes(node.traffic_limit):FOREVER}</small></b>{node.traffic_limit>0&&<progress aria-label={tr(trafficPeriodLabel(node))} max={node.traffic_limit} value={Math.min(node.traffic_limit,Math.max(0,traffic.value))}/>}</div>
     <div className={`overview-expiry ${days!==null&&days<=7?'expiring':''}`}><span>{tr("到期时间")}</span><b>{days!==null&&node.expires_at?node.expires_at.replaceAll('-','.'): '—'}</b><small>{expiry}</small></div>
    </div>
    <div className="overview-account-footer"><span className="overview-price">{node.price>0?`${money(node.price,node.currency)} / ${tr(Object.hasOwn(CYCLES,node.billing_cycle)?CYCLES[node.billing_cycle]:node.billing_cycle)}`:node.price===0?tr("免费 / 未填写"):tr("价格未知")}</span></div>
   </section>
  </div>
  {remarkTags.length>0&&<div className="detail-meta-tags overview-remarks remarks-expanded" aria-label={tr("备注")}><span className="overview-remarks-label">{tr("备注")}</span><RemarkTags texts={remarkTags}/></div>}
 </section>
}
