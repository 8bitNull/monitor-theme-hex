import type {MapLayer} from '@/lib/worldMapModel'
import {MapStatusLegend} from './MapInteractionControls'
import type {MapStatusFilter,MapFocusRequest} from '@/lib/mapInteractions'
import type {MapProbeQuality} from '@/lib/mapProbeQuality'
import {Component,useEffect,useMemo,useState,type ComponentType,type ReactNode,type RefObject} from 'react'
import {Globe,X} from 'lucide-react'
import type {MapNode} from './WorldMap'
import {tr} from '@/lib/i18n'
import {countryName} from '@/lib/regionNames'
import {regionKey} from '@/lib/groups'
export type MapProps={layer:MapLayer;onLayer:(layer:MapLayer)=>void;abnormalCount:number;onAbnormal:()=>void;onOpen:(id:number)=>void;quality:Map<number,MapProbeQuality>;statusFilter:MapStatusFilter;onStatusFilter:(filter:MapStatusFilter)=>void;focusRequest?:MapFocusRequest;pendingNodes?:boolean;nodes:MapNode[];region:string;onRegion:(code:string)=>void;onLocate?:(code:string)=>void;viewSwitch?:ReactNode;toolsHost?:HTMLElement|null}
let request:Promise<typeof import('./WorldMap')>|undefined
export function loadMap(){return request??=import('./WorldMap').catch(error=>{request=undefined;throw error})}
class MapBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}
export function MapPanel({layer,onLayer,abnormalCount,onAbnormal,onOpen,nodeSnapshot,region,onRegion,viewSwitch,pendingNodes=false,statusFilter,onStatusFilter,focusRequest,quality,panelRef,onLocate}:{nodeSnapshot:string;viewSwitch:ReactNode;pendingNodes?:boolean;panelRef:RefObject<HTMLDivElement|null>;onLocate:(code:string)=>void}&Omit<MapProps,'nodes'>){
 const nodes=useMemo(()=>JSON.parse(nodeSnapshot) as MapNode[],[nodeSnapshot])
 const [Map,setMap]=useState<ComponentType<MapProps>|null>(null),[state,setState]=useState<'loading'|'slow'|'failed'|'ready'>('loading'),[attempt,setAttempt]=useState(0)
 const [toolsHost,setToolsHost]=useState<HTMLDivElement|null>(null)
 useEffect(()=>{
  let active=true
  const slow=setTimeout(()=>{if(active)setState('slow')},3000)
  const timeout=setTimeout(()=>{if(active)setState('failed')},15000)
  loadMap().then(module=>{if(active){setMap(()=>module.WorldMap);setState('ready')}},()=>{if(active)setState('failed')}).finally(()=>{clearTimeout(slow);clearTimeout(timeout)})
  return()=>{active=false;clearTimeout(slow);clearTimeout(timeout)}
 },[attempt])
 const fallback=(failed:boolean)=><section className="map-placeholder explorer-map" aria-label={tr('全球节点分布')}>
  <div className="map-loading-message" role={failed?'alert':'status'}><Globe size={40} aria-hidden="true"/><p>{failed?tr('地图暂时无法加载'):state==='slow'?tr('地图加载较慢，节点列表仍可使用'):tr('地图加载中…')}</p>{failed&&<div><button onClick={()=>{setMap(null);setState('loading');setAttempt(n=>n+1)}}>{tr('重试地图')}</button><button onClick={()=>location.reload()}>{tr('刷新页面')}</button></div>}</div>
 </section>
 return <div ref={panelRef} className="map-frame persistent-map">
  <div className="home-region-bar">
   <h2 className="home-map-heading" data-map-overlay>{tr('全球节点分布')}</h2>
   <div className="home-map-actions">
   <div className="home-map-tools" data-map-overlay ref={setToolsHost}/>
   </div>
  </div>
  <div id="home-map-canvas"><MapBoundary key={attempt} fallback={fallback(true)}>{Map&&state==='ready'?<Map layer={layer} onLayer={onLayer} abnormalCount={abnormalCount} onAbnormal={onAbnormal} onOpen={onOpen} pendingNodes={pendingNodes} nodes={nodes} region={region} onRegion={onRegion} viewSwitch={viewSwitch} toolsHost={toolsHost} quality={quality} statusFilter={statusFilter} onStatusFilter={onStatusFilter} focusRequest={focusRequest} onLocate={onLocate}/>:fallback(state==='failed')}</MapBoundary></div>
  <div className="map-status-row">
   <MapStatusLegend filter={statusFilter} onChange={onStatusFilter}/>
   {region!=='all'&&nodes.some(n=>regionKey(n.country)===region)&&<button className="map-region-selection" data-map-overlay aria-label={tr('清除地区筛选')} onClick={()=>onRegion('all')}><span>{countryName(region)} · {tr('{0} 个节点',nodes.filter(n=>regionKey(n.country)===region).length)}</span><X size={12} aria-hidden="true"/></button>}
  </div>
  {pendingNodes&&<span className="map-data-notice" role="status">{tr('等待节点数据')}</span>}
 </div>
}
