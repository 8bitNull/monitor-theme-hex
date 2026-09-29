import {trendPath} from './trends.ts'
export type ResourceTrendRow={ts:number;cpu:number|null;mem_used:number|null}
export type ResourceTrendMetric='cpu'|'mem_used'

/** Same two-hour gap boundary as the resource main chart; timestamps are milliseconds. */
export function resourceTrend(rows:ResourceTrendRow[],metric:ResourceTrendMetric){
 const points=[...new Map(rows.filter(row=>Number.isFinite(row.ts)&&row.ts>0).map(row=>{
  const value=row[metric]
  return [row.ts,{ts:row.ts,value:typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null}] as const
 })).values()].sort((a,b)=>a.ts-b.ts)
 const start=points[0]?.ts??0,end=points.at(-1)?.ts??0
 const top=points.reduce((max,p)=>Math.max(max,p.value??0),metric==='cpu'?100:1)
 const path=trendPath(points,start,end,top,7200000)
 // A lone point (or several disconnected points) is not a trend.
 return {path:path.includes('L')?path:'',start,end,top}
}
