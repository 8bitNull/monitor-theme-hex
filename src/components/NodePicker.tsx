import {useEffect,useRef,useState} from 'react'
import {ChevronDown,Check,X,Search} from 'lucide-react'
import type {Node} from '@/lib/api'
import {tr} from '@/lib/i18n'
import {Flag} from './NodeIcons'
import {Status} from './NodeIdentity'
import {countryName} from '@/lib/regionNames'
import {searchNodes} from '@/lib/nodeSearch'
import {MobileSheet} from './ui/mobile-sheet'
import '../styles/mobile-facts-refinement.css'
export function NodePicker({node,nodes,onSwitch}:{node:Node;nodes:Node[];onSwitch:(id:number)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');const trigger=useRef<HTMLButtonElement>(null),dialog=useRef<HTMLDialogElement>(null)
 const [mobile,setMobile]=useState(()=>typeof window!=='undefined'&&matchMedia('(max-width:720px)').matches)
 useEffect(()=>{const media=matchMedia('(max-width:720px)'),update=()=>setMobile(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[])
 useEffect(()=>{if(!open||mobile)return;const el=dialog.current!,button=trigger.current!,rect=button.getBoundingClientRect();el.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-432))}px`;el.style.top=`${Math.min(rect.bottom+8,innerHeight-320)}px`;const overflow=document.body.style.overflow;el.showModal();document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=overflow;if(button.isConnected)button.focus({preventScroll:true})}},[open,mobile])
 const [titleExpanded,setTitleExpanded]=useState(false),[titleLong,setTitleLong]=useState(false);
 const titleText=useRef<HTMLSpanElement>(null);
 useEffect(()=>{const el=titleText.current;if(!el)return;const measure=()=>{if(!titleExpanded)setTitleLong(el.scrollHeight>el.clientHeight+1)};measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect()},[node.name,titleExpanded]);
 const matches=searchNodes(nodes,query)
 const groups=new Map<string,Node[]>()
 for(const item of matches){const name=item.group?.trim()||tr('未分组');if(!groups.has(name))groups.set(name,[]);groups.get(name)!.push(item)}
 const currentGroup=node.group?.trim()||tr('未分组')
 const grouped=[...groups].sort(([a],[b])=>Number(b===currentGroup)-Number(a===currentGroup)||a.localeCompare(b)).map(([name,items])=>[name,items.sort((a,b)=>Number(b.id===node.id)-Number(a.id===node.id))] as const)
 return <><h2><button type="button" ref={trigger} className="node-picker-trigger" aria-label={tr('切换节点')} aria-describedby={`node-title-${node.id}`} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setQuery('');setOpen(true)}}>{node.country&&<Flag code={node.country}/>}<span className="node-picker-title-stack"><span id={`node-title-${node.id}`} ref={titleText} className={`node-title-text${titleExpanded?" expanded":""}`} title={node.name}>{node.name}</span><small className="node-picker-trigger-region">{countryName(node.country)}</small></span><ChevronDown size={16}/></button></h2>{titleLong&&<button type="button" className="detail-title-expand" aria-expanded={titleExpanded} onClick={()=>setTitleExpanded(v=>!v)}>{titleExpanded?tr("收起名称"):tr("展开名称")}</button>}
 {open&&mobile&&<MobileSheet title={tr('切换节点')} onClose={()=>setOpen(false)} search={nodes.length>8?<label className="ma-route-search"><Search size={17}/><input type="search" aria-label={tr('搜索节点')} placeholder={tr('搜索节点')} value={query} onChange={e=>setQuery(e.target.value)}/></label>:undefined}>
  <div className="node-picker-list">{grouped.length?grouped.map(([name,items])=><section className="node-picker-group" key={name} aria-label={name}><h3>{name}</h3>{items.map(n=><button type="button" key={n.id} aria-current={n.id===node.id?'true':undefined} onClick={()=>{setOpen(false);if(n.id!==node.id)onSwitch(n.id)}}>{n.country&&<Flag code={n.country}/>}<span className="node-picker-row-name"><strong>{n.name}</strong><small>{countryName(n.country)}{n.id===node.id?` · ${tr('当前节点')}`:''}</small></span><Status node={n}/>{n.id===node.id&&<Check size={15}/>}</button>)}</section>):<p>{tr('没有符合条件的节点')}</p>}</div>
 </MobileSheet>}
 {open&&!mobile&&<dialog ref={dialog} className="node-picker" aria-label={tr('切换节点')} onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)setOpen(false)}}}>
 <div className="node-picker-heading"><strong>{tr('切换节点')}</strong><button type="button" aria-label={tr('关闭')} onClick={()=>setOpen(false)}><X size={18}/></button></div>
 {nodes.length>8&&<label className="node-picker-search"><Search size={15}/><input type="search" aria-label={tr('搜索节点')} placeholder={tr('搜索节点')} value={query} onChange={e=>setQuery(e.target.value)}/></label>}
 <div className="node-picker-list">{matches.length?matches.map(n=><button key={n.id} aria-current={n.id===node.id?'true':undefined} onClick={()=>{setOpen(false);if(n.id!==node.id)onSwitch(n.id)}}>{n.country&&<Flag code={n.country}/>}<span>{n.name}</span><Status node={n}/>{n.id===node.id&&<Check size={15}/>}</button>):<p>{tr('没有符合条件的节点')}</p>}</div>
 </dialog>}</>
}
