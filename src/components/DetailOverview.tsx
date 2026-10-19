import type {ResourcePreview} from './ResourceTrend'
import type {ResourceTrendMetric} from '@/lib/resourceTrend'
import type {Node} from '@/lib/api'
import {liveMetrics,nodeState} from '@/lib/freshness'
import {tr,locale} from '@/lib/i18n'
import {osName} from '@/lib/format'
import {Clock,Monitor,MapPin} from 'lucide-react'
import {NodePicker} from './NodePicker'
import {Status} from './NodeIdentity'
import {DetailRemarks} from './DetailRemarks'
import {DetailAccount} from './DetailAccount'
import {DetailConnectionStats} from './DetailConnectionStats'
import {DesktopDetailMetrics} from './DesktopDetailMetrics'
export function DetailIdentity({node,nodes,onSwitch}:{node:Node;nodes:Node[];onSwitch:(id:number)=>void}){
 let country=node.country;try{country=new Intl.DisplayNames([locale()],{type:'region'}).of(node.country.toUpperCase()) || node.country}catch{/* Preserve unknown country text. */}
 const lastSeen=node.last_seen>0?new Date(node.last_seen*1000):null
 const reported=lastSeen&&Number.isFinite(lastSeen.getTime())?lastSeen:null
 return (      <div className="detail-identity">
        <div className="detail-title-row"><div className="detail-title"><NodePicker node={node} nodes={nodes} onSwitch={onSwitch}/></div><div className="node-status-group"><div className="node-ip-tags" aria-label={tr("IP 协议")}>{(node.ipv4 || node.ipv4_pin) && <span className="tag">V4</span>}{(node.ipv6 || node.ipv6_pin) && <span className="tag">V6</span>}</div><Status node={node}/></div></div>
        <div className="detail-subtitle">{country&&<span><MapPin size={14}/>{country}</span>}<span title={tr("系统")}><Monitor size={14}/>{osName(node.os)}</span><span className="detail-last-seen"><Clock size={13}/>{reported?<time dateTime={reported.toISOString()}>{tr("上次上报：{0}",reported.toLocaleString(locale()))}</time>:tr("上次上报时间未知")}</span></div>
        <DetailRemarks key={`${node.id}:${node.remark}`} text={node.remark??''}/>
      </div>
)
}
export function DetailLiveOverview({node,authed,preview,onSelectResource}:{node:Node;authed:boolean;preview:ResourcePreview;onSelectResource:(metric:ResourceTrendMetric)=>void}){
 const m=liveMetrics(node)
 const state=nodeState(node)
 return <section className="detail-live" data-layout="metric-cards" aria-label={tr('实时指标')}>
  <h2 className="detail-section-title">{tr('实时状态')}</h2>
  <div className="detail-overview-grid" data-live={!!m}>
   {m?<><DesktopDetailMetrics node={node} preview={preview} onSelectResource={onSelectResource}/><DetailConnectionStats node={node} withLoad/></>:<section className="overview-unavailable" role="status"><h3>{state==='offline'?tr('离线'):state==='stale'?tr('数据已过期'):tr('等待数据')}</h3><p>{tr('实时资源与网速暂不可用')}</p></section>}
   <DetailAccount node={node} authed={authed}/>
  </div>
 </section>
}
