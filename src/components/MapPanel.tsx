import {Component,useEffect,useLayoutEffect,useMemo,useRef,useState,type ComponentType,type ReactNode} from 'react'
import {Check,ChevronDown,Globe,Map as MapIcon} from 'lucide-react'
import type {MapNode} from './WorldMap'
import {groupRegions} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {locale,tr} from '@/lib/i18n'
import {Flag} from './NodeIcons'
export type MapProps={nodes:MapNode[];region:string;onRegion:(code:string)=>void;viewSwitch?:ReactNode;toolsHost?:HTMLElement|null}
let request:Promise<typeof import('./WorldMap')>|undefined
export function loadMap(){return request??=import('./WorldMap').catch(error=>{request=undefined;throw error})}
class MapBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?this.props.fallback:this.props.children}
}
function RegionBar({nodes,region,onRegion,toolsHostRef,expanded,onExpanded}:{nodes:MapNode[];region:string;onRegion:(code:string)=>void;toolsHostRef:(node:HTMLDivElement|null)=>void;expanded:boolean;onExpanded:()=>void}){
 const regions=useMemo(()=>groupRegions(nodes),[nodes])
 const language=locale()
 const listRef=useRef<HTMLDivElement>(null),measureRef=useRef<HTMLDivElement>(null),moreRef=useRef<HTMLButtonElement>(null),menuRef=useRef<HTMLDivElement>(null)
 const [visibleCount,setVisibleCount]=useState(Math.min(6,regions.length)),[moreOpen,setMoreOpen]=useState(false),[search,setSearch]=useState('')
 useLayoutEffect(()=>{
  const list=listRef.current,measure=measureRef.current
  if(!list||!measure)return
  const update=()=>{
   const buttons=[...measure.querySelectorAll('button')]
   const widths=buttons.map(button=>button.getBoundingClientRect().width)
   const available=list.clientWidth,gap=7,max=Math.min(6,regions.length)
   let count=0
   for(let candidate=max;candidate>=0;candidate--){
    const needsMore=candidate<regions.length
    const used=widths[0]+widths.slice(1,candidate+1).reduce((sum,width)=>sum+width,0)+(needsMore?widths.at(-1)!:0)+gap*(candidate+(needsMore?1:0))
    if(used<=available){count=candidate;break}
   }
   setVisibleCount(count)
   if(count===regions.length)setMoreOpen(false)
  }
  update()
  const observer=new ResizeObserver(update)
  observer.observe(list)
  return()=>observer.disconnect()
 },[regions,language])
 const visible=regions.slice(0,visibleCount)
 const selected=regions.find(item=>item.code===region)
 if(selected&&!visible.some(item=>item.code===region)&&visible.length)visible[visible.length-1]=selected
 const visibleCodes=new Set(visible.map(item=>item.code))
 const hidden=regions.filter(item=>!visibleCodes.has(item.code))
 useEffect(()=>{
  if(!moreOpen)return
  const dismiss=(event:PointerEvent)=>{if(!menuRef.current?.contains(event.target as Node)&&!moreRef.current?.contains(event.target as Node))setMoreOpen(false)}
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setMoreOpen(false);moreRef.current?.focus()}}
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape)
  requestAnimationFrame(()=>menuRef.current?.querySelector<HTMLInputElement>('input')?.focus()??menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus())
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape)}
 },[moreOpen])
 const choose=(code:string)=>{
  onRegion(code);setMoreOpen(false);setSearch('')
  requestAnimationFrame(()=>[...listRef.current?.querySelectorAll<HTMLButtonElement>('button[data-region]')??[]].find(button=>button.dataset.region===code)?.focus())
 }
 const regionButton=(item:(typeof regions)[number])=><button key={item.code} data-region={item.code} onClick={()=>choose(item.code)} aria-pressed={region===item.code}>{item.code.length===2&&<Flag code={item.code}/>}<span>{countryName(item.code)}</span><small>{item.total}</small></button>
 const menuItems=regions.filter(item=>countryName(item.code).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())||item.code.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
 return <div className="home-region-bar" role="group" aria-label={tr('地区快速筛选')}>
  <span className="home-region-label">{tr('地区')}</span>
  <div className="home-region-list" ref={listRef}>
   <button onClick={()=>choose('all')} aria-pressed={region==='all'}>{tr('所有地区')} <small>{nodes.length}</small></button>
   {visible.map(regionButton)}
   {hidden.length>0&&<button ref={moreRef} type="button" className="home-region-more" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={()=>{setSearch('');setMoreOpen(value=>!value)}}>{tr('更多地区')} <small>{hidden.length}</small><ChevronDown size={14} aria-hidden="true"/></button>}
  </div>
  <div className="home-map-tools" ref={toolsHostRef}/>
  <button type="button" className="home-map-toggle" aria-expanded={expanded} aria-controls="home-map-canvas" onClick={onExpanded}><MapIcon size={16} aria-hidden="true"/>{tr(expanded?'收起地图':'展开地图')}</button>
  <div className="home-region-measure" ref={measureRef} aria-hidden="true">
   <button tabIndex={-1}>{tr('所有地区')} <small>{nodes.length}</small></button>
   {regions.map(item=><button key={item.code} tabIndex={-1}>{item.code.length===2&&<Flag code={item.code}/>}<span>{countryName(item.code)}</span><small>{item.total}</small></button>)}
   <button tabIndex={-1}>{tr('更多地区')} <small>{regions.length}</small><ChevronDown size={14}/></button>
  </div>
  {moreOpen&&hidden.length>0&&<div className="home-region-menu" ref={menuRef} role="dialog" aria-label={tr('选择地区')}>
   {regions.length>10&&<input type="search" aria-label={tr('搜索地区')} placeholder={tr('搜索地区')} value={search} onChange={event=>setSearch(event.target.value)}/>}
   <div className="home-region-menu-list">{menuItems.map(item=><button key={item.code} type="button" aria-pressed={region===item.code} onClick={()=>choose(item.code)}>{item.code.length===2&&<Flag code={item.code}/>}<span>{countryName(item.code)}</span><small>{item.total}</small>{region===item.code&&<Check size={15} aria-hidden="true"/>}</button>)}{menuItems.length===0&&<p>{tr('没有匹配的地区')}</p>}</div>
  </div>}
 </div>
}
export function MapPanel({nodeSnapshot,region,onRegion,viewSwitch,pendingNodes=false,expanded,onExpanded}:{nodeSnapshot:string;viewSwitch:ReactNode;pendingNodes?:boolean;expanded:boolean;onExpanded:()=>void}&Omit<MapProps,'nodes'>){
 const nodes=useMemo(()=>JSON.parse(nodeSnapshot) as MapNode[],[nodeSnapshot])
 const [Map,setMap]=useState<ComponentType<MapProps>|null>(null),[state,setState]=useState<'loading'|'slow'|'failed'|'ready'>('loading'),[attempt,setAttempt]=useState(0)
 const [toolsHost,setToolsHost]=useState<HTMLDivElement|null>(null)
 useEffect(()=>{
  if(!expanded)return
  let active=true
  const slow=setTimeout(()=>{if(active)setState('slow')},3000)
  const timeout=setTimeout(()=>{if(active)setState('failed')},15000)
  loadMap().then(module=>{if(active){setMap(()=>module.WorldMap);setState('ready')}},()=>{if(active)setState('failed')}).finally(()=>{clearTimeout(slow);clearTimeout(timeout)})
  return()=>{active=false;clearTimeout(slow);clearTimeout(timeout)}
 },[attempt,expanded])
 const fallback=(failed:boolean)=><section className="map-placeholder explorer-map" aria-label={tr('全球节点分布')}>
  <div className="map-loading-message" role={failed?'alert':'status'}><Globe size={40} aria-hidden="true"/><p>{failed?tr('地图暂时无法加载'):state==='slow'?tr('地图加载较慢，节点列表仍可使用'):tr('地图加载中…')}</p>{failed&&<div><button onClick={()=>{setMap(null);setState('loading');setAttempt(n=>n+1)}}>{tr('重试地图')}</button><button onClick={()=>location.reload()}>{tr('刷新页面')}</button></div>}</div>
  <div className="explorer-footer"><div className="region-list"><button onClick={()=>onRegion('all')} aria-label={tr('所有地区')} aria-pressed={region==='all'}><Globe size={16}/></button>{groupRegions(nodes).map(r=><button key={r.code} data-region={r.code} aria-pressed={region===r.code} onClick={()=>onRegion(r.code)}>{countryName(r.code)} <small>{r.total}</small></button>)}</div></div>
 </section>
 return <div className="map-frame" data-expanded={expanded}>
  <RegionBar nodes={nodes} region={region} onRegion={onRegion} toolsHostRef={setToolsHost} expanded={expanded} onExpanded={onExpanded}/>
  {expanded&&<div id="home-map-canvas"><MapBoundary key={attempt} fallback={fallback(true)}>{Map&&state==='ready'?<Map nodes={nodes} region={region} onRegion={onRegion} viewSwitch={viewSwitch} toolsHost={toolsHost}/>:fallback(state==='failed')}</MapBoundary></div>}
  {pendingNodes&&<span className="map-data-notice" role="status">{tr('等待节点数据')}</span>}
 </div>
}
