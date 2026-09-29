import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import {Globe2} from 'lucide-react'
import geometry from '@/data/map-paths.json'
import {groupRegions} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {boundCamera,immersiveMobileMap,placeMobileMapLabels,worldMobileMap,zoomMobileMap,type MapCamera} from '@/lib/mobileMap'
import {mobileMapLabel} from '@/lib/mobileMapLabel'
import {tr} from '@/lib/i18n'
import type {Node} from '@/lib/api'

type Props={bottom:number;nodes:Node[];pending:boolean;region:string;camera:MapCamera|null;onCamera:(c:MapCamera)=>void;onRegion:(code:string)=>void}
type Pointer={x:number;y:number}
export default function MobileMapCanvas({nodes,pending,region,camera,onCamera,onRegion,bottom}:Props){
 const root=useRef<HTMLDivElement>(null)
 const [size,setSize]=useState({width:0,height:0,top:76})
 const regions=useMemo(()=>groupRegions(nodes),[nodes])
 const coordinates=geometry.points as Record<string,number[]>
 const points=useMemo(()=>regions.flatMap(r=>coordinates[r.code]?[{...r,point:coordinates[r.code]}]:[]),[regions,coordinates])
 const top=size.top,freeHeight=Math.max(80,size.height-bottom-top-56)
 const view=camera??immersiveMobileMap(points.map(p=>p.point),size.width||390,freeHeight)
 const animation=useRef(0)
 const live=useRef(view)
 const pointers=useRef(new Map<number,Pointer>()),moved=useRef(false),start=useRef<Pointer|null>(null)
 useLayoutEffect(()=>{
  const el=root.current!
  const update=()=>{const width=el.clientWidth,height=el.clientHeight,top=(el.closest('.mobile-app')?.querySelector('.mm-page-header')?.getBoundingClientRect().bottom??64)+12;if(width&&height)setSize(s=>s.width===width&&s.height===height&&s.top===top?s:{width,height,top})}
  update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect()
 },[])
 useLayoutEffect(()=>{live.current=view},[view])
 const publish=(next:MapCamera)=>{cancelAnimationFrame(animation.current);live.current=next;onCamera(next)}
 const moveTo=useCallback((next:MapCamera)=>{
  cancelAnimationFrame(animation.current)
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){live.current=next;onCamera(next);return}
  const from=live.current,start=performance.now()
  const step=(now:number)=>{
   const t=Math.min(1,(now-start)/240),ease=1-(1-t)**3
   const c={x:from.x+(next.x-from.x)*ease,y:from.y+(next.y-from.y)*ease,k:from.k+(next.k-from.k)*ease}
   live.current=c;onCamera(c)
   if(t<1)animation.current=requestAnimationFrame(step)
  }
  animation.current=requestAnimationFrame(step)
 },[onCamera])
 useEffect(()=>()=>cancelAnimationFrame(animation.current),[])
 useEffect(()=>{
  if(camera||pending||!size.width||!size.height)return
  const initial=immersiveMobileMap(points.map(p=>p.point),size.width,freeHeight)
  const point=coordinates[region]
  onCamera(point?{...initial,x:point[0],y:point[1]}:initial)
 },[camera,pending,size.width,size.height,points,freeHeight,coordinates,region,onCamera])
 const center={x:size.width/2,y:top+freeHeight/2}
 const previousRegion=useRef(region)
 useEffect(()=>{
  if(previousRegion.current===region)return
  previousRegion.current=region
  const point=coordinates[region]
  if(point)moveTo({...live.current,x:point[0],y:point[1],k:Math.max(live.current.k,Math.min(5,freeHeight/340/(size.width/1000)))})
 },[region,coordinates,moveTo,freeHeight,size.width])
 const scale=size.width/1000*view.k
 const transform=`translate(${center.x-view.x*scale} ${center.y-view.y*scale}) scale(${scale})`
 const zoom=(factor:number)=>publish(zoomMobileMap(live.current,factor,0,0,size.width))
 const world=()=>publish(worldMobileMap(size.width,freeHeight+48))
 const screenPoints=points.map(r=>({...r,x:center.x+(r.point[0]-view.x)*scale,y:center.y+(r.point[1]-view.y)*scale})).filter(p=>p.x>=22&&p.x<=size.width-22&&p.y>=top+22&&p.y<=size.height-bottom-70)
 const names=new Map<string,string>()
 const labelAnchors=[...screenPoints].sort((a,b)=>Number(b.code===region)-Number(a.code===region)).filter(p=>view.k>1.3||p.code===region).map(p=>{
  const label=mobileMapLabel(countryName(p.code),tr('{0}/{1} 在线',p.online,p.total),p.code===region,Math.min(190,size.width-24))
  names.set(p.code,label.text)
  return {code:p.code,x:p.x,y:p.y,width:label.width}
 })
 const labels=placeMobileMapLabels(labelAnchors,size.width,top,size.height-bottom-66)
 const choose=(code:string)=>onRegion(region===code?'all':code)
 const byCode=new Map(regions.map(r=>[r.code,r]))
 const end=(id:number)=>{pointers.current.delete(id);start.current=null}
 return <div ref={root} className="mm-canvas" style={{'--mm-bottom':`${bottom}px`} as React.CSSProperties}>
  <svg viewBox={`0 0 ${size.width||360} ${size.height||260}`} role="group" tabIndex={0} aria-label={tr('世界节点分布地图')} aria-describedby="mm-keyboard-help"
   onKeyDown={e=>{if(e.target!==e.currentTarget)return;const key=e.key;if(['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)){e.preventDefault();if(key==='Home')world();else if(key==='+'||key==='=')zoom(1.4);else if(key==='-')zoom(1/1.4);else{const d=40/(size.width/1000*live.current.k);publish(boundCamera({...live.current,x:live.current.x+(key==='ArrowLeft'?-d:key==='ArrowRight'?d:0),y:live.current.y+(key==='ArrowUp'?-d:key==='ArrowDown'?d:0)}))}}}}
   onPointerDown={e=>{
    if(e.button!==0)return
    cancelAnimationFrame(animation.current)
    if(!pointers.current.size){moved.current=false;start.current={x:e.clientX,y:e.clientY}}
    else{moved.current=true;start.current=null}
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
    // Capture on the original element so a stationary marker tap retains its click target.
    ;(e.target as Element).setPointerCapture(e.pointerId)
   }}
   onPointerMove={e=>{
    const old=pointers.current.get(e.pointerId);if(!old)return
    const next={x:e.clientX,y:e.clientY},before=[...pointers.current.values()]
    if(pointers.current.size===1&&start.current&&!moved.current&&Math.hypot(next.x-start.current.x,next.y-start.current.y)<5)return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId,next);moved.current=true
    if(before.length===1){
     const s=size.width/1000*live.current.k
     publish(boundCamera({...live.current,x:live.current.x-(next.x-old.x)/s,y:live.current.y-(next.y-old.y)/s}))
    }else{
     const after=[...pointers.current.values()]
     const a={x:(before[0].x+before[1].x)/2,y:(before[0].y+before[1].y)/2}
     const b={x:(after[0].x+after[1].x)/2,y:(after[0].y+after[1].y)/2}
     const distance=Math.hypot(before[0].x-before[1].x,before[0].y-before[1].y)
     const factor=distance>1?Math.hypot(after[0].x-after[1].x,after[0].y-after[1].y)/distance:1
     const rect=root.current!.getBoundingClientRect()
     const z=zoomMobileMap(live.current,factor,a.x-rect.left-center.x,a.y-rect.top-center.y,size.width)
     const s=size.width/1000*z.k
     publish(boundCamera({...z,x:z.x-(b.x-a.x)/s,y:z.y-(b.y-a.y)/s}))
    }
   }}
   onPointerUp={e=>end(e.pointerId)}
   onPointerCancel={e=>{moved.current=true;end(e.pointerId)}}
   onLostPointerCapture={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))end(e.pointerId)}}
   onClickCapture={e=>{if(moved.current&&e.detail!==0){e.preventDefault();e.stopPropagation()}}}>
   <g className="mm-land" transform={transform} aria-hidden="true">
    <path className="mm-grid" d={geometry.graticule}/>
    {geometry.shapes.map((shape,i)=><path key={i} d={shape.d} data-populated={byCode.has(shape.code)||undefined} data-selected={region===shape.code||undefined}/>)}
   </g>
   {screenPoints.map(r=>{
    const {x,y}=r
    return <g key={r.code} className="mm-marker" transform={`translate(${x} ${y})`} data-region={r.code} data-tone={r.online===r.total?'online':r.online===0?'offline':'mixed'} role="button" tabIndex={0} aria-pressed={region===r.code} aria-label={tr('{0}：{1} / {2} 在线',countryName(r.code),r.online,r.total)} onClick={()=>choose(r.code)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(r.code)}}}>
     <circle className="mm-hit" r={22}/><circle className="mm-halo" r={20}/><circle className="mm-ring" r={9}/><circle className="mm-core" r={4}/>
    </g>
   })}
   {labels.map(l=><g className="mm-region-label" key={l.code} data-region={l.code} transform={`translate(${l.x} ${l.y})`} aria-hidden="true"><rect width={l.width} height={28} rx={9}/><text x={11} y={18}>{names.get(l.code)}</text></g>)}
  </svg>
  <span id="mm-keyboard-help" className="sr-only">{tr('方向键平移，加减键缩放，Home 查看全球')}</span>
  <div className="mm-vignette" aria-hidden="true"/>
  <div className="mm-tools"><button aria-label={tr('查看全球')} onClick={world}><Globe2 size={17}/><span>{tr('查看全球')}</span></button></div>
  {!pending&&!points.length&&<p className="mm-map-message" role="status">{tr('暂无可定位的地区信息，仍可在下方查看节点')}</p>}
 </div>
}
