import {mapProbeLabel} from './MapRegionDetails'
import {summarizeMapRegions} from '@/lib/mapLayers'
import type {MapLayer} from '@/lib/worldMapModel'
import {clusterMapRegions,matchesMapStatus,type MapStatusFilter,type MapFocusRequest} from '@/lib/mapInteractions'
import {MapStatusLegend,MapRegionChooser} from './MapInteractionControls'
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react'
import {Globe2,RotateCcw} from 'lucide-react'
import geometry from '@/data/map-flat.json'
import {groupRegions} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {boundCamera,immersiveMobileMap,placeMobileMapLabels,worldMobileMap,zoomMobileMap,type MapCamera} from '@/lib/mobileMap'
import {mobileMapLabel} from '@/lib/mobileMapLabel'
import {tr} from '@/lib/i18n'
import {aggregateMapTraffic,trafficPower,type MapTrafficNode} from '@/lib/mapTraffic'
import type {MapProbeQuality} from '@/lib/mapProbeQuality'
import {ThreeMapCanvas,useMapMotion,useMapTheme} from './ThreeMapCanvas'
import '@/styles/hex-world-map.css'

type Props={layer:MapLayer;statusFilter:MapStatusFilter;onStatusFilter:(filter:MapStatusFilter)=>void;focusRequest?:MapFocusRequest;onLocate:(code:string)=>void;bottom:number;collapsedBottom:number;nodes:MapTrafficNode[];pending:boolean;region:string;camera:MapCamera|null;quality:Map<number,MapProbeQuality>;onCamera:(c:MapCamera)=>void;onRegion:(code:string)=>void;onWorld:()=>void;onReset:()=>void}
type Pointer={x:number;y:number}
export default function MobileMapCanvas({layer,nodes,pending,region,camera,quality,onCamera,onRegion,bottom,collapsedBottom,onWorld,onReset,statusFilter,onStatusFilter,focusRequest,onLocate}:Props){
 const root=useRef<HTMLDivElement>(null)
 const [size,setSize]=useState({width:0,height:0,top:76})
 const regions=useMemo(()=>groupRegions(nodes),[nodes])
 const traffic=useMemo(()=>aggregateMapTraffic(nodes),[nodes])
 const motion=useMapMotion(),theme=useMapTheme(),[ready,setReady]=useState(false)
 const coordinates=geometry.points as Record<string,number[]>
 const points=useMemo(()=>regions.flatMap(r=>coordinates[r.code]?[{...r,point:coordinates[r.code]}]:[]),[regions,coordinates])
 const top=size.top,freeHeight=Math.max(80,size.height-bottom-top-56)
 const view=camera??immersiveMobileMap(points.map(p=>p.point),size.width||390,freeHeight)
 const chooserView=JSON.stringify([view.x,view.y,view.k,size.width,size.height,bottom])
 const [chooser,setChooser]=useState<{id:string;view:string}|null>(null)
 const animation=useRef(0)
 const live=useRef(view)
 const pointers=useRef(new Map<number,Pointer>()),moved=useRef(false),start=useRef<Pointer|null>(null)
 useLayoutEffect(()=>{
  const el=root.current!
  const update=()=>{const width=el.clientWidth,height=el.clientHeight,top=Math.max(12,(el.closest('.mobile-app')?.querySelector('.mm-page-header')?.getBoundingClientRect().bottom??el.getBoundingClientRect().top)-el.getBoundingClientRect().top+12);if(width&&height)setSize(s=>s.width===width&&s.height===height&&s.top===top?s:{width,height,top})}
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
 const handledFocus=useRef<number|undefined>(undefined)
 useEffect(()=>{
  if(!focusRequest||handledFocus.current===focusRequest.sequence||!size.width)return
  const point=coordinates[focusRequest.code]
  if(!point)return
  handledFocus.current=focusRequest.sequence
  moveTo({...live.current,x:point[0],y:point[1],k:Math.max(live.current.k,Math.min(5,freeHeight/340/(size.width/1000)))})
 },[focusRequest,size.width,coordinates,freeHeight,moveTo])
 const scale=size.width/1000*view.k
 const transform=`translate(${center.x-view.x*scale} ${center.y-view.y*scale}) scale(${scale})`
 const zoom=(factor:number)=>publish(zoomMobileMap(live.current,factor,0,0,size.width))
 const world=()=>{publish(worldMobileMap(size.width,Math.max(80,size.height-collapsedBottom-top-56)));onWorld()}
 const reset=()=>{cancelAnimationFrame(animation.current);onReset()}
 const screenPoints=points.map(r=>({...r,x:center.x+(r.point[0]-view.x)*scale,y:center.y+(r.point[1]-view.y)*scale})).filter(p=>p.x>=22&&p.x<=size.width-22&&p.y>=top+22&&p.y<=size.height-bottom-70)
 const groups=clusterMapRegions(screenPoints,48),grouped=new Set(groups.filter(g=>g.members.length>1).flatMap(g=>g.members.map(m=>m.code)))
 const chosenGroup=groups.find(g=>g.id===chooser?.id&&g.members.length>1)
 if(chooser&&(chooser.view!==chooserView||!chosenGroup))setChooser(null)
 const unmatched=(r:typeof regions[number])=>!r.nodes.some(n=>matchesMapStatus(n,statusFilter,quality.get(n.id)))
 const names=new Map<string,string>()
 const labelAnchors=[...screenPoints].filter(p=>!grouped.has(p.code)).sort((a,b)=>Number(b.code===region)-Number(a.code===region)).filter(p=>view.k>1.3||p.code===region).map(p=>{
  const label=mobileMapLabel(p.code===region?countryName(p.code):`${countryName(p.code)} · ${p.total}`,tr('{0}/{1} 在线',p.online,p.total),p.code===region,Math.min(190,size.width-24))
  names.set(p.code,label.text)
  return {code:p.code,x:p.x,y:p.y,width:label.width}
 })
 const tools={x:Math.max(12,size.width-188),y:top,width:176,height:44}
 const labels=placeMobileMapLabels(labelAnchors,size.width,top,size.height-bottom-66,[tools])
 const choose=(code:string)=>onRegion(region===code?'all':code)
 const byCode=new Map(regions.map(r=>[r.code,r]))
 const regionQuality=useMemo(()=>new Map(summarizeMapRegions(nodes,quality).map(r=>[r.code,r.probeState])),[nodes,quality])
 const probeState=(r:typeof regions[number])=>regionQuality.get(r.code)??'unknown'
 const frame=useMemo(()=>({width:size.width,height:size.height,view:{x:center.x-view.x*scale,y:center.y-view.y*scale,k:scale},nodes:points.map(r=>{const rate=traffic.get(r.code);return {id:r.code,x:center.x+(r.point[0]-view.x)*scale,y:center.y+(r.point[1]-view.y)*scale,online:r.online>0,probeState:regionQuality.get(r.code)??'unknown',attention:r.online>0&&r.online<r.total,tx:rate?.samples?rate.tx:null,rx:rate?.samples?rate.rx:null}}),connections:[],selected:region,theme,layer,maxPixelRatio:1.5}),[size.width,size.height,center.x,center.y,view.x,view.y,scale,points,traffic,region,theme,layer,regionQuality])
 const end=(id:number)=>{pointers.current.delete(id);start.current=null}
 return <div ref={root} className="mm-canvas" data-layer={layer} data-webgl={ready} data-theme={theme} style={{'--mm-bottom':`${bottom}px`,'--mm-tools-top':`${top}px`} as React.CSSProperties}>
  <svg viewBox={`0 0 ${size.width||360} ${size.height||260}`} role="group" tabIndex={0} aria-label={tr('世界节点分布地图')} aria-describedby="mm-keyboard-help"
   onKeyDown={e=>{if(e.target!==e.currentTarget)return;const key=e.key;if(['+','=','-','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(key)){e.preventDefault();if(key==='Home')world();else if(key==='+'||key==='=')zoom(1.4);else if(key==='-')zoom(1/1.4);else{const d=40/(size.width/1000*live.current.k);publish(boundCamera({...live.current,x:live.current.x+(key==='ArrowLeft'?-d:key==='ArrowRight'?d:0),y:live.current.y+(key==='ArrowUp'?-d:key==='ArrowDown'?d:0)}))}}}}
   onPointerDown={e=>{
    if(e.button!==0)return
    if(!(e.target as Element).closest(".map-region-group"))setChooser(null)
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
    {geometry.shapes.map((shape,i)=>{const rate=traffic.get(shape.code);return <path key={i} d={shape.d} style={layer==='traffic'&&rate?.samples&&region!==shape.code?{fill:`color-mix(in srgb,var(--mm-accent) ${8+trafficPower(rate.tx+rate.rx)*18}%,var(--mm-land))`}:undefined} data-probe-quality={byCode.has(shape.code)?regionQuality.get(shape.code):undefined} data-populated={byCode.has(shape.code)||undefined} data-selected={region===shape.code||undefined}/>})}
   </g>
   {screenPoints.filter(r=>!grouped.has(r.code)).map(r=>{
    const {x,y}=r,q=probeState(r),alert=q!=='unknown'&&q!=='healthy'
    return <g key={r.code} className="mm-marker" transform={`translate(${x} ${y})`} data-region={r.code} data-unmatched={unmatched(r)||undefined} data-probe-quality={q} data-tone={r.online===r.total?'online':r.online===0?'offline':'mixed'} role="button" tabIndex={0} aria-pressed={region===r.code} aria-label={tr('{0}：{1} / {2} 在线',countryName(r.code),r.online,r.total)+(layer==='probe'?` · ${mapProbeLabel({state:q,latency:null,sampleLoss:null,historyLoss:null})}`:alert?` · ${tr('探测异常')}`:'')} onClick={()=>choose(r.code)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(r.code)}}}>
     <circle className="mm-hit" r={22}/><circle className="mm-halo" r={16}/><circle className="mm-ring" r={6}/><circle className="mm-core" r={2.5}/>
     {alert&&<circle className="mm-probe-alert" r={14} aria-hidden="true"/>}
    </g>
   })}
   {labels.map(l=><g className="mm-region-label" key={l.code} data-region={l.code} data-selected={region===l.code||undefined} transform={`translate(${l.x} ${l.y})`} role="button" tabIndex={0} aria-pressed={region===l.code} aria-label={tr('选择 {0}',countryName(l.code))} onClick={()=>choose(l.code)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose(l.code)}}}><rect width={l.width} height={28} rx={6}/><text x={11} y={18}>{names.get(l.code)}</text></g>)}
   {groups.filter(g=>g.members.length>1).map(g=><g key={g.id} className="map-region-group" data-members={g.id} data-unmatched={g.members.every(unmatched)||undefined} transform={`translate(${g.x} ${g.y})`} role="button" tabIndex={0} aria-label={tr('{0} 个地区，选择地区',g.members.length)} aria-expanded={chooser?.id===g.id} onClick={()=>setChooser(old=>old?.id===g.id?null:{id:g.id,view:chooserView})} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setChooser({id:g.id,view:chooserView})}}}><circle className="map-group-hit" r={22}/><circle r={16}/><text textAnchor="middle" dominantBaseline="central">{g.members.length}</text></g>)}
  </svg>
  {chosenGroup&&<MapRegionChooser groupId={chosenGroup.id} members={chosenGroup.members} x={chosenGroup.x} y={chosenGroup.y} width={size.width} top={top+48} bottom={size.height-bottom-60} onChoose={code=>{setChooser(null);onLocate(code)}} onClose={()=>setChooser(null)}/>}
  <ThreeMapCanvas frame={frame} motion={motion} onStatus={setReady}/>
  <span id="mm-keyboard-help" className="sr-only">{tr('方向键平移，加减键缩放，Home 查看全球')}</span>
  <div className="mm-vignette" aria-hidden="true"/>
  <div className="mm-tools" data-map-overlay><button aria-label={tr('查看全球')} onClick={world}><Globe2 size={17}/><span>{tr('全球')}</span></button><button aria-label={tr('重置地图视图')} onClick={reset}><RotateCcw size={18}/></button></div>
  <MapStatusLegend filter={statusFilter} onChange={onStatusFilter} mobile/>
  {!pending&&!points.length&&<p className="mm-map-message" role="status">{tr('暂无可定位的地区信息，仍可在下方查看节点')}</p>}
 </div>
}
