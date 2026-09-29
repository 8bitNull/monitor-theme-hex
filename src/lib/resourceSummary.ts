export type ResourceSampleKey='cpu'|'mem_used'|'disk_used'|'net_tx'|'net_rx'
export type ResourceSample={ts:number}&Partial<Record<ResourceSampleKey,number|null>>
export type ResourceSummaryValue={latest:number|null;latestAt:number|null;mean:number|null;peak:number|null;count:number}
export function summarizeResource(rows:readonly ResourceSample[],key:ResourceSampleKey):ResourceSummaryValue{
 const unique=new Map<number,ResourceSample>()
 for(const row of rows)if(Number.isFinite(row.ts)&&row.ts>0)unique.set(row.ts,row)
 const ordered=[...unique.values()].sort((a,b)=>a.ts-b.ts)
 const valid=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&(key!=='cpu'||v<=100)
 const values=ordered.map(row=>row[key]).filter(valid)
 const last=ordered.at(-1),value=last?.[key]
 return {latest:valid(value)?value:null,latestAt:last?.ts??null,mean:values.length?values.reduce((sum,v)=>sum+v/values.length,0):null,peak:values.length?values.reduce((max,v)=>Math.max(max,v),0):null,count:values.length}
}
