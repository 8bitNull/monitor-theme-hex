import type {MapTrafficNode} from './mapTraffic.ts'
import type {MapProbeQuality} from './mapProbeQuality.ts'
export type MapStatusFilter='all'|'online'|'offline'|'attention'|'probe'
export type MapFocusRequest={code:string;sequence:number}
/** Online identity and the current selected probe are independent conditions. */
export function matchesMapStatus(node:MapTrafficNode,filter:MapStatusFilter,quality:MapProbeQuality|undefined):boolean{
 switch(filter){
  case 'online':return node.online
  case 'offline':return !node.online
  case 'attention':return !node.online||Boolean(node.attention)
  case 'probe':return node.online&&quality!==undefined&&['slow','high','loss','timeout'].includes(quality.state)
  default:return true
 }
}
/** Connected screen-distance groups preserve each geographic anchor exactly. */
export function clusterMapRegions<T extends {code:string;x:number;y:number}>(points:T[],distance:number):{id:string;members:T[];x:number;y:number}[]{
 const remaining=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).sort((a,b)=>a.code.localeCompare(b.code)),groups=[]
 while(remaining.length){
  const members=[remaining.shift()!]
  for(let i=0;i<members.length;i++)for(let j=remaining.length-1;j>=0;j--){
   if(Math.hypot(members[i].x-remaining[j].x,members[i].y-remaining[j].y)<=Math.max(0,distance))members.push(remaining.splice(j,1)[0])
  }
  members.sort((a,b)=>a.code.localeCompare(b.code))
  groups.push({id:members.map(p=>p.code).join(','),members,x:members.reduce((sum,p)=>sum+p.x,0)/members.length,y:members.reduce((sum,p)=>sum+p.y,0)/members.length})
 }
 return groups
}
