import {ChartTooltip,useChartTooltip} from './ChartTooltip'
import {useMemo} from 'react'
import {Area,CartesianGrid,ComposedChart,Line,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts'
import {Cpu,MemoryStick,HardDrive,ArrowDownUp} from 'lucide-react'
import {ResourceSummary} from './ResourceSummary'
import type {Node} from '@/lib/api'
import type {NormalizedResourceSample} from '@/lib/resourceSummary'
import {tr,locale} from '@/lib/i18n'
import {mbpsAmount,axisBytes,axisTop,bytes,clockFor,quarters,rate,timeTicks} from '@/lib/format'
type Row=NormalizedResourceSample
const AXIS={stroke:'currentColor',fontSize:12,tickLine:false,axisLine:false}
const SERIES={dot:false as const,strokeWidth:1.7,isAnimationActive:false,connectNulls:false}
export const resourceOptions=[{key:'cpu',label:'CPU',Icon:Cpu},{key:'mem_used',label:'内存',Icon:MemoryStick},{key:'disk_used',label:'硬盘',Icon:HardDrive},{key:'network',label:'网速',Icon:ArrowDownUp}] as const
export type ResourceMetricKey=(typeof resourceOptions)[number]['key']
export function ResourceHistory({rows,node,hours,metric,compact,mobile=false}:{compact:boolean;mobile?:boolean;rows:Row[];node:Node;hours:number;metric:ResourceMetricKey}){
 const {frame:tooltipFrame,dismiss:tooltipDismiss,onChartClick:tooltipClick,onChartPointerMove:tooltipMove,onChartKeyDown:tooltipKey}=useChartTooltip(`${node.id}:${hours}:${metric}`,compact)
 const network=metric==='network'
  const top=useMemo(()=>{
   const peak=rows.reduce((max,row)=>Math.max(max,metric==='network'?Math.max(row.net_rx??0,row.net_tx??0):row[metric]??0),0)
   if(metric==='cpu')return axisTop(peak,4,10,100)
   if(metric==='network')return axisTop(peak*8/1e6,0.004)*1e6/8
   const capacity=metric==='mem_used'?node.mem_total:node.disk_total
   return Math.max(Number.isFinite(capacity)&&capacity>0?capacity:0,peak,1)
  },[metric,node.mem_total,node.disk_total,rows])
 const color=metric==='mem_used'?'var(--color-chart-3)':metric==='disk_used'?'var(--color-chart-4)':'var(--color-chart-1)'
 const data=useMemo(()=>rows.flatMap((r,i)=>i && r.ts-rows[i-1].ts>7200000?[{ts:(r.ts+rows[i-1].ts)/2,cpu:null,mem_used:null,disk_used:null,net_rx:null,net_tx:null},r]:[r]),[rows])
 const label=resourceOptions.find(o=>o.key===metric)!.label
  return <div className="detail-resource-charts" data-metric={metric} data-mobile={mobile}>
   <ResourceSummary rows={rows} metric={metric} hours={hours}/>
  <div className="resource-chart-controls">
   <span className="resource-chart-unit">{network?<><span className="upload">↑ {tr('上行')}</span><span className="download">↓ {tr('下行')}</span> Mbps</>:metric==='cpu'?'%':bytes(top)}</span>
  </div>
  <div className="resource-chart-panel" aria-label={tr(label)}><div className="detail-chart-frame" ref={tooltipFrame} onClickCapture={tooltipClick} onPointerMove={tooltipMove} onKeyDownCapture={tooltipKey}>
   <ResponsiveContainer><ComposedChart data={data} margin={{top:16,right:12,bottom:0,left:0}}>
    <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false}/>
    <XAxis dataKey="ts" type="number" domain={['dataMin','dataMax']} ticks={rows.length?timeTicks(rows[0].ts,rows.at(-1)!.ts):undefined} tickFormatter={clockFor(hours)} minTickGap={hours>24?72:40} {...AXIS}/>
    <YAxis domain={[0,Math.max(top,1)]} ticks={quarters(Math.max(top,1))} tickFormatter={metric==='cpu'?v=>`${v}%`:network?mbpsAmount:axisBytes} width={60} {...AXIS}/>
    <Tooltip content={props=><ChartTooltip {...props} compact={compact} dismiss={tooltipDismiss}/>} wrapperStyle={{pointerEvents:'auto'}} trigger={compact?"click":"hover"} allowEscapeViewBox={{x:false,y:false}} cursor={{stroke:"var(--border)",strokeDasharray:"3 4"}} isAnimationActive={false} labelFormatter={ts=>new Date(Number(ts)).toLocaleString(locale())} formatter={v=>network?rate(Number(v)):metric==='cpu'?`${Number(v).toFixed(1)}%`:bytes(Number(v))}/>
    {network?<><Line dataKey="net_tx" name={tr('上行')} stroke="var(--upload)" {...SERIES}/><Line dataKey="net_rx" name={tr('下行')} stroke="var(--download)" {...SERIES}/></>:<Area dataKey={metric} name={tr(label)} stroke={color} fill={color} fillOpacity={.07} {...SERIES}/>}
   </ComposedChart></ResponsiveContainer>
   </div></div>
   <p className="resource-chart-scope">{tr('统计：完整 {0} 小时范围',hours)}</p>
 </div>
}
