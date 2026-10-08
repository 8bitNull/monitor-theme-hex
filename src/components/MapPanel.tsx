import {Component,useEffect,useMemo,useState,type ComponentType,type ReactNode} from 'react'
import {Globe} from 'lucide-react'
import type {MapNode} from './WorldMap'
import {tr} from '@/lib/i18n'
import {groupRegions} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {Flag} from './NodeIcons'
export type MapProps={pendingNodes?:boolean;nodes:MapNode[];region:string;onRegion:(code:string)=>void;viewSwitch?:ReactNode;toolsHost?:HTMLElement|null}
let request:Promise<typeof import('./WorldMap')>|undefined
export function loadMap(){return request??=import('./WorldMap').catch(error=>{request=undefined;throw error})}
class MapBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}
export function MapPanel({nodeSnapshot,region,onRegion,viewSwitch,pendingNodes=false}:{nodeSnapshot:string;viewSwitch:ReactNode;pendingNodes?:boolean}&Omit<MapProps,'nodes'>){
 const nodes=useMemo(()=>JSON.parse(nodeSnapshot) as MapNode[],[nodeSnapshot])
 const [Map,setMap]=useState<ComponentType<MapProps>|null>(null),[state,setState]=useState<'loading'|'slow'|'failed'|'ready'>('loading'),[attempt,setAttempt]=useState(0)
 const regions=useMemo(()=>groupRegions(nodes),[nodes])
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
 return <div className="map-frame persistent-map">
  <div className="home-region-bar">
   <h2 className="home-map-heading">{tr('全球节点分布')}</h2>
   <div className="home-map-actions">
   <div className="home-map-tools" ref={setToolsHost}/>
   </div>
  </div>
  <div id="home-map-canvas"><MapBoundary key={attempt} fallback={fallback(true)}>{Map&&state==='ready'?<Map pendingNodes={pendingNodes} nodes={nodes} region={region} onRegion={onRegion} viewSwitch={viewSwitch} toolsHost={toolsHost}/>:fallback(state==='failed')}</MapBoundary></div>
  <div className="map-state-legend" aria-label={tr('地图状态')}><span data-tone="good"><i/>{tr('正常')}</span><span data-tone="mixed"><i/>{tr('需关注')}</span><span data-tone="offline"><i/>{tr('离线')}</span><small>{tr('点击地区筛选节点')}</small></div>
  <div className="map-region-chips" role="group" aria-label={tr('地区分布')}>{regions.map(r=><button type="button" key={r.code} data-region={r.code} aria-pressed={region===r.code} onClick={()=>onRegion(region===r.code?'all':r.code)}><Flag code={r.code}/><span>{countryName(r.code)}</span><b>{r.total}</b></button>)}</div>
  {pendingNodes&&<span className="map-data-notice" role="status">{tr('等待节点数据')}</span>}
 </div>
}
