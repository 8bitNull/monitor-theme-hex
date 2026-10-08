import {Component,Suspense,lazy,type ReactNode} from 'react'
import {ChevronRight} from 'lucide-react'
import type {Node} from '@/lib/api'
import {groupRegions,regionKey} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {tr} from '@/lib/i18n'
import type {MobileMapState,MapCamera} from '@/lib/mobileMap'
import {Status} from './NodeIdentity'
import {Select} from './ui/select'
import '@/styles/mobile-map.css'

class DrawingBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}
const Canvas=lazy(()=>import('./MobileMapCanvas'))
const label=(code:string)=>code==='all'?tr('所有地区'):code==='unknown'?tr('未知地区'):countryName(code)
type Props={nodes:Node[]|null;enabled:boolean;state:MobileMapState;onRegion:(region:string)=>void;onCamera:(camera:MapCamera)=>void;onOpen:(id:number)=>void;updated?:string}
export function MobileMapPage({nodes,enabled,state,onRegion,onCamera,onOpen,updated}:Props){
 const selectRegion=(code:string)=>onRegion(code)
 const regions=groupRegions(nodes??[]),selected=state.region
 const shown=(nodes??[]).filter(n=>selected==='all'||regionKey(n.country)===selected).sort((a,b)=>a.sort-b.sort||a.id-b.id)
 if(!enabled)return <p className="ma-empty" role="status">{tr('地图已关闭，可返回概览查看地区分布')}</p>
 const loading=<div className="mm-canvas mm-placeholder" role="status">{tr('地图加载中…')}</div>
 const failed=<div className="mm-canvas mm-placeholder" role="alert"><p>{tr('地图暂时无法加载')}</p><button onClick={()=>location.reload()}>{tr('重试地图')}</button></div>
 return <section className="mm-page" aria-label={tr('地区地图')}>
  <div className="mm-map-surface"><DrawingBoundary fallback={failed}><Suspense fallback={loading}><Canvas nodes={nodes??[]} pending={nodes===null} region={selected} camera={state.camera} onRegion={selectRegion} onCamera={onCamera} bottom={0}/></Suspense></DrawingBoundary></div>
  <div className="mm-sheet">
  <div className="ma-heading mm-results-heading">
  <Select className="mm-region-picker" displayValue={<span className="mm-region-title"><b>{label(selected)}</b><small>{selected==='all'?tr('{0} 个地区',regions.length):tr('{0} 个节点',shown.length)}</small></span>} aria-label={tr('地图地区')} value={selected} onChange={e=>selectRegion(e.target.value)}>
   <option value="all">{tr('所有地区')}</option>
   {regions.map(r=><option key={r.code} value={r.code}>{label(r.code)} · {r.total}</option>)}
   {selected!=='all'&&!regions.some(r=>r.code===selected)&&<option value={selected}>{label(selected)} · 0</option>}
  </Select><small>{nodes===null?tr('正在加载节点'):tr('{0} / {1} 在线',shown.filter(n=>n.online).length,shown.length)}</small></div>
  <div id="mm-sheet-content" className="mm-sheet-content">
  {nodes===null?<p className="ma-empty" role="status">{tr('等待节点数据')}</p>:shown.length?<div className="ma-panel ma-rows mm-nodes">{shown.map(node=><button key={node.id} className="ma-row mm-node" data-node-id={node.id} onClick={()=>onOpen(node.id)} aria-label={tr('查看 {0}',node.name)}>
   <span className="mm-node-name">{node.name}<small>{label(regionKey(node.country))}</small></span><Status node={node}/><ChevronRight size={16} aria-hidden="true"/>
  </button>)}</div>:<div className="ma-empty"><p>{selected==='all'?tr('还没有节点'):tr('该地区暂无节点')}</p>{selected!=='all'&&<button onClick={()=>onRegion('all')}>{tr('查看全部')}</button>}</div>}
  {updated&&<p className="mm-updated">{updated}</p>}
  </div></div>
 </section>
}
