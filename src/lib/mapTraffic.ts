import type {Node} from './api.ts'
import {liveMetrics} from './freshness.ts'
import {regionKey} from './groups.ts'
export {trafficPower} from './worldMapModel.ts'

export type MapTrafficNode={id:number;name:string;country:string;online:boolean;attention?:boolean;tx?:number|null;rx?:number|null}
export type RegionTraffic={tx:number;rx:number;samples:number}
const validRate=(value:unknown):number|null=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null

export function mapTrafficSnapshot(nodes:Node[]):MapTrafficNode[]{
 return nodes.map(node=>{
  const metrics=liveMetrics(node)
  return {id:node.id,name:node.name,country:node.country,online:node.online,attention:(metrics?.cpu??0)>=85,tx:validRate(metrics?.net_tx),rx:validRate(metrics?.net_rx)}
 })
}

export function aggregateMapTraffic(nodes:MapTrafficNode[]):Map<string,RegionTraffic>{
 const result=new Map<string,RegionTraffic>()
 for(const node of nodes){
  const code=regionKey(node.country),traffic=result.get(code)??{tx:0,rx:0,samples:0}
  result.set(code,traffic)
  if(!node.online)continue
  const tx=validRate(node.tx),rx=validRate(node.rx)
  if(tx===null&&rx===null)continue
  traffic.tx+=tx??0;traffic.rx+=rx??0;traffic.samples++
 }
 return result
}
