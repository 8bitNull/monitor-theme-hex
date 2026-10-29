export type ResourceSampleKey='cpu'|'mem_used'|'disk_used'|'net_tx'|'net_rx'
export type ResourceSample={ts:number}&Partial<Record<ResourceSampleKey,number|null>>
export type NormalizedResourceSample={ts:number}&Record<ResourceSampleKey,number|null>
export function validResourceValue(value:unknown,key:ResourceSampleKey):value is number{
 return typeof value==='number'&&Number.isFinite(value)&&value>=0&&(key!=='cpu'||value<=100)
}
/** Charts, previews and summaries share ordering, duplicate and invalid-sample rules. */
export function normalizeResourceSamples(rows:readonly ResourceSample[]):NormalizedResourceSample[]{
 const unique=new Map<number,ResourceSample>()
 for(const row of rows)if(Number.isFinite(row.ts)&&row.ts>0)unique.set(row.ts,row)
 return [...unique.values()].sort((a,b)=>a.ts-b.ts).map(row=>({
  ts:row.ts,
  cpu:validResourceValue(row.cpu,'cpu')?row.cpu:null,
  mem_used:validResourceValue(row.mem_used,'mem_used')?row.mem_used:null,
  disk_used:validResourceValue(row.disk_used,'disk_used')?row.disk_used:null,
  net_tx:validResourceValue(row.net_tx,'net_tx')?row.net_tx:null,
  net_rx:validResourceValue(row.net_rx,'net_rx')?row.net_rx:null,
 }))
}
export type ResourceSummaryValue={latest:number|null;latestAt:number|null;mean:number|null;peak:number|null;count:number}
export function summarizeResource(rows:readonly ResourceSample[],key:ResourceSampleKey):ResourceSummaryValue{
 const unique=new Map<number,ResourceSample>()
 for(const row of rows)if(Number.isFinite(row.ts)&&row.ts>0)unique.set(row.ts,row)
 const ordered=[...unique.values()].sort((a,b)=>a.ts-b.ts)
 const valid=(v:unknown):v is number=>validResourceValue(v,key)
 const values=ordered.map(row=>row[key]).filter(valid)
 const last=ordered.at(-1),value=last?.[key]
 return {latest:valid(value)?value:null,latestAt:last?.ts??null,mean:values.length?values.reduce((sum,v)=>sum+v/values.length,0):null,peak:values.length?values.reduce((max,v)=>Math.max(max,v),0):null,count:values.length}
}
