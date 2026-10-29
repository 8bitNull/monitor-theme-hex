import {useEffect,useRef} from 'react'
import {X} from 'lucide-react'
import {Select} from './ui/select'
import {tr} from '@/lib/i18n'
import {countryName} from '@/lib/regionNames'
import {groupRegions} from '@/lib/groups'
import type {MapTrafficNode} from '@/lib/mapTraffic'
import type {MapStatusFilter} from '@/lib/mapInteractions'
import '@/styles/map-interactions.css'
const statuses=[['online','在线'],['offline','离线'],['attention','需关注'],['probe','探测异常']] as const
export function MapStatusLegend({filter,onChange,mobile=false}:{filter:MapStatusFilter;onChange:(filter:MapStatusFilter)=>void;mobile?:boolean}){
 return <div className={`map-state-legend ${mobile?'mm-map-legend':''}`} data-map-overlay role="group" aria-label={tr('地图状态')} title={tr('在线状态与最近探测健康独立，24h 丢包为历史统计')}>
  {statuses.filter(([key])=>!mobile||key!=='attention').map(([key,label])=><button key={key} data-tone={key==='online'?'good':key==='attention'?'mixed':key} aria-pressed={filter===key} onClick={()=>onChange(filter===key?'all':key)}><i/>{tr(label)}</button>)}
  {filter!=='all'&&<button className="map-filter-clear" aria-label={tr('清除地图状态筛选')} onClick={()=>onChange('all')}><X size={12}/></button>}
 </div>
}
export function MapQuickSelect({nodes,region,onSelect,compact=false}:{nodes:MapTrafficNode[];region:string;onSelect:(code:string)=>void;compact?:boolean}){
 if(compact)return <div className="map-quick-select map-region-dropdown" data-map-overlay role="group" aria-label={tr('地区速选')}><Select aria-label={tr('地图地区')} value={region} onChange={e=>onSelect(e.target.value)}><option value="all">{tr('所有地区')} · {nodes.length}</option>{groupRegions(nodes).map(r=><option key={r.code} value={r.code}>{countryName(r.code)} · {r.total}</option>)}</Select></div>
 return <div className="map-quick-select" data-map-overlay role="group" aria-label={tr('地区速选')}>
  <button aria-pressed={region==='all'} onClick={()=>onSelect('all')}>{tr('所有地区')} · {nodes.length}</button>
  {groupRegions(nodes).map(r=><button key={r.code} aria-pressed={region===r.code} onClick={()=>onSelect(r.code)}>{countryName(r.code)} · {r.total}</button>)}
 </div>
}
export type RegionChoice={code:string;total:number}
export function MapRegionChooser({groupId,members,x,y,width,top=8,bottom,onChoose,onClose}:{groupId:string;members:RegionChoice[];x:number;y:number;width:number;top?:number;bottom:number;onChoose:(code:string)=>void;onClose:()=>void}){
 const root=useRef<HTMLDivElement>(null),close=useRef(onClose)
 useEffect(()=>{close.current=onClose})
 useEffect(()=>{
  const trigger=document.activeElement as HTMLElement|null
  root.current?.querySelector<HTMLButtonElement>('[data-member]')?.focus({preventScroll:true})
  const outside=(e:PointerEvent)=>{
   if(root.current?.contains(e.target as globalThis.Node))return
   const trigger=e.target instanceof Element?e.target.closest('.map-region-group'):null
   if(trigger?.getAttribute('data-members')!==groupId)close.current()
  }
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current();trigger?.focus({preventScroll:true})}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key)}
 },[groupId])
 const panelWidth=Math.min(224,Math.max(100,width-16)),height=Math.min(40+members.length*44,Math.max(44,bottom-top))
 let left=Math.max(8,Math.min(width-panelWidth-8,x-panelWidth/2)),panelTop=Math.max(top,Math.min(bottom-height,y+24))
 // A short overview can clamp the dialog over its own toggle. Prefer the space
 // above or beside the anchor so clicking the geographic group still closes it.
 if(panelTop<y+18&&panelTop+height>y-18){
  if(y-height-24>=top)panelTop=y-height-24
  else if(x-panelWidth-24>=8)left=x-panelWidth-24
  else if(x+panelWidth+24<=width-8)left=x+24
 }
 return <div ref={root} className="map-region-chooser" role="dialog" aria-label={tr('选择地区')} style={{left,top:panelTop,width:panelWidth,maxHeight:height}}>
  <div><strong>{tr('选择地区')}</strong><button aria-label={tr('关闭地区选择')} onClick={onClose}><X size={16}/></button></div>
  {members.map(m=><button key={m.code} data-member onClick={()=>onChoose(m.code)}>{countryName(m.code)}<span>{tr('{0} 个节点',m.total)}</span></button>)}
 </div>
}
