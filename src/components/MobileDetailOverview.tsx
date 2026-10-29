import type {ResourceMetricKey} from './ResourceHistory'
import type {Node} from '@/lib/api'
import {liveMetrics,nodeState} from '@/lib/freshness'
import {adaptiveRateParts,bytes,percent,relativeTime} from '@/lib/format'
import {DetailAccount} from './DetailAccount'
import {DetailConnectionStats} from './DetailConnectionStats'
import {ResourceTrend,type ResourcePreview} from './ResourceTrend'
import {SpeedIndicators} from './SpeedIndicators'
import {tr,locale} from '@/lib/i18n'
import {Activity,ChevronRight,Cpu,MemoryStick,HardDrive} from 'lucide-react'

export function MobileDetailOverview({node,authed,totals,preview,onNetwork,onResource}:{
 node:Node;authed:boolean;totals:boolean;preview:ResourcePreview;onNetwork:()=>void;onResource:(metric:ResourceMetricKey)=>void
}){
 const m=liveMetrics(node)
 const upload=adaptiveRateParts(m?.net_tx??NaN),download=adaptiveRateParts(m?.net_rx??NaN)
 return <div className="ma-detail-overview">
  {m?<>
   <section className="ma-panel ma-resource-panel">
    <h2>{tr('资源使用')}</h2>
    <div className="ma-big-grid">
     {([
      {key:'cpu',label:'CPU',value:m.cpu,foot:tr('{0} 核',node.cpu_cores),capacity:false,action:tr('查看 CPU 历史趋势'),Icon:Cpu},
      {key:'mem_used',label:tr('内存'),value:m.mem_total>0?percent(m.mem_used,m.mem_total):NaN,foot:`${bytes(m.mem_used)} / ${bytes(m.mem_total)}`,capacity:true,action:tr('查看内存历史趋势'),Icon:MemoryStick},
      {key:'disk_used',label:tr('硬盘'),value:m.disk_total>0?percent(m.disk_used,m.disk_total):NaN,foot:`${bytes(m.disk_used)} / ${bytes(m.disk_total)}`,capacity:true,action:tr('查看硬盘历史趋势'),Icon:HardDrive},
     ] as const).map(metric=><section className="ma-big-metric ma-resource-overview-card" data-kind={metric.key} key={metric.key}>
      <button className="ma-metric-action" aria-label={metric.action} aria-describedby={`ma-${metric.key}-value${!metric.capacity||totals?` ma-${metric.key}-capacity`:''}`} onClick={()=>onResource(metric.key)}>
       <small className="ma-metric-label"><span><metric.Icon size={15}/>{metric.label}</span><ChevronRight size={14} aria-hidden="true"/></small>
       <strong id={`ma-${metric.key}-value`} data-hot={metric.value>=85}>{Number.isFinite(metric.value)?metric.value.toFixed(1):'—'}{Number.isFinite(metric.value)&&<small> %</small>}</strong>
       {(!metric.capacity||totals)&&<p id={`ma-${metric.key}-capacity`}>{metric.foot}</p>}
       <ResourceTrend metric={metric.key} preview={preview} onSelect={onResource} passive/>
      </button>
     </section>)}
     <section className="ma-big-metric" data-kind="load">
      <small className="ma-metric-label"><span><Activity size={15}/>{tr('负载')}</span></small>
      <strong>{Number.isFinite(m.load[0])?m.load[0].toFixed(2):'—'}</strong>
      <p>{tr('1 分钟 · {0} 核',node.cpu_cores)}</p>
      <div className="ma-load-summary">{[1,2].map(i=><span key={i}>{tr('{0} 分钟',i===1?5:15)} <b>{Number.isFinite(m.load[i])?m.load[i].toFixed(2):'—'}</b></span>)}</div>
     </section>
    </div>
   </section>
   <section className="ma-panel ma-overview-network">
    <h2>{tr('实时网速')}</h2>
    <button className="ma-speed-history" aria-label={tr('网速历史')} aria-describedby="ma-speed-values" onClick={()=>onResource('network')}><span id="ma-speed-values" className="sr-only">{tr('上行')} {upload.amount} {upload.unit} · {tr('下行')} {download.amount} {download.unit}</span><SpeedIndicators node={node} detail compact sharedEmpty/></button>
    <DetailConnectionStats node={node}/>
    <button className="ma-row" onClick={onNetwork}><span>{tr('网络质量')}</span><ChevronRight size={16}/></button>
   </section>
  </>:<section className="ma-panel ma-unavailable">
   <h2>{tr(nodeState(node)==='offline'?'离线':nodeState(node)==='stale'?'数据已过期':'等待首次上报')}</h2>
   <p>{tr('实时资源与网速暂不可用')}</p>
   <p className="ma-muted">{tr('最近上报时间')}<br/>{node.last_seen>0?<time dateTime={new Date(node.last_seen*1000).toISOString()}>{relativeTime(node.last_seen)} · {new Date(node.last_seen*1000).toLocaleString(locale())}</time>:tr('上次上报时间未知')}</p>
   <button className="ma-row" onClick={onNetwork}><span>{tr('查看网络历史')}</span><ChevronRight size={16}/></button>
  </section>}
  <DetailAccount node={node} authed={authed} mobile/>
 </div>
}
