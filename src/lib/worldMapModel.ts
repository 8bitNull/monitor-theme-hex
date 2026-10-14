import type {MapProbeQuality} from './mapProbeQuality.ts'
export type MapLayer='nodes'|'traffic'|'probe'
/** Geographic input: degrees, ping in milliseconds, loss in percent. Null means unknown. */
export type WorldMapNode={
 id:string;name:string;longitude:number;latitude:number;online:boolean
 ping?:number|null;loss?:number|null;tx?:number|null;rx?:number|null
 attention?:boolean;label?:string
}
export type WorldMapConnection={id:string;from:string;to:string;ping?:number|null;loss?:number|null}
export type MapView={x:number;y:number;k:number}
export type MapTheme='dark'|'light'
export type ResolvedMapConnection={id:string;from:string;to:string;start:[number,number];end:[number,number];speed:number;loss:number|null}
export type ProjectedMapNode={probeState?:MapProbeQuality['state'];id:string;x:number;y:number;online:boolean;attention?:boolean;tx?:number|null;rx?:number|null}
export type MapBadge={x:number;y:number;width:number}
export type MapRect={x:number;y:number;width:number;height:number}
function intersects(a:MapRect,b:MapRect,gap=6){
 return a.x<b.x+b.width+gap&&a.x+a.width>b.x-gap&&a.y<b.y+b.height+gap&&a.y+a.height>b.y-gap
}
/** Lay out labels separately from fixed geographic signal anchors. Crowded labels may be hidden. */
export function placeMapBadges(nodes:{id:string;x:number;y:number;label:string;total:number}[],width:number,height:number,obstacles:MapRect[]=[]):Map<string,MapBadge|null>{
 const result=new Map<string,MapBadge|null>(),placed:MapBadge[]=[]
 for(const node of [...nodes].sort((a,b)=>b.total-a.total||a.id.localeCompare(b.id))){
  if(node.x<0||node.x>width||node.y<0||node.y>height){result.set(node.id,null);continue}
  const labelWidth=[...node.label].reduce((sum,char)=>sum+(char.charCodeAt(0)>255?10:5.5),0)
  const badgeWidth=Math.min(width-16,labelWidth+String(node.total).length*6+24)
  let badge:MapBadge|null=null
  for(const [dx,dy] of [[0,-23],[0,23],[42,-23],[-42,-23],[42,23],[-42,23],[65,0],[-65,0],[0,-49],[0,49],[65,-49],[-65,-49],[65,49],[-65,49]]){
   const x=Math.max(8+badgeWidth/2,Math.min(width-8-badgeWidth/2,node.x+dx)),y=Math.max(18,Math.min(height-18,node.y+dy))
   if(obstacles.some(rect=>intersects({x:x-badgeWidth/2,y:y-10,width:badgeWidth,height:20},rect)))continue
   if(placed.some(other=>Math.abs(x-other.x)<(badgeWidth+other.width)/2+4&&Math.abs(y-other.y)<24))continue
   if(nodes.some(other=>Math.abs(x-other.x)<badgeWidth/2+6&&Math.abs(y-other.y)<16))continue
   badge={x,y,width:badgeWidth};placed.push(badge);break
  }
  result.set(node.id,badge)
 }
 return result
}

/** Prefer a nearby tooltip position that clears measured floating controls. */
export function placeMapTooltip(anchor:{x:number;y:number},tip:{width:number;height:number},size:{width:number;height:number},obstacles:MapRect[]=[]):{x:number;y:number}{
 const xs=[anchor.x-tip.width/2,anchor.x+14,anchor.x-tip.width-14,8,size.width-tip.width-8,...obstacles.flatMap(r=>[r.x-tip.width-6,r.x+r.width+6])]
 const ys=[anchor.y-tip.height-14,anchor.y+14,8,size.height-tip.height-8,...obstacles.flatMap(r=>[r.y-tip.height-6,r.y+r.height+6])]
 let best={x:8,y:8},score=Infinity
 for(const px of xs)for(const py of ys){
  const x=Math.max(8,Math.min(size.width-tip.width-8,px)),y=Math.max(8,Math.min(size.height-tip.height-8,py))
  const rect={x,y,width:tip.width,height:tip.height},blocked=obstacles.filter(r=>intersects(rect,r)).length
  const coversAnchor=intersects(rect,{x:anchor.x-6,y:anchor.y-6,width:12,height:12},0)
  const distance=Math.hypot(Math.max(x-anchor.x,0,anchor.x-x-tip.width),Math.max(y-anchor.y,0,anchor.y-y-tip.height))
  const next=blocked*1e6+(coversAnchor?1e4:0)+distance+Math.abs(x+tip.width/2-anchor.x)*.05
  if(next<score){score=next;best={x,y}}
 }
 return best
}

