import {Component,Suspense,lazy,useLayoutEffect,useRef,useState,type ReactNode} from 'react'
import {ChevronRight,ChevronUp,ChevronDown,LocateFixed} from 'lucide-react'
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
 const [sheet,setSheet]=useState<'collapsed'|'half'|'expanded'>(()=>{try{const v=sessionStorage.getItem('hex-map-sheet');return v==='half'||v==='expanded'?v:'collapsed'}catch{return 'collapsed'}})
 const panel=useRef<HTMLDivElement>(null),drag=useRef<number|null>(null),dragged=useRef(false)
 const [bottom,setBottom]=useState(100)
 useLayoutEffect(()=>{
  const el=panel.current;if(!el)return
  const update=()=>setBottom(el.parentElement!.getBoundingClientRect().bottom-el.getBoundingClientRect().top)
  update();const observer=new ResizeObserver(update);observer.observe(el);observer.observe(el.parentElement!);return()=>observer.disconnect()
 },[enabled])
 const changeSheet=(value:typeof sheet)=>{setSheet(value);try{sessionStorage.setItem('hex-map-sheet',value)}catch{/* Optional persistence. */}}
 const selectRegion=(code:string)=>{onRegion(code);changeSheet('half')}
 const regions=groupRegions(nodes??[]),selected=state.region
 const shown=(nodes??[]).filter(n=>selected==='all'||regionKey(n.country)===selected).sort((a,b)=>a.sort-b.sort||a.id-b.id)
 if(!enabled)return <p className="ma-empty" role="status">{tr('地图已关闭，可返回概览查看地区分布')}</p>
 const loading=<div className="mm-canvas mm-placeholder" role="status">{tr('地图加载中…')}</div>
 const failed=<div className="mm-canvas mm-placeholder" role="alert"><p>{tr('地图暂时无法加载')}</p><button onClick={()=>location.reload()}>{tr('重试地图')}</button></div>
 return <section className="mm-page" aria-label={tr('地区地图')}>
  <DrawingBoundary fallback={failed}><Suspense fallback={loading}><Canvas nodes={nodes??[]} pending={nodes===null} region={selected} camera={state.camera} onRegion={selectRegion} onCamera={onCamera} bottom={bottom}/></Suspense></DrawingBoundary>
  <div ref={panel} className="mm-sheet" data-state={sheet}>
  <div className="ma-heading mm-results-heading">
   <button className="mm-sheet-handle" aria-label={tr('调整列表高度')} onClick={e=>{if(e.detail===0||!dragged.current)changeSheet(sheet==='collapsed'?'half':sheet==='expanded'?'half':'expanded');dragged.current=false}}
    onPointerDown={e=>{dragged.current=false;drag.current=e.clientY;e.currentTarget.setPointerCapture(e.pointerId)}}
    onPointerUp={e=>{const delta=e.clientY-(drag.current??e.clientY);drag.current=null;if(Math.abs(delta)>25){dragged.current=true;e.preventDefault();changeSheet(delta<0?(sheet==='collapsed'?'half':'expanded'):(sheet==='expanded'?'half':'collapsed'))}}}
    onPointerCancel={()=>{drag.current=null}}><LocateFixed size={21}/></button>
  <Select className="mm-region-picker" displayValue={<span className="mm-region-title"><b>{label(selected)}</b><small>{selected==='all'?tr('{0} 个地区',regions.length):tr('{0} 个节点',shown.length)}</small></span>} aria-label={tr('地图地区')} value={selected} onChange={e=>selectRegion(e.target.value)}>
   <option value="all">{tr('所有地区')}</option>
   {regions.map(r=><option key={r.code} value={r.code}>{label(r.code)} · {r.total}</option>)}
   {selected!=='all'&&!regions.some(r=>r.code===selected)&&<option value={selected}>{label(selected)} · 0</option>}
  </Select><small>{nodes===null?tr('正在加载节点'):tr('{0} / {1} 在线',shown.filter(n=>n.online).length,shown.length)}</small><button className="mm-sheet-toggle" aria-expanded={sheet!=='collapsed'} aria-controls="mm-sheet-content" aria-label={sheet==='collapsed'?tr('展开节点列表'):tr('收起节点列表')} onClick={()=>changeSheet(sheet==='collapsed'?'half':'collapsed')}>{sheet==='collapsed'?<ChevronUp size={19}/>:<ChevronDown size={19}/>}</button></div>
  <div id="mm-sheet-content" className="mm-sheet-content" hidden={sheet==='collapsed'}>
  {nodes===null?<p className="ma-empty" role="status">{tr('等待节点数据')}</p>:shown.length?<div className="ma-panel ma-rows mm-nodes">{shown.map(node=><button key={node.id} className="ma-row mm-node" data-node-id={node.id} onClick={()=>onOpen(node.id)} aria-label={tr('查看 {0}',node.name)}>
   <span className="mm-node-name">{node.name}<small>{label(regionKey(node.country))}</small></span><Status node={node}/><ChevronRight size={16} aria-hidden="true"/>
  </button>)}</div>:<div className="ma-empty"><p>{selected==='all'?tr('还没有节点'):tr('该地区暂无节点')}</p>{selected!=='all'&&<button onClick={()=>onRegion('all')}>{tr('查看全部')}</button>}</div>}
  {updated&&<p className="mm-updated">{updated}</p>}
  </div></div>
 </section>
}
