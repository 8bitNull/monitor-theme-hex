import {useMemo} from 'react'
import {summarizeResource,type ResourceSample,type ResourceSampleKey} from '@/lib/resourceSummary'
import {bytes,rate} from '@/lib/format'
import {tr,locale} from '@/lib/i18n'
import type {ResourceMetricKey} from './ResourceHistory'

export function ResourceSummary({rows,metric,hours}:{rows:readonly ResourceSample[];metric:ResourceMetricKey;hours:number}){
 const groups=useMemo(()=>{
  const keys:ResourceSampleKey[]=metric==='network'?['net_tx','net_rx']:[metric]
  return keys.map(key=>({key,...summarizeResource(rows,key)}))
 },[rows,metric])
 const format=(value:number|null,key:ResourceSampleKey)=>value===null?'—':key==='cpu'?`${value.toFixed(1)}%`:key==='net_tx'||key==='net_rx'?rate(value):bytes(value)
 const values=(group:(typeof groups)[number])=>[group.latest,group.mean,group.peak].map(value=>format(value,group.key))
 const labels=[tr('最新采样'),tr('样本均值'),tr('采样峰值')]
 return <section className="resource-summary" aria-label={tr('历史采样摘要')}>
  {metric==='network'?<table className="resource-summary-network">
   <thead><tr><th scope="col"><span className="sr-only">{tr('网速')}</span></th>{labels.map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
   <tbody>{groups.map(group=><tr key={group.key}><th scope="row">{group.key==='net_tx'?tr('上行'):tr('下行')}</th>{values(group).map((value,i)=><td key={i}>{value}</td>)}</tr>)}</tbody>
  </table>:<dl>{labels.map((label,i)=><div key={label}><dt>{label}</dt><dd>{values(groups[0])[i]}</dd></div>)}</dl>}
  <details key={`${metric}:${hours}`} className="resource-summary-details">
   <summary>{tr('统计说明')}</summary>
   {groups.map(group=><p key={group.key}>{metric==='network'&&<>{group.key==='net_tx'?tr('上行'):tr('下行')} · </>}{tr('有效样本：{0}',group.count)} · {tr('样本时间：{0}',group.latestAt===null?'—':new Date(group.latestAt).toLocaleString(locale()))}</p>)}
   <p>{tr('基于返回样本，非连续时间加权统计。')}</p>
  </details>
 </section>
}