/** Rates are bytes/sec; logarithmic scaling keeps large links readable. */
export function trafficPower(rate:number):number{
 return Number.isFinite(rate)&&rate>0?Math.min(1,Math.log10(1+rate*8/1_000_000)/3.2):0
}

/** Panoramic equirectangular projection; Antarctica is omitted from the land dataset. */
export function projectMap(longitude:number,latitude:number):[number,number]|null{
 if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||Math.abs(longitude)>180||Math.abs(latitude)>90)return null
 return [+(500+longitude*944/360).toFixed(2),+(210-latitude*774/360).toFixed(2)]
}
export function fitMapWorld(width:number,height:number,padding=14,bounds={top:0,bottom:360}):MapView{
 const span=Math.max(1,bounds.bottom-bounds.top)
 const k=Math.max(.001,Math.min(Math.max(1,width-2*padding)/1000,Math.max(1,height-2*padding)/span))
 return {k,x:(width-1000*k)/2,y:(height-span*k)/2-bounds.top*k}
}
/** Static SVG counterpart of the renderer's quadratic curve, split across the antimeridian. */
export function connectionPath(connection:ResolvedMapConnection):string{
 const [x,y]=connection.start,[tx,ty]=connection.end
 const cy=(y+ty)/2-Math.min(85,Math.hypot(tx-x,ty-y)*.22)
 const wrap=(value:number)=>value<28?value+944:value>972?value-944:value
 const point=(px:number,py:number)=>`${+px.toFixed(2)},${+py.toFixed(2)}`
 let previousX=x,previousY=y,path=`M${point(wrap(x),y)}`
 for(let i=1;i<=100;i++){
  const t=i/100,px=x+(tx-x)*t,py=(1-t)**2*y+2*(1-t)*t*cy+t*t*ty
  const previousWrapped=wrap(previousX),currentWrapped=wrap(px)
  if(Math.abs(currentWrapped-previousWrapped)>472){
   const edge=currentWrapped<previousWrapped?972:28
   const ratio=(edge-previousWrapped)/(px-previousX),edgeY=previousY+(py-previousY)*ratio
   path+=`L${point(edge,edgeY)}M${point(edge===972?28:972,edgeY)}`
  }
  path+=`L${point(currentWrapped,py)}`;previousX=px;previousY=py
 }
 return path
}
/** Curve progress per second. Lower latency travels faster; unknown latency stays still. */
export function latencySpeed(ping:number|null|undefined):number{
 return typeof ping==='number'&&Number.isFinite(ping)&&ping>=0?.12+.62/(1+ping/80):0
}
export function resolveMapConnections(nodes:WorldMapNode[],connections:WorldMapConnection[]):ResolvedMapConnection[]{
 const byId=new Map(nodes.map(node=>[node.id,node])),seen=new Set<string>()
 return connections.flatMap(connection=>{
  const from=byId.get(connection.from),to=byId.get(connection.to)
  if(seen.has(connection.id)||!from?.online||!to?.online||from.id===to.id)return []
  const start=projectMap(from.longitude,from.latitude),end=projectMap(to.longitude,to.latitude)
  if(!start||!end)return []
  seen.add(connection.id)
  // Wrap the shorter antimeridian route. The renderer splits it at the map edges.
  if(end[0]-start[0]>472)end[0]-=944
  else if(end[0]-start[0]<-472)end[0]+=944
  const loss=connection.loss
  return [{id:connection.id,from:from.id,to:to.id,start,end,speed:latencySpeed(connection.ping),loss:typeof loss==='number'&&Number.isFinite(loss)&&loss>=0&&loss<=100?loss:null}]
 })
}
/** Place short labels around fixed anchors; hide labels that cannot fit without collisions. */
export function placeMapLabels(nodes:{id:string;x:number;y:number;name:string;label?:string}[],width:number,height:number):Map<string,number|null>{
 const result=new Map<string,number|null>(),boxes:{left:number;right:number;top:number;bottom:number}[]=[]
 for(const node of nodes){
  const length=[...(node.label??node.name)].reduce((sum,char)=>sum+(char.charCodeAt(0)>255?11:6),0)
  let placed:number|null=null
  for(const offset of [24,-17,41,-34]){
   const box={left:node.x-length/2-3,right:node.x+length/2+3,top:node.y+offset-11,bottom:node.y+offset+3}
   if(box.left<8||box.right>width-8||box.top<8||box.bottom>height-8)continue
   if(boxes.some(other=>box.left<other.right&&box.right>other.left&&box.top<other.bottom&&box.bottom>other.top))continue
   if(nodes.some(other=>other.id!==node.id&&other.x+8>box.left&&other.x-8<box.right&&other.y+8>box.top&&other.y-8<box.bottom))continue
   placed=offset;boxes.push(box);break
  }
  result.set(node.id,placed)
 }
 return result
}
