import {useId,useMemo} from 'react'
import {tr,locale} from '@/lib/i18n'
import {resourceTrend,type ResourceTrendMetric,type ResourceTrendRow} from '@/lib/resourceTrend'
import '@/styles/resource-trend.css'

export type ResourcePreview={rows:ResourceTrendRow[];hours:number;loading:boolean;failed:boolean;active:boolean;updated:number|null}
export function ResourceTrend({metric,preview,onSelect}:{metric:ResourceTrendMetric;preview:ResourcePreview;onSelect:(metric:ResourceTrendMetric)=>void}){
 const descriptionId=useId()
 const {rows,hours,loading,failed,active,updated}=preview
 const trend=useMemo(()=>resourceTrend(rows,metric),[rows,metric])
 const label=metric==='cpu'?tr('查看 CPU 历史趋势'):tr('查看内存历史趋势')
 const status=!active?tr('查看历史'):loading?tr('读取中'):failed?trend.path?tr('旧数据'):tr('读取失败'):trend.path?null:tr('暂无历史')
 const title=trend.path?`${tr('查询范围：{0} 小时',hours)} · ${tr('样本时间：{0} — {1}',new Date(trend.start).toLocaleString(locale()),new Date(trend.end).toLocaleString(locale()))}${updated?` · ${tr('上次成功更新：{0}',new Date(updated).toLocaleString(locale()))}`:''}`:label
 return <button type="button" className="resource-trend" data-metric={metric} aria-label={label} aria-describedby={descriptionId} title={title} data-failed={failed} onClick={()=>onSelect(metric)}>
  <span id={descriptionId} className="sr-only">{title}{status?` · ${status}`:''}</span>
  <span className="resource-trend-caption"><span>{metric==='cpu'?tr('历史'):tr('历史用量')}{active&&<> · {hours===168?'7d':`${hours}h`}</>}</span><span aria-hidden="true">↗</span></span>
  {active&&trend.path?<svg viewBox="0 0 300 42" preserveAspectRatio="none" aria-hidden="true"><path d={trend.path} fill="none" stroke="currentColor" strokeWidth="1.4" vectorEffect="non-scaling-stroke"/></svg>:null}
  {status&&<span className="resource-trend-status">{status}</span>}
 </button>
}
