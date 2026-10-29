import {memo,useState} from 'react'
import {tr,locale} from '@/lib/i18n'
import {trendCeiling,trendPath} from '@/lib/trends'
export function useTrendCeiling(rows:unknown,max:number,floor=100){
 const [scale,setScale]=useState(()=>({rows,top:trendCeiling(max,0,floor)}))
 let top=scale.top
 if(rows!==scale.rows){top=trendCeiling(max,scale.top,floor);setScale({rows,top})}
 return top
}
export const MicroTrend=memo(function MicroTrend({rows,start,end,floor=100,gap=120,top:sharedTop,label,emptyLabel,showEmpty=true}:{rows:{ts:number;value:number|null}[];start:number;end:number;floor?:number;gap?:number;top?:number;label:string;emptyLabel?:string;showEmpty?:boolean}){
 const max=Math.max(0,...rows.map(p=>p.value??0))
 const ceiling=useTrendCeiling(rows,max,floor),top=sharedTop??ceiling
 const valid=rows.filter(p=>p.value!==null&&p.ts>=start&&p.ts<=end)
 const description=`${label} · ${new Date(start*1000).toLocaleTimeString(locale())} — ${new Date(end*1000).toLocaleTimeString(locale())}`
 return <div className="micro-trend" title={description}>
  <svg viewBox="0 0 300 40" preserveAspectRatio="none" role="img" aria-label={description}>
   <path d={trendPath(rows,start,end,top,gap)} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
   {valid.map(p=><circle key={p.ts} cx={(p.ts-start)/Math.max(1,end-start)*300} cy={38-Math.min(1,p.value!/top)*34} r="1" fill="currentColor"/>)}
   {rows.filter(p=>p.value===null&&p.ts>=start&&p.ts<=end).map(p=><path key={p.ts} className="micro-timeout" d={`M${(p.ts-start)/Math.max(1,end-start)*300},34 v5`} stroke="var(--destructive)" vectorEffect="non-scaling-stroke"/>)}
  </svg>
  {showEmpty&&valid.length<2&&<span className="micro-empty">{emptyLabel??(rows.some(p=>p.value===null)?tr('超时'):tr('积累数据中'))}</span>}
 </div>
})
