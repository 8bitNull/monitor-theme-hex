import {summarizeMapRegions} from '@/lib/mapLayers'
import type {MapProps} from './MapPanel'
import {MapLayerControls,mapLayerDescription} from './MapLayerControls'
import {MapRegionDetails,mapProbeLabel} from './MapRegionDetails'
import {tr} from '../lib/i18n.ts'
import {RotateCcw,Plus,Minus,Scan,Maximize,Minimize} from 'lucide-react'
import {useMemo,useState,useRef,useEffect,useLayoutEffect,useId,memo,useCallback} from 'react'
import {createPortal} from 'react-dom'
import geometry from '@/data/map-flat.json'
import {groupRegions} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {fitMapWorld,placeMapBadges,placeMapTooltip} from '@/lib/worldMapModel'
import {placeMapMarkers} from '@/lib/mapMarkers'
import {aggregateMapTraffic,trafficPower,type MapTrafficNode} from '@/lib/mapTraffic'
import {adaptiveRate} from '@/lib/format'
import {ThreeMapCanvas,useMapMotion,useMapTheme} from './ThreeMapCanvas'
import {useMapOverlayBounds} from '@/lib/useMapOverlayBounds'
import {useMapParallax} from '@/lib/useMapParallax'
import {clusterMapRegions,matchesMapStatus} from '@/lib/mapInteractions'
import {MapQuickSelect,MapRegionChooser} from './MapInteractionControls'
import {useMapView} from '@/lib/useMapView'
import {DesktopRegionFilter} from './DesktopRegionFilter'
import '../styles/map-overview.css'
import '../styles/map-traffic.css'
import '../styles/hex-world-map.css'
export {countryName} from '@/lib/regionNames'
export type MapNode=MapTrafficNode
const coordinates=geometry.points as Record<string,number[]>
const defaultHomeScale=1.3
type View={x:number;y:number;k:number}
function fitRegions(points:{point:number[]}[],height=480,padding=32):View{
 if(!points.length){const k=Math.min(1,height/480);return {x:(1000-1000*k)/2,y:0,k}}
 const xs=points.map(p=>p.point[0]),ys=points.map(p=>p.point[1])
 const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys)
 const k=Math.min(2,(1000-padding*2)/Math.max(1,right-left),(height-padding*2)/Math.max(1,bottom-top))
 return {k,x:500-(left+right)/2*k,y:height/2-(top+bottom)/2*k}
}
export const WorldMap=memo(function WorldMap({layer,onLayer,abnormalCount,onAbnormal,onOpen,pendingNodes=false,nodes,region='all',onRegion,viewSwitch,toolsHost,quality,statusFilter,focusRequest,onLocate}:MapProps){
 const regions=useMemo(()=>groupRegions(nodes),[nodes])
 const summaries=useMemo(()=>summarizeMapRegions(nodes,quality),[nodes,quality])
 const selectedSummary=summaries.find(r=>r.code===region&&coordinates[r.code])
 useEffect(()=>{if(!pendingNodes&&Object.hasOwn(coordinates,region)&&!regions.some(r=>r.code===region))onRegion('all')},[pendingNodes,region,regions,onRegion])
 const traffic=useMemo(()=>aggregateMapTraffic(nodes),[nodes])
 const points=useMemo(()=>regions.flatMap(r=>coordinates[r.code]?[{...r,point:coordinates[r.code]}]:[]),[regions])
 const panel=useRef<HTMLElement>(null),svg=useRef<SVGSVGElement>(null),expandButton=useRef<HTMLButtonElement>(null),scene=useRef<HTMLDivElement>(null),stage=useRef<HTMLDivElement>(null)
 const [full,setFull]=useState(false),[error,setError]=useState(false),[panning,setPanning]=useState(false)
 const [hovered,setHovered]=useState<string|null>(null),[focused,setFocused]=useState<string|null>(null)
 // The overview is a dark instrument panel; expanded maps follow site appearance.
 const motion=useMapMotion(),theme=useMapTheme(full?undefined:'dark'),[ready,setReady]=useState(false)
 const {view,set:setView,stop:stopView}=useMapView(()=>fitRegions(points),motion)
 const {view:navigation,set:setNavigation,stop:stopNavigation}=useMapView(()=>({x:0,y:0,k:defaultHomeScale}),motion)
 const regionQuality=useMemo(()=>new Map(summaries.map(r=>[r.code,r.probeState])),[summaries])
 useMapParallax(panel,scene,motion&&!full)
 const [detailSide,setDetailSide]=useState<'left'|'right'>('right')
 const obstacles=useMapOverlayBounds(panel,full,`${region}:${error}:${layer}:${detailSide}`,toolsHost)
 const tooltipId=useId(),hintId=useId()
 const overviewView=useRef(view),wasFull=useRef(false),pointerFocus=useRef(false)
 const [size,setSize]=useState({width:1000,height:240}),[homeSize,setHomeSize]=useState({width:1000,height:240})
 useEffect(()=>{
  const el=svg.current!;const update=(r:{width:number;height:number})=>{
   if(!r.width||!r.height)return
   stopView();stopNavigation()
   const next={width:r.width,height:r.height}
   setSize(old=>old.width===next.width&&old.height===next.height?old:next)
   if(document.fullscreenElement!==panel.current)setHomeSize(old=>old.width===next.width&&old.height===next.height?old:next)
  }
  update({width:el.clientWidth,height:el.clientHeight});const observer=new ResizeObserver(entries=>update(entries[0].contentRect));observer.observe(el);return()=>observer.disconnect()
 },[stopView,stopNavigation])
 const homeHeight=1000*homeSize.height/homeSize.width
 // Leave the geographic targets below the quick filters and layer controls.
 const fitted=fitMapWorld(homeSize.width,Math.max(1,homeSize.height-160),10,{top:28,bottom:332})
 fitted.y+=108
 const homeView={x:fitted.x*1000/homeSize.width,y:fitted.y*1000/homeSize.width,k:fitted.k*1000/homeSize.width}
 const renderedView=full?view:{k:homeView.k*navigation.k,x:homeView.x*navigation.k+navigation.x+500*(1-navigation.k),y:homeView.y*navigation.k+navigation.y+homeHeight/2*(1-navigation.k)},viewHeight=full?480:homeHeight
 const screenScale=Math.min(size.width/1000,size.height/viewHeight)
 const unit=1/screenScale,offsetX=(size.width-1000*screenScale)/2,offsetY=(size.height-viewHeight*screenScale)/2
 const markers=useMemo(()=>placeMapMarkers(points.map(r=>({...r,x:(r.point[0]*renderedView.k+renderedView.x)*screenScale+offsetX,y:(r.point[1]*renderedView.k+renderedView.y)*screenScale+offsetY}))).map(r=>({...r,visible:r.x>=0&&r.x<=size.width&&r.y>=0&&r.y<=size.height})),[points,renderedView.x,renderedView.y,renderedView.k,screenScale,offsetX,offsetY,size.width,size.height])
 const nextDetailSide=markers.some(r=>r.code===region&&r.x>size.width*.65)?'left':'right'
 if(nextDetailSide!==detailSide)setDetailSide(nextDetailSide)
 const groups=clusterMapRegions(markers.filter(r=>r.visible),28),grouped=new Set(groups.filter(g=>g.members.length>1).flatMap(g=>g.members.map(m=>m.code)))
 const chooserView=JSON.stringify([renderedView.x,renderedView.y,renderedView.k,size.width,size.height])
 const [chooser,setChooser]=useState<{id:string;view:string}|null>(null)
 const chosenGroup=groups.find(g=>g.id===chooser?.id&&g.members.length>1)
 if(chooser&&(chooser.view!==chooserView||!chosenGroup))setChooser(null)
 const unmatched=(r:typeof regions[number])=>!r.nodes.some(n=>matchesMapStatus(n,statusFilter,quality.get(n.id)))
 const active=markers.find(r=>r.visible&&r.code===(hovered??focused))
 if(focused&&!markers.some(r=>r.code===focused&&r.visible))setFocused(null)
 const badges=useMemo(()=>placeMapBadges(markers.map(r=>({id:r.code,x:r.x,y:r.y,label:countryName(r.code),total:r.total})),size.width,size.height,obstacles),[markers,size,obstacles])
 const tooltipRef=useRef<HTMLDivElement>(null),[tooltipPosition,setTooltipPosition]=useState({x:8,y:8})
 const activeTraffic=active?traffic.get(active.code):undefined
 const trafficText=activeTraffic?.samples?`${adaptiveRate(activeTraffic.tx)} / ${adaptiveRate(activeTraffic.rx)}`:tr('流量数据暂不可用')
 const flowRegions=useMemo(()=>markers.map(marker=>{const rate=traffic.get(marker.code);return {id:marker.code,x:marker.x,y:marker.y,tx:rate?.samples?rate.tx:null,rx:rate?.samples?rate.rx:null,online:marker.online>0,probeState:regionQuality.get(marker.code)??'unknown',attention:marker.online>0&&(marker.online<marker.total||marker.nodes.some(node=>node.attention))}}),[markers,traffic,regionQuality])
 const hexFrame=useMemo(()=>({width:size.width,height:size.height,view:{x:renderedView.x*screenScale+offsetX,y:renderedView.y*screenScale+offsetY,k:renderedView.k*screenScale},nodes:flowRegions,connections:[],selected:region,theme,layer}),[size,renderedView.x,renderedView.y,renderedView.k,screenScale,offsetX,offsetY,flowRegions,region,theme,layer])
 const tooltipText=active?tr('{0}：{1} / {2} 在线',countryName(active.code),active.online,active.total):''
 useLayoutEffect(()=>{
  const marker=markers.find(r=>r.code===active?.code),el=tooltipRef.current
  if(!marker||!el)return
  const r=el.getBoundingClientRect(),base=stage.current!.getBoundingClientRect()
  const core=svg.current?.querySelector(`[data-region="${marker.code}"] .region-core`)?.getBoundingClientRect()
  const anchor=core?{x:core.x+core.width/2-base.x,y:core.y+core.height/2-base.y}:marker
  const {x,y}=placeMapTooltip(anchor,r,size,obstacles)
  setTooltipPosition(old=>Math.abs(old.x-x)<.1&&Math.abs(old.y-y)<.1?old:{x,y})
 },[markers,active?.code,tooltipText,trafficText,size,full,quality,obstacles])
 const chooseRegion=(code:string)=>onRegion(region===code?'all':code)
 const locate=(code:string)=>{setChooser(null);if(onLocate)onLocate(code);else if(coordinates[code])focusRegion(coordinates[code],code);else onRegion(code)}
 const local=(x:number,y:number)=>{const p=svg.current!.createSVGPoint();p.x=x;p.y=y;return p.matrixTransform(svg.current!.getScreenCTM()!.inverse())}
 const zoom=useCallback((factor:number,anchor={x:500,y:viewHeight/2})=>{
  const origin=full?anchor:{x:anchor.x-500,y:anchor.y-viewHeight/2}
  const update=(v:View)=>{const k=Math.max(full ? .7 : .65,Math.min(full?6:8,v.k*factor)),r=k/v.k;return {k,x:origin.x-(origin.x-v.x)*r,y:origin.y-(origin.y-v.y)*r}}
  if(full)setView(update,true);else setNavigation(update,true)
 },[setView,setNavigation,full,viewHeight])
 const reset=()=>{setChooser(null);if(full)setView(fitRegions(points),true);else setNavigation({x:0,y:0,k:defaultHomeScale},true)}
 const focusRegion=useCallback((point:number[],code:string)=>{
  setHovered(null);setFocused(null);onRegion(code)
  if(full){const k=2.6;setView({k,x:500-point[0]*k,y:240-point[1]*k},true)}
  else{const k=3;setNavigation({k,x:(500-point[0]*homeView.k-homeView.x)*k,y:(homeHeight/2-point[1]*homeView.k-homeView.y)*k},true)}
 },[onRegion,full,setView,setNavigation,homeView.k,homeView.x,homeView.y,homeHeight])
 const handledFocus=useRef<number|undefined>(undefined)
 useEffect(()=>{
  if(!focusRequest||handledFocus.current===focusRequest.sequence||!size.width)return
  const point=coordinates[focusRequest.code]
  if(!point)return
  handledFocus.current=focusRequest.sequence;focusRegion(point,focusRequest.code)
 },[focusRequest,size.width,focusRegion])
 useEffect(()=>{
  const el=svg.current!;const wheel=(e:WheelEvent)=>{if(!full&&!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(Math.exp(-e.deltaY*.002),local(e.clientX,e.clientY))}
  el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)
 },[zoom,full])
 useEffect(()=>{
  const update=()=>{
   const next=document.fullscreenElement===panel.current
   stopView();stopNavigation()
   setFull(next);setHovered(null);setFocused(null)
   if(wasFull.current&&!next){setView(overviewView.current);requestAnimationFrame(()=>expandButton.current?.focus({preventScroll:true}))}
   wasFull.current=next
  }
  document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update)
 },[setView,stopView,stopNavigation])
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
  const rate=traffic.get(f.code),heat=trafficPower((rate?.tx??0)+(rate?.rx??0))
  return <path key={i} d={f.d} style={layer==='traffic'&&r&&rate?.samples&&region!==r.code?{fill:`color-mix(in srgb,var(--tone) ${12+heat*20}%,var(--card))`}:undefined} className={r?'populated-region':''} data-tone={r?tone(r):undefined} data-region={r?.code} data-probe-quality={r?regionQuality.get(r.code):undefined} data-selected={r&&region===r.code?true:undefined}/>
 }),[byCode,region,traffic,layer,regionQuality])
 const openControl=<button ref={expandButton} className="map-expand" onClick={fullscreen}><Maximize size={16} aria-hidden="true"/>{tr('放大查看')}</button>
 const transform=`translate(${renderedView.x} ${renderedView.y}) scale(${renderedView.k})`
 return <section ref={panel} className={`world-panel explorer-map region-atlas ${full?'is-fullscreen':''}`} data-layer={layer} data-map-style="hex" data-theme={theme} data-webgl={ready} data-filtered={region!=='all'}>
  {full&&<div className="section-heading"><h2>{tr('全球节点分布')}</h2></div>}
  <div ref={stage} className="explorer-stage" data-panning={panning}>
   <div ref={scene} className="map-parallax-scene">
   <svg ref={svg} viewBox={`0 0 1000 ${viewHeight}`} role="group" aria-label={tr('世界节点分布地图')} aria-describedby={hintId} tabIndex={0}
    onKeyDown={e=>{if(e.key==='Escape'){setHovered(null);setFocused(null)}if(e.target!==e.currentTarget)return;const delta:Record<string,[number,number]>={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};if(delta[e.key]){e.preventDefault();const [x,y]=delta[e.key],update=(v:View)=>({...v,x:v.x+x,y:v.y+y});if(full)setView(update);else setNavigation(update)}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(1.3)}else if(e.key==='-'){e.preventDefault();zoom(1/1.3)}else if(e.key==='0'||e.key==='Home'){e.preventDefault();reset()}}}
    onDoubleClick={e=>{e.preventDefault();zoom(1.6,local(e.clientX,e.clientY))}}
    onClickCapture={e=>{if(suppressClick.current){e.stopPropagation();suppressClick.current=false}}}
    onPointerDown={e=>{if(!(e.target as Element).closest(".map-region-group"))setChooser(null);suppressClick.current=false;if(e.button!==0)return;stopView();stopNavigation();const p=local(e.clientX,e.clientY);drag.current={id:e.pointerId,x:p.x,y:p.y,moved:false}}}
    onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const p=local(e.clientX,e.clientY);const dx=p.x-d.x,dy=p.y-d.y;if(!d.moved&&Math.abs(dx)+Math.abs(dy)<4)return;d.moved=true;setPanning(true);suppressClick.current=true;e.currentTarget.setPointerCapture(e.pointerId);setHovered(null);setFocused(null);const update=(v:View)=>({...v,x:v.x+dx,y:v.y+dy});if(full)setView(update);else setNavigation(update);d.x=p.x;d.y=p.y}}
    onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);const moved=drag.current?.moved;drag.current=null;setPanning(false);if(moved)e.preventDefault()}}
    onPointerCancel={()=>{drag.current=null;suppressClick.current=false;setPanning(false)}}>
    <g transform={transform} className="map-grid" aria-hidden="true"><path className="map-graticule" d={geometry.graticule}/></g>
    <g transform={transform} className="map-land" aria-hidden="true">{land}</g>

    {markers.filter(r=>!grouped.has(r.code)).map(r=>{const badge=badges.get(r.code),dx=badge?badge.x-r.x:0,dy=badge?badge.y-r.y:0,q=regionQuality.get(r.code)??'unknown',alert=q!=='unknown'&&q!=='healthy';return <g key={r.code} transform={`translate(${(r.x-offsetX)*unit} ${(r.y-offsetY)*unit}) scale(${unit})`} className="map-cluster" data-unmatched={unmatched(r)||undefined} data-tone={tone(r)} data-probe-quality={q} data-region={r.code} role="button" tabIndex={r.visible?0:-1} aria-hidden={!r.visible||undefined} aria-pressed={region===r.code} aria-label={tr('{0}：{1} / {2} 在线',countryName(r.code),r.online,r.total)+(layer==='probe'?` · ${mapProbeLabel({state:q,latency:null,sampleLoss:null,historyLoss:null})}`:alert?` · ${tr('探测异常')}`:'')} aria-describedby={active?.code===r.code?tooltipId:undefined}
     onMouseEnter={()=>setHovered(r.code)} onMouseLeave={()=>setHovered(null)} onPointerDown={()=>{pointerFocus.current=true;setFocused(null)}} onPointerUp={()=>{pointerFocus.current=false}} onPointerCancel={()=>{pointerFocus.current=false}} onFocus={()=>{if(!pointerFocus.current)setFocused(r.code)}} onBlur={()=>{pointerFocus.current=false;setFocused(null)}}
     onClick={e=>{if(e.detail<2)chooseRegion(r.code)}} onDoubleClick={e=>{e.preventDefault();e.stopPropagation();focusRegion(r.point,r.code)}} onKeyDown={e=>{pointerFocus.current=false;if(e.key!=='Escape')setFocused(r.code);if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseRegion(r.code)}}}>
     {badge&&<><path className="hex-badge-hit" d={`M0,0L${dx},${dy}`} aria-hidden="true"/><path className="hex-badge-leader" d={`M0,0L${dx},${dy}`} aria-hidden="true"/></>}
     <circle className="small-region-hit" r={9}/><circle className="region-ring" r={5}/><circle className="region-core" r={2}/>
     {alert&&<circle className="map-probe-alert" r={8} aria-hidden="true"/>}
     {badge&&<g className="hex-region-badge" transform={`translate(${dx} ${dy})`}><rect x={-badge.width/2} y={-10} width={badge.width} height={20} rx={5}/><text className="hex-badge-name" x={-badge.width/2+8} dominantBaseline="central">{countryName(r.code)}</text><text className="region-count" x={badge.width/2-8} textAnchor="end" dominantBaseline="central">{r.total}</text></g>}
    </g>})}
    {groups.filter(g=>g.members.length>1).map(g=><g key={g.id} className="map-region-group" data-members={g.id} data-unmatched={g.members.every(unmatched)||undefined} transform={`translate(${(g.x-offsetX)*unit} ${(g.y-offsetY)*unit}) scale(${unit})`} role="button" tabIndex={0} aria-label={tr('{0} 个地区，选择地区',g.members.length)} aria-expanded={chooser?.id===g.id} onClick={()=>setChooser(old=>old?.id===g.id?null:{id:g.id,view:chooserView})} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setChooser({id:g.id,view:chooserView})}}}><circle r={14}/><text textAnchor="middle" dominantBaseline="central">{g.members.length}</text></g>)}
   </svg>
   <div className="map-desktop-quick"><MapQuickSelect nodes={nodes} region={region} onSelect={locate}/></div>
   {chosenGroup&&<MapRegionChooser groupId={chosenGroup.id} members={chosenGroup.members} x={chosenGroup.x} y={chosenGroup.y} width={size.width} top={94} bottom={Math.max(140,size.height-50)} onChoose={locate} onClose={()=>setChooser(null)}/>}
   <ThreeMapCanvas frame={hexFrame} motion={motion} onStatus={setReady}/>
   </div>
   <MapLayerControls layer={layer} onLayer={onLayer} abnormalCount={abnormalCount} onAbnormal={onAbnormal}/>
   {selectedSummary&&<MapRegionDetails side={detailSide} summary={selectedSummary} quality={quality} onClose={()=>onRegion('all')} onOpen={onOpen}/>}
   <span id={hintId} className="map-gesture-hint">{full?tr('拖动平移 · 滚轮缩放'):tr('拖动平移 · Ctrl / ⌘ + 滚轮缩放')}<span className="map-flow-hint">{mapLayerDescription(layer)}</span><span className="map-keyboard-hint">{tr('方向键平移 · +/- 缩放 · 0 复位')}</span></span>
   {!full&&<div className="map-canvas-controls" data-map-overlay role="group" aria-label={tr('地图浏览工具')}><button aria-label={tr('缩小地图')} title={tr('缩小地图')} onClick={()=>zoom(1/1.3)}><Minus size={14}/></button><output>{Math.round(navigation.k*100)}%</output><button aria-label={tr('放大地图')} title={tr('放大地图')} onClick={()=>zoom(1.3)}><Plus size={14}/></button><button aria-label={tr('重置地图视图')} title={tr('重置地图视图')} onClick={reset}><RotateCcw size={13}/></button></div>}
   {!pendingNodes&&points.length===0&&<p className="map-empty-state" role="status">{tr('暂无可定位的地区信息，仍可在下方查看节点')}</p>}
   {active&&<div ref={tooltipRef} id={tooltipId} role="tooltip" className="map-region-tooltip" style={{left:tooltipPosition.x,top:tooltipPosition.y}}>{tooltipText}<div className="map-tooltip-traffic">{activeTraffic?.samples?<><span data-flow="upload">↑ {tr('上传')}<b>{adaptiveRate(activeTraffic.tx)}</b></span><span data-flow="download">↓ {tr('下载')}<b>{adaptiveRate(activeTraffic.rx)}</b></span></>:<span>{tr('流量数据暂不可用')}</span>}</div></div>}
   {full&&<><div className="map-tools" data-map-overlay>
    <button title={tr('放大地图')} aria-label={tr('放大地图')} onClick={()=>zoom(1.3)}><Plus size={18}/></button>
    <button title={tr('缩小地图')} aria-label={tr('缩小地图')} onClick={()=>zoom(1/1.3)}><Minus size={18}/></button>
    <button title={tr('适配节点')} aria-label={tr('适配节点')} onClick={()=>setView(fitRegions(points),true)}><RotateCcw size={18}/></button>
    <button title={tr('查看全部')} aria-label={tr('查看全部')} onClick={()=>setView({x:0,y:0,k:1},true)}><Scan size={18}/></button>
    <button title={tr('退出全屏')} aria-label={tr('退出全屏')} onClick={fullscreen}><Minimize size={18}/></button>
   </div><output className="map-scale">{Math.round(view.k*100)}%</output></>}
   {!full&&!toolsHost&&openControl}
   {error&&<p className="map-open-error" data-map-overlay role="status">{tr('无法打开全屏，请使用支持全屏的浏览器。')}</p>}
  </div>
  {!full&&toolsHost&&createPortal(openControl,toolsHost)}
  {full&&<div className="map-expanded-footer"><DesktopRegionFilter nodes={nodes} region={region} onChange={onRegion}/>{viewSwitch}<span>{tr('拖动平移 · 滚轮缩放')}</span></div>}
 </section>
})
