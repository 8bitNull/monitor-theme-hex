import {nextAbnormalRegion,summarizeMapRegions} from '@/lib/mapLayers'
import type {MapLayer} from '@/lib/worldMapModel'
import {MapLayerControls} from './MapLayerControls'
import mapPoints from '@/data/map-flat-points.json'
import {matchesMapStatus,type MapStatusFilter,type MapFocusRequest} from '@/lib/mapInteractions'
import {MapQuickSelect,MapStatusLegend} from './MapInteractionControls'
import {Component,Suspense,lazy,useEffect,useMemo,useRef,useState,type CSSProperties,type ReactNode} from 'react'
import {ArrowDown,ArrowLeft,ArrowUp,BarChart3,ChevronRight,LayoutGrid,Moon,Settings2,Sun,X,MapPin} from 'lucide-react'
import type {Node} from '@/lib/api'
import type {Preferences} from '@/lib/appearance'
import {groupRegions,regionKey} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {tr} from '@/lib/i18n'
import type {MobileMapState,MapCamera} from '@/lib/mobileMap'
import {useMobileMapSheet} from '@/lib/useMobileMapSheet'
import {aggregateMapTraffic,mapTrafficSnapshot} from '@/lib/mapTraffic'
import {useMapProbeQuality} from '@/lib/useMapProbeQuality'
import type {MapProbeQuality} from '@/lib/mapProbeQuality'
import {adaptiveRate} from '@/lib/format'
import {liveMetrics} from '@/lib/freshness'
import type {HomePage} from '@/lib/navigation'
import {useMapTheme} from './ThreeMapCanvas'
import {Status} from './NodeIdentity'
import {Flag} from './NodeIcons'
import {Select} from './ui/select'
import '@/styles/mobile-map.css'

class DrawingBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}
const Canvas=lazy(()=>import('./MobileMapCanvas'))
const label=(code:string)=>code==='all'?tr('所有地区'):code==='unknown'?tr('未知地区'):countryName(code)
type Props={nodes:Node[]|null;enabled:boolean;prefs:Preferences;state:MobileMapState;onRegion:(region:string)=>void;onCamera:(camera:MapCamera|null)=>void;onOpen:(id:number)=>void;onNavigate:(page:HomePage)=>void;onTheme:()=>void;updated?:string}
function MapNodeRow({node,quality,icons,onOpen,onLocate}:{node:Node;quality:MapProbeQuality|undefined;icons:boolean;onOpen:(id:number)=>void;onLocate?:()=>void}){
 const metrics=liveMetrics(node),known=node.online&&quality&&quality.state!=='unknown'
 return <div className="mm-node" data-node-id={node.id} data-quality={node.online?quality?.state??'unknown':'unknown'}><button className="mm-node-detail" onClick={()=>onOpen(node.id)} aria-label={tr('查看 {0}',node.name)}>
  <span className="mm-node-main"><span className="mm-flag">{icons&&node.country?<Flag code={node.country}/>:regionKey(node.country)==='unknown'?<LayoutGrid size={18}/>:regionKey(node.country)}</span>
   <span className="mm-node-name"><strong>{node.name}</strong><small>{label(regionKey(node.country))} · <Status node={node}/></small></span>
   <span className="mm-node-reading" title={quality?.name}><b>{known?(quality.state==='timeout'?tr('超时'):<>{Math.round(quality.latency!)}<small>ms</small></>):'—'}</b><small><ArrowDown size={10}/>{metrics?adaptiveRate(metrics.net_rx):'—'}</small></span><ChevronRight size={14} aria-hidden="true"/>
  </span>
  <span className="mm-node-probe"><span title={quality?.name}>{quality?.name||tr('无该线路记录')}{node.online&&quality?.state==='unknown'?` · ${tr('暂无有效探测')}`:''}</span><span>{tr('24h 丢包')} {node.online&&quality?.historyLoss!==null&&quality?.historyLoss!==undefined?`${quality.historyLoss.toFixed(1)}%`:'—'}</span></span>
 </button>{onLocate&&<button className="node-map-locate" title={tr('按国家或地区定位')} aria-label={tr('地图定位：{0}',node.name)} onClick={onLocate}><MapPin size={17}/></button>}</div>
}
export function MobileMapPage({nodes,enabled,prefs,state,onRegion,onCamera,onOpen,onNavigate,onTheme,updated}:Props){
 const root=useRef<HTMLElement>(null),sheet=useMobileMapSheet(root),theme=useMapTheme()
 const snapshot=useMemo(()=>mapTrafficSnapshot(nodes??[]),[nodes])
 const [layer,setLayer]=useState<MapLayer>('nodes')
 const [statusFilter,setStatusFilter]=useState<MapStatusFilter>('all'),[focusRequest,setFocusRequest]=useState<MapFocusRequest>()
 const nodeById=useMemo(()=>new Map(snapshot.map(node=>[node.id,node])),[snapshot])
 const quality=useMapProbeQuality(snapshot,root,prefs.probe,prefs.latencyWarn,prefs.latencyHigh,enabled,statusFilter==='probe'||layer==='probe')
 const traffic=useMemo(()=>aggregateMapTraffic(snapshot),[snapshot])
 const regions=useMemo(()=>groupRegions(nodes??[]),[nodes]),selected=state.region
 const shown=(nodes??[]).filter(n=>(selected==='all'||regionKey(n.country)===selected)&&matchesMapStatus(nodeById.get(n.id)!,statusFilter,quality.get(n.id))).sort((a,b)=>a.sort-b.sort||a.id-b.id)
 const summaries=useMemo(()=>summarizeMapRegions(snapshot,quality),[snapshot,quality])
 const selectedSummary=summaries.find(r=>r.code===selected)
 const abnormalCount=summaries.filter(r=>r.abnormal>0&&Object.hasOwn(mapPoints,r.code)).length
 const selectedTraffic=traffic.get(selected)
 useEffect(()=>{if(nodes!==null&&Object.hasOwn(mapPoints,selected)&&!regions.some(r=>r.code===selected))onRegion('all')},[nodes,selected,regions,onRegion])
 const selectRegion=(code:string)=>{onRegion(code);if(sheet.state==='collapsed')sheet.setState('half')}
 const locate=(code:string)=>{selectRegion(code);if(sheet.state==='expanded')sheet.setState('half');setFocusRequest(previous=>({code,sequence:(previous?.sequence??0)+1}))}
 const abnormal=()=>{const code=nextAbnormalRegion(summaries,selected,mapPoints);if(code){setStatusFilter('probe');locate(code)}}
 const reset=()=>{onRegion('all');setStatusFilter('all');onCamera(null);sheet.setState(innerHeight<500?'collapsed':'half')}
 const loading=<div className="mm-canvas mm-placeholder" role="status">{tr('地图加载中…')}</div>
 const failed=<div className="mm-canvas mm-placeholder" role="alert"><p>{tr('地图暂时无法加载')}</p><button onClick={()=>location.reload()}>{tr('重试地图')}</button></div>
 return <section ref={root} className="mm-page" data-theme={theme} aria-label={tr('地区地图')} style={{'--mm-sheet-height':`${sheet.height}px`,'--mm-bottom':`${sheet.bottom}px`} as CSSProperties}>
  <div className="mm-page-header" data-map-overlay><button aria-label={tr('返回概览')} onClick={()=>onNavigate('overview')}><ArrowLeft size={21}/></button><div><h1>{tr('全球节点分布')}</h1><p>{nodes===null?tr('正在加载节点'):<><i/>{tr('{0} / {1} 在线',(nodes??[]).filter(n=>n.online).length,nodes.length)}<span>·</span>{tr('{0} 个地区',regions.length)}</>}</p></div><button aria-label={tr('切换地图主题')} onClick={onTheme}>{theme==='dark'?<Sun size={20}/>:<Moon size={20}/>}</button></div>
  {!enabled?<p className="mm-disabled ma-empty" role="status">{tr('地图已关闭，可返回概览查看地区分布')}</p>:<>
   <div className="mm-map-surface"><DrawingBoundary fallback={failed}><Suspense fallback={loading}><Canvas layer={layer} nodes={snapshot} pending={nodes===null} region={selected} camera={state.camera} quality={quality} statusFilter={statusFilter} onStatusFilter={setStatusFilter} focusRequest={focusRequest} onLocate={locate} onRegion={selectRegion} onCamera={onCamera} bottom={sheet.bottom} collapsedBottom={sheet.collapsedBottom} onWorld={()=>sheet.setState('collapsed')} onReset={reset}/></Suspense></DrawingBoundary></div>
   <div className="mm-sheet" data-state={sheet.state} data-dragging={sheet.dragging}>
    <button className="mm-sheet-handle" role="slider" aria-label={tr('节点面板高度')} aria-orientation="vertical" aria-valuemin={0} aria-valuemax={2} aria-valuenow={sheet.state==='collapsed'?0:sheet.state==='half'?1:2} aria-valuetext={sheet.state==='collapsed'?tr('收起节点列表'):sheet.state==='expanded'?tr('展开节点列表'):tr('节点列表')} aria-controls="mm-sheet-content" {...sheet.handle}><i aria-hidden="true"/></button>
    <div className="mm-results-heading">
     <Select sheet role="combobox" searchLabel={tr('搜索地区')} emptyText={tr('无匹配地区')} sheetHint={null} className="mm-region-picker" displayValue={<span className="mm-region-title"><b>{label(selected)}</b><small>{nodes===null?tr('正在加载节点'):tr('{0} / {1} 在线',selectedSummary?.online??shown.filter(n=>n.online).length,selectedSummary?.total??shown.length)}</small></span>} aria-label={tr('地图地区')} value={selected} onChange={e=>selectRegion(e.target.value)}>
      <option value="all">{tr('所有地区')}</option>{regions.map(r=><option key={r.code} value={r.code}>{label(r.code)} · {r.total}</option>)}
      {selected!=='all'&&!regions.some(r=>r.code===selected)&&<option value={selected}>{label(selected)} · 0</option>}
     </Select>
     {selected!=='all'?<button className="mm-clear-region" aria-label={tr('清除地区筛选')} onClick={()=>onRegion('all')}><X size={18}/></button>:<small>{tr('{0} 个节点',shown.length)}</small>}
    </div>
    <div id="mm-sheet-content" className="mm-sheet-content" hidden={sheet.state==='collapsed'}>
     <MapLayerControls layer={layer} onLayer={setLayer} abnormalCount={abnormalCount} onAbnormal={abnormal}/>
     <div className="mm-sheet-status"><MapStatusLegend filter={statusFilter} onChange={setStatusFilter} mobile/></div>
     <MapQuickSelect nodes={snapshot} region={selected} onSelect={locate}/>
     {selectedSummary&&<div className="mm-traffic-summary"><p className="mm-region-sampling">{tr('{0} / {1} 在线',selectedSummary.online,selectedSummary.total)} · {tr('探测异常 {0}',selectedSummary.abnormal)} · {tr('有效探测 {0} / {1}',selectedSummary.probeKnown,selectedSummary.online)}</p><span><ArrowUp size={14}/>{tr('上传')}<b>{selectedTraffic?.samples?adaptiveRate(selectedTraffic.tx):'—'}</b></span><span><ArrowDown size={14}/>{tr('下载')}<b>{selectedTraffic?.samples?adaptiveRate(selectedTraffic.rx):'—'}</b></span>{selectedTraffic&&selectedTraffic.samples<selectedSummary.online&&<small>{tr('{0} 个节点暂无实时数据',selectedSummary.online-selectedTraffic.samples)}</small>}</div>}
     {nodes===null?<p className="ma-empty" role="status">{tr('等待节点数据')}</p>:shown.length?<div className="mm-nodes">{shown.map(node=><MapNodeRow key={node.id} node={node} icons={prefs.icons} quality={quality.get(node.id)} onOpen={onOpen} onLocate={Object.hasOwn(mapPoints,regionKey(node.country))?()=>locate(regionKey(node.country)):undefined}/>)}</div>:<div className="ma-empty"><p>{statusFilter!=='all'?tr('没有符合条件的节点'):selected==='all'?tr('还没有节点'):tr('该地区暂无节点')}</p>{(selected!=='all'||statusFilter!=='all')&&<button onClick={()=>{onRegion('all');setStatusFilter('all')}}>{tr('清除筛选')}</button>}</div>}
     {updated&&<p className="mm-updated">{updated}</p>}
    </div>
   </div>
  </>}
  <nav className="ma-nav mm-nav" aria-label={tr('主导航')}>{([{key:'nodes',label:tr('节点'),Icon:LayoutGrid},{key:'overview',label:tr('概览'),Icon:BarChart3},{key:'settings',label:tr('设置'),Icon:Settings2}] as const).map(({key,label,Icon})=><button key={key} aria-current={key==='overview'?'page':undefined} onClick={()=>onNavigate(key)}><span><Icon size={21}/></span>{label}</button>)}</nav>
 </section>
}
