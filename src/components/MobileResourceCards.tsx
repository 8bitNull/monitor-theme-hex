import {useEffect,useId,useRef} from 'react'
import {ArrowDownUp,ChevronDown} from 'lucide-react'
import {HistoryState} from './HistoryState'
import {ResourceHistory,resourceOptions,type ResourceMetricKey} from './ResourceHistory'
import {liveMetrics} from '@/lib/freshness'
import {bytes,percent} from '@/lib/format'
import {tr} from '@/lib/i18n'
import '@/styles/mobile-resource-cards.css'

type Props=Omit<Parameters<typeof ResourceHistory>[0],'mobile'|'mobileCard'> & {onMetric:(metric:ResourceMetricKey)=>void}
export function MobileResourceCards({node,rows,hours,metric,compact,onMetric}:Props){
 const root=useRef<HTMLDivElement>(null),networkId=useId(),live=liveMetrics(node)
 useEffect(()=>{
  if(metric==='cpu')return
  const frame=requestAnimationFrame(()=>root.current?.querySelector<HTMLElement>(`[data-resource-card="${metric}"]`)?.scrollIntoView({block:'start',behavior:'instant'}))
  return()=>cancelAnimationFrame(frame)
 },[metric])
 return <div className="ma-resource-cards" ref={root}>
  {resourceOptions.filter(option=>option.key!=='network').map(({key,label,Icon})=>{
   const total=key==='mem_used'?(live?.mem_total??node.mem_total):key==='disk_used'?(live?.disk_total??node.disk_total):0
   const value=live?key==='cpu'?live.cpu:total>0?percent(live[key],total):null:null
   return <section key={key} className="ma-resource-card" data-resource-card={key} aria-label={tr(label)}>
    <div className="ma-resource-card-heading"><h2><Icon size={17} aria-hidden="true"/>{tr(label)}</h2><small>{tr('当前使用率')}</small></div>
    <div className="ma-resource-card-value"><strong>{value===null?'—':value.toFixed(1)}{value!==null&&<small> %</small>}</strong><span>{key==='cpu'?tr('{0} 核',node.cpu_cores):`${live?bytes(live[key]):'—'} / ${bytes(total)}`}</span></div>
    {rows.length?<ResourceHistory node={node} rows={rows} hours={hours} metric={key} compact={compact} mobile mobileCard/>:<HistoryState message={tr("这段时间没有历史数据")}/>}
    {key==='mem_used'&&(live?.swap_total??node.swap_total)>0&&<p className="ma-resource-swap">Swap <span>{live?bytes(live.swap_used):'—'} / {bytes(live?.swap_total??node.swap_total)}</span></p>}
   </section>
  })}
  <section className="ma-resource-network" data-resource-card="network">
   <button type="button" className="ma-resource-network-toggle" aria-label={tr('网速历史')} aria-expanded={metric==='network'} aria-controls={metric==='network'?networkId:undefined} onClick={()=>onMetric(metric==='network'?'cpu':'network')}><span><ArrowDownUp size={17}/>{tr('网速历史')}</span><ChevronDown size={17}/></button>
   {metric==='network'&&<div id={networkId}>{rows.length?<ResourceHistory node={node} rows={rows} hours={hours} metric="network" compact={compact} mobile/>:<HistoryState message={tr("这段时间没有历史数据")}/>}</div>}
  </section>
 </div>
}
