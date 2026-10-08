export type MapCamera={x:number;y:number;k:number}
export type MobileMapState={region:string;camera:MapCamera|null}
const storageKey='hex-mobile-map-v1'
export const clampZoom=(k:number)=>Math.max(.25,Math.min(8,k))
export function validMapState(value:unknown):MobileMapState{
 const v=value as Partial<MobileMapState>|null
 const c=v?.camera
 const camera=c&&[c.x,c.y,c.k].every(Number.isFinite)&&c.k>=.25&&c.k<=8&&c.x>=-1000&&c.x<=2000&&c.y>=-480&&c.y<=960?{x:c.x,y:c.y,k:c.k}:null
 const region=typeof v?.region==='string'&&/^(all|unknown|[A-Z]{2})$/.test(v.region)?v.region:'all'
 return {region,camera}
}
export function readMapState():MobileMapState{
 try{return validMapState(JSON.parse(sessionStorage.getItem(storageKey)||'null'))}catch{return {region:'all',camera:null}}
}
export function writeMapState(state:MobileMapState){try{sessionStorage.setItem(storageKey,JSON.stringify(state))}catch{/* Optional persistence. */}}
export function fitMobileMap(points:number[][],width:number,height:number):MapCamera{
 if(!points.length)return {x:500,y:240,k:.9}
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1])
 const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys)
 return {x:(left+right)/2,y:(top+bottom)/2,k:clampZoom(Math.min((width-64)/Math.max(1,right-left),(height-96)/Math.max(1,bottom-top))/(width/1000))}
}
export function boundCamera(c:MapCamera):MapCamera{
 return {x:Math.max(-1000,Math.min(2000,c.x)),y:Math.max(-480,Math.min(960,c.y)),k:clampZoom(c.k)}
}
export function zoomMobileMap(c:MapCamera,factor:number,dx:number,dy:number,width:number):MapCamera{
 const k=clampZoom(c.k*factor),oldScale=width/1000*c.k,newScale=width/1000*k
 return boundCamera({x:c.x+dx/oldScale-dx/newScale,y:c.y+dy/oldScale-dy/newScale,k})
}


// Fit the full projected world inside the drawing area above the touch controls.
export function worldMobileMap(width:number,height:number):MapCamera{
 return {x:500,y:240,k:clampZoom(Math.min(.94,(height-64)/480/(width/1000)))}
}

// Prefer a dense group of regions rather than shrinking distant continents into one view.
// Coordinate sorting makes ties independent of server/node order.
export function immersiveMobileMap(points:number[][],width:number,height:number):MapCamera{
 if(!points.length)return worldMobileMap(Math.max(1,width),Math.max(96,height))
 const sorted=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1])
 let cluster:number[][]=[]
 for(const p of sorted){
  const nearby=sorted.filter(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<=140)
  if(nearby.length>cluster.length)cluster=nearby
 }
 const scale=Math.max(Math.max(1,width)/280,Math.max(1,height)/340)
 return boundCamera({x:cluster.reduce((sum,p)=>sum+p[0],0)/cluster.length-12,y:cluster.reduce((sum,p)=>sum+p[1],0)/cluster.length,k:Math.min(5,scale/(Math.max(1,width)/1000))})
}

type LabelAnchor={code:string;x:number;y:number;width:number}
export function placeMobileMapLabels(points:LabelAnchor[],width:number,top:number,bottom:number):LabelAnchor[]{
 const placed:LabelAnchor[]=[]
 for(const p of points){
  for(const [x,y] of [[p.x+15,p.y-31],[p.x-p.width-15,p.y-31],[p.x+15,p.y+10],[p.x-p.width-15,p.y+10],[Math.max(12,Math.min(width-12-p.width,p.x-p.width/2)),p.y+24],[Math.max(12,Math.min(width-12-p.width,p.x-p.width/2)),p.y-52]]){
   if(x<12||x+p.width>width-12||y<top||y+28>bottom)continue
   if(placed.some(b=>x<b.x+b.width+6&&x+p.width+6>b.x&&y<b.y+34&&y+34>b.y))continue
   if(points.some(b=>b.code!==p.code&&x<b.x+22&&x+p.width>b.x-22&&y<b.y+22&&y+28>b.y-22))continue
   placed.push({...p,x,y});break
  }
 }
 return placed
}
