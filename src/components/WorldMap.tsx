import {tr} from '../lib/i18n.ts'
import {RotateCcw,Plus,Minus,Scan,Maximize,Minimize} from 'lucide-react'
import {useMemo,useState,useRef,useEffect,useLayoutEffect,useId,memo,useCallback,type ReactNode} from 'react'
import {createPortal} from 'react-dom'
import geometry from '@/data/map-paths.json'
import {groupRegions} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {fitOverview} from '@/lib/mapViewport'
import {placeMapMarkers} from '@/lib/mapMarkers'
import {DesktopRegionFilter} from './DesktopRegionFilter'
import '../styles/map-overview.css'
export {countryName} from '@/lib/regionNames'
export type MapNode={id:number;name:string;country:string;online:boolean;attention?:boolean}
const coordinates=geometry.points as Record<string,number[]>
type View={x:number;y:number;k:number}
function fitRegions(points:{point:number[]}[],height=480,padding=32):View{
 if(!points.length){const k=Math.min(1,height/480);return {x:(1000-1000*k)/2,y:0,k}}
 const xs=points.map(p=>p.point[0]),ys=points.map(p=>p.point[1])
 const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys)
 const k=Math.min(2,(1000-padding*2)/Math.max(1,right-left),(height-padding*2)/Math.max(1,bottom-top))
 return {k,x:500-(left+right)/2*k,y:height/2-(top+bottom)/2*k}
}
export const WorldMap=memo(function WorldMap({pendingNodes=false,nodes,region='all',onRegion,viewSwitch,toolsHost}:{pendingNodes?:boolean;nodes:MapNode[];region?:string;onRegion:(code:string)=>void;viewSwitch?:ReactNode;toolsHost?:HTMLElement|null}){
 const regions=useMemo(()=>groupRegions(nodes),[nodes])
 const points=useMemo(()=>regions.flatMap(r=>coordinates[r.code]?[{...r,point:coordinates[r.code]}]:[]),[regions])
 const panel=useRef<HTMLElement>(null),svg=useRef<SVGSVGElement>(null),expandButton=useRef<HTMLButtonElement>(null)
 const [view,commitView]=useState(()=>fitRegions(points)),[full,setFull]=useState(false),[error,setError]=useState(false)
 const [hovered,setHovered]=useState<string|null>(null),[focused,setFocused]=useState<string|null>(null)
 const tooltipId=useId(),active=regions.find(r=>r.code===(hovered??focused))
 const pendingView=useRef(view),overviewView=useRef(view),frame=useRef(0),wasFull=useRef(false)
 const setView=useCallback((next:View|((v:View)=>View))=>{
  pendingView.current=typeof next==='function'?next(pendingView.current):next
  if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;commitView(pendingView.current)})
 },[])
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[])
 const [size,setSize]=useState({width:1000,height:240}),[homeSize,setHomeSize]=useState({width:1000,height:240})
 useEffect(()=>{
  const el=svg.current!;const update=()=>{
   const r=el.getBoundingClientRect();if(!r.width||!r.height)return
   const next={width:r.width,height:r.height}
   setSize(old=>old.width===next.width&&old.height===next.height?old:next)
   if(document.fullscreenElement!==panel.current)setHomeSize(old=>old.width===next.width&&old.height===next.height?old:next)
  }
  update();const observer=new ResizeObserver(update);observer.observe(el);return()=>observer.disconnect()
 },[])
 const homeHeight=1000*homeSize.height/homeSize.width
 const fitted=fitOverview(points,homeSize.width,homeSize.height)
 const homeView={x:fitted.x*1000/homeSize.width,y:fitted.y*1000/homeSize.width,k:fitted.k*1000/homeSize.width}
 const renderedView=full?view:homeView,viewHeight=full?480:homeHeight
 const screenScale=Math.min(size.width/1000,size.height/viewHeight)
 const unit=1/screenScale,offsetX=(size.width-1000*screenScale)/2,offsetY=(size.height-viewHeight*screenScale)/2
 const markers=useMemo(()=>placeMapMarkers(points.map(r=>({...r,x:(r.point[0]*renderedView.k+renderedView.x)*screenScale+offsetX,y:(r.point[1]*renderedView.k+renderedView.y)*screenScale+offsetY}))),[points,renderedView.x,renderedView.y,renderedView.k,screenScale,offsetX,offsetY])
 const tooltipRef=useRef<HTMLDivElement>(null),[tooltipPosition,setTooltipPosition]=useState({x:8,y:8})
 const tooltipText=active?tr('{0}：{1} / {2} 在线',countryName(active.code),active.online,active.total):''
 useLayoutEffect(()=>{
  const marker=markers.find(r=>r.code===active?.code),el=tooltipRef.current
  if(!marker||!el)return
  const r=el.getBoundingClientRect(),x=Math.max(8,Math.min(size.width-r.width-8,marker.x-r.width/2))
  const top=8
  const preferred=marker.y-r.height-14
  const y=Math.max(top,Math.min(size.height-r.height-8,preferred>=top?preferred:marker.y+14))
  setTooltipPosition(old=>Math.abs(old.x-x)<.1&&Math.abs(old.y-y)<.1?old:{x,y})
 },[markers,active?.code,tooltipText,size.width,size.height,full])
 const chooseRegion=(code:string)=>onRegion(region===code?'all':code)
 const local=(x:number,y:number)=>{const p=svg.current!.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(svg.current!.getScreenCTM()!.inverse())}
 const zoom=useCallback((factor:number,anchor={x:500,y:240})=>setView(v=>{const k=Math.max(.7,Math.min(6,v.k*factor)),r=k/v.k;return {k,x:anchor.x-(anchor.x-v.x)*r,y:anchor.y-(anchor.y-v.y)*r}}),[setView])
 useEffect(()=>{
  const el=svg.current!;const wheel=(e:WheelEvent)=>{if(!full)return;e.preventDefault();zoom(Math.exp(-e.deltaY*.002),local(e.clientX,e.clientY))}
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)
 },[zoom,full])
 useEffect(()=>{
  const update=()=>{
   const next=document.fullscreenElement===panel.current
   setFull(next);setHovered(null);setFocused(null)
   if(wasFull.current&&!next){setView(overviewView.current);requestAnimationFrame(()=>expandButton.current?.focus({preventScroll:true}))}
   wasFull.current=next
  }
  document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update)
 },[setView])
 const fullscreen=async()=>{
  setError(false)
  try{if(full)await document.exitFullscreen();else{overviewView.current=homeView;setView(fitRegions(points));await panel.current?.requestFullscreen()}}
  catch{setError(true)}
 }
 const drag=useRef<{id:number;x:number;y:number;moved:boolean}|null>(null),suppressClick=useRef(false)
 const tone=(r:typeof regions[number])=>r.online===0?'offline':r.online<r.total||r.nodes.some(n=>n.attention)?'mixed':'good'
 const byCode=useMemo(()=>new Map(regions.map(r=>[r.code,r])),[regions])
 const land=useMemo(()=>geometry.shapes.map((f,i)=>{
  const r=byCode.get(f.code)
  return <path key={i} d={f.d} className={r?'populated-region':''} data-tone={r?tone(r):undefined} data-region={r?.code} data-selected={r&&region===r.code?true:undefined}/>
 }),[byCode,region])
 const openControl=<button ref={expandButton} className="map-expand" onClick={fullscreen}><Maximize size={16} aria-hidden="true"/>{tr('放大查看')}</button>
 const transform=`translate(${renderedView.x} ${renderedView.y}) scale(${renderedView.k})`
 return <section ref={panel} className={`world-panel explorer-map region-atlas ${full?'is-fullscreen':''}`} data-filtered={region!=='all'}>
  {full&&<div className="section-heading"><h2>{tr('全球节点分布')}</h2></div>}
  <div className="explorer-stage">
   <svg ref={svg} viewBox={`0 0 1000 ${viewHeight}`} role="group" aria-label={tr('世界节点分布地图')} tabIndex={full?0:-1}
    onKeyDown={e=>{if(e.key==='Escape'){setHovered(null);setFocused(null)}if(!full||e.target!==e.currentTarget)return;const delta:Record<string,[number,number]>={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};if(delta[e.key]){e.preventDefault();const [x,y]=delta[e.key];setView(v=>({...v,x:v.x+x,y:v.y+y}))}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.3)}else if(e.key==='-'){e.preventDefault();zoom(1/1.3)}}}
    onClickCapture={e=>{if(suppressClick.current){e.stopPropagation();suppressClick.current=false}}}
    onPointerDown={e=>{suppressClick.current=false;if(!full||e.button!==0)return;const p=local(e.clientX,e.clientY);drag.current={id:e.pointerId,x:p.x,y:p.y,moved:false}}}
    onPointerMove={e=>{const d=drag.current;if(!full||!d||d.id!==e.pointerId)return;const p=local(e.clientX,e.clientY);const dx=p.x-d.x,dy=p.y-d.y;if(!d.moved&&Math.abs(dx)+Math.abs(dy)<4)return;d.moved=true;suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId);setHovered(null);setView(v=>({...v,x:v.x+dx,y:v.y+dy}));d.x=p.x;d.y=p.y}}
    onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);const moved=drag.current?.moved;drag.current=null;if(moved)e.preventDefault()}}
    onPointerCancel={()=>{drag.current=null;suppressClick.current=false}}>
    <g transform={transform} className="map-grid" aria-hidden="true"><path className="map-graticule" d={geometry.graticule}/></g>
    <g transform={transform} className="map-land" aria-hidden="true">{land}</g>

    {markers.map(r=><g key={r.code} transform={`translate(${(r.x-offsetX)*unit} ${(r.y-offsetY)*unit}) scale(${unit})`} className="map-cluster" data-tone={tone(r)} data-region={r.code} role="button" tabIndex={0} aria-pressed={region===r.code} aria-label={tr('{0}：{1} / {2} 在线',countryName(r.code),r.online,r.total)} aria-describedby={active?.code===r.code?tooltipId:undefined}
     onMouseEnter={()=>setHovered(r.code)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setFocused(r.code)} onBlur={()=>setFocused(null)}
     onClick={()=>chooseRegion(r.code)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseRegion(r.code)}}}>
     <circle className="small-region-hit" r={18}/><circle className="region-ring" r={12}/><text className="region-count" textAnchor="middle" dominantBaseline="central">{r.total}</text>
     {(region===r.code||markers.every(other=>other.code===r.code||Math.hypot(other.x-r.x,other.y-r.y)>55))&&<text className="region-name" textAnchor="middle" y={27}>{countryName(r.code)}</text>}
    </g>)}
   </svg>
   {!pendingNodes&&points.length===0&&<p className="map-empty-state" role="status">{tr('暂无可定位的地区信息，仍可在下方查看节点')}</p>}
   {active&&<div ref={tooltipRef} id={tooltipId} role="tooltip" className="map-region-tooltip" style={{left:tooltipPosition.x,top:tooltipPosition.y}}>{tooltipText}</div>}
   {full&&<><div className="map-tools">
    <button title={tr('放大地图')} aria-label={tr('放大地图')} onClick={()=>zoom(1.3)}><Plus size={18}/></button>
    <button title={tr('缩小地图')} aria-label={tr('缩小地图')} onClick={()=>zoom(1/1.3)}><Minus size={18}/></button>
    <button title={tr('适配节点')} aria-label={tr('适配节点')} onClick={()=>setView(fitRegions(points))}><RotateCcw size={18}/></button>
    <button title={tr('查看全部')} aria-label={tr('查看全部')} onClick={()=>setView({x:0,y:0,k:1})}><Scan size={18}/></button>
    <button title={tr('退出全屏')} aria-label={tr('退出全屏')} onClick={fullscreen}><Minimize size={18}/></button>
   </div><output className="map-scale">{Math.round(view.k*100)}%</output></>}
   {!full&&!toolsHost&&openControl}
   {error&&<p className="map-open-error" role="status">{tr('无法打开全屏，请使用支持全屏的浏览器。')}</p>}
  </div>
  {!full&&toolsHost&&createPortal(openControl,toolsHost)}
  {full&&<div className="map-expanded-footer"><DesktopRegionFilter nodes={nodes} region={region} onChange={onRegion}/>{viewSwitch}<span>{tr('拖动平移 · 滚轮缩放')}</span></div>}
 </section>
})
