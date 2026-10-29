import type {Node} from '@/lib/api'
import {liveMetrics} from '@/lib/freshness'
import {percent,pair} from '@/lib/format'
import {tr} from '@/lib/i18n'
import type {ResourceTrendMetric} from '@/lib/resourceTrend'
import {ResourceTrend,type ResourcePreview} from './ResourceTrend'
import {SpeedIndicators} from './SpeedIndicators'
import {Cpu,MemoryStick,HardDrive,ArrowDownUp} from 'lucide-react'

export function DesktopDetailMetrics({node,preview,onSelectResource}:{
 node:Node;preview:ResourcePreview;onSelectResource:(metric:ResourceTrendMetric)=>void
}){
 const m=liveMetrics(node)
 if(!m)return null
 const cards:{key:ResourceTrendMetric;label:string;value:number;foot:string}[]=[
  {key:'cpu',label:'CPU',value:m.cpu,foot:tr('{0} 核',node.cpu_cores)},
   {key:'mem_used',label:tr('内存'),value:m.mem_total>0?percent(m.mem_used,m.mem_total):NaN,foot:pair(m.mem_used,m.mem_total)},
   {key:'disk_used',label:tr('硬盘'),value:m.disk_total>0?percent(m.disk_used,m.disk_total):NaN,foot:pair(m.disk_used,m.disk_total)},
 ]
 return <div className="desktop-detail-metrics">
  {cards.map(card=><section key={card.key} className="detail-metric-card" data-metric={card.key}>
    <h3>{card.key==='cpu'?<Cpu size={15}/>:card.key==='mem_used'?<MemoryStick size={15}/>:<HardDrive size={15}/>} {card.label}</h3>
    <strong className="detail-metric-value">{Number.isFinite(card.value)?card.value.toFixed(1):'—'}{Number.isFinite(card.value)&&<small>%</small>}</strong>
   <p className="detail-metric-note">{card.foot}</p>
   <div className="detail-metric-track" data-level={card.value>=90?'danger':card.value>=75?'warning':'normal'} aria-hidden="true"><i style={{width:`${Number.isFinite(card.value)?Math.max(0,Math.min(100,card.value)):0}%`}}/></div>
   <ResourceTrend metric={card.key} preview={preview} onSelect={onSelectResource}/>
  </section>)}
  <section className="detail-metric-card detail-metric-network" data-metric="network">
    <h3><ArrowDownUp size={15}/> {tr('实时网速')}</h3>
   <SpeedIndicators key={node.id} node={node} detail compact/>
   <small>{tr('最近 60 秒')}</small>
  </section>
 </div>
}
