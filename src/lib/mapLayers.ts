import {groupRegions} from './groups.ts'
import {aggregateMapTraffic,type MapTrafficNode} from './mapTraffic.ts'
import {matchesMapStatus} from './mapInteractions.ts'
import type {MapProbeQuality} from './mapProbeQuality.ts'
export type MapRegionSummary={code:string;total:number;online:number;abnormal:number;probeKnown:number;probeState:MapProbeQuality['state'];tx:number|null;rx:number|null;trafficSamples:number;nodes:MapTrafficNode[]}
const severity:Record<MapProbeQuality['state'],number>={unknown:0,healthy:1,slow:2,loss:3,high:4,timeout:5}
export function summarizeMapRegions(nodes:MapTrafficNode[],quality:Map<number,MapProbeQuality>):MapRegionSummary[]{
 const traffic=aggregateMapTraffic(nodes)
 return groupRegions(nodes).map(region=>{
  const online=region.nodes.filter(n=>n.online),known=online.map(n=>quality.get(n.id)?.state??'unknown'),rate=traffic.get(region.code)!
  return {...region,abnormal:online.filter(n=>matchesMapStatus(n,'probe',quality.get(n.id))).length,probeKnown:known.filter(state=>state!=='unknown').length,probeState:known.reduce<MapProbeQuality['state']>((state,next)=>severity[next]>severity[state]?next:state,'unknown'),tx:rate.samples?rate.tx:null,rx:rate.samples?rate.rx:null,trafficSamples:rate.samples}
 })
}
export function nextAbnormalRegion(regions:MapRegionSummary[],current:string,anchors:Record<string,unknown>):string|null{
 const queue=regions.filter(r=>{const anchor=anchors[r.code];return r.abnormal>0&&Array.isArray(anchor)&&anchor.length===2&&anchor.every(n=>typeof n==='number'&&Number.isFinite(n))}).sort((a,b)=>severity[b.probeState]-severity[a.probeState]||b.abnormal-a.abnormal||a.code.localeCompare(b.code))
 if(!queue.length)return null
 return queue[(queue.findIndex(r=>r.code===current)+1)%queue.length].code
}
