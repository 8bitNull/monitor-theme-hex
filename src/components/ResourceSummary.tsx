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
 return <section className="resource-summary" aria-label={tr('历史采样摘要')}>
  <p>{tr('查询范围：{0} 小时',hours)}</p>
  {groups.map(group=><div key={group.key} className="resource-summary-group">
   {metric==='network'&&<h3>{group.key==='net_tx'?tr('上行'):tr('下行')}</h3>}
   <dl><div><dt>{tr('最新采样')}</dt><dd>{format(group.latest,group.key)}</dd></div><div><dt>{tr('样本均值')}</dt><dd>{format(group.mean,group.key)}</dd></div><div><dt>{tr('采样峰值')}</dt><dd>{format(group.peak,group.key)}</dd></div></dl>
   <p>{tr('有效样本：{0}',group.count)} · {tr('样本时间：{0}',group.latestAt===null?'—':new Date(group.latestAt).toLocaleString(locale()))}</p>
  </div>)}
  <p>{tr('基于返回样本，非连续时间加权统计。')}</p>
 </section>
}
