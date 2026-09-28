import {ExtraTableCell,extraTableColumns} from './ExtraTableCell'
import {Select} from './ui/select'
import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState,memo} from 'react'
import {createPortal} from 'react-dom'
import {ChevronLeft,ChevronRight,X} from 'lucide-react'
import {useNodeProbe} from '../lib/nodeProbes'
import {tr,locale} from '../lib/i18n'
import type {Node} from '@/lib/api'
import {type Browse,type SortKey,sortLabels,tableColumnLabels,sortValue,primaryPing,tableColumns} from '@/lib/browse'
import {usePing} from '@/lib/usePing'
import {bytes,daysUntil,FOREVER,rate} from '@/lib/format'
import {latencyBand} from '@/lib/trends'
import {countryName} from '@/lib/regionNames'
import {nodeState} from '@/lib/freshness'
import {isRecentPingSample} from '@/lib/pingRecency'
import {Status} from './NodeIdentity'
import {RemarkTags} from './RemarkTags'
import {tableGroupAttributes} from './tableColumnGroups'
function NetworkCell({node,probe,warn,high,field}:{node:Node;probe:string;warn:number;high:number;field:string}) {
 useNodeProbe(node.id,probe)
 const {ref,snapshot,retry}=usePing(node.id),ping=primaryPing(node.id,probe)
 const old=ping&&!isRecentPingSample(ping.latest.ts)
 const tone=field==='latency'&&ping&&!old&&!snapshot?.failed?latencyBand(ping.latest.latency,warn,high):undefined
 const level=tone==='good'?1:tone==='fair'?2:tone==='bad'?3:0
 return <div ref={ref} className={field==='latency'?'table-ping':'table-network-cell'} data-tone={tone}>
  <div className="table-ping-value" title={ping?`${tr('采样')}: ${new Date(ping.latest.ts*1000).toLocaleString(locale())}`:undefined}>
   {snapshot?.failed&&!ping?<button onClick={retry}>{tr('读取失败 · 重试')}</button>:!snapshot?.data?tr('读取中…'):!ping?tr('无该线路记录'):field==='probe'?<span className="table-route" title={ping.name}>{ping.name}</span>:field==='loss'?<span data-loss={ping.loss!==null&&ping.loss>0}>{ping.loss===null?'—':`${ping.loss.toFixed(1)}%`}</span>:<><strong>{ping.latest.latency===null?tr('超时'):`${Math.round(ping.latest.latency)} ms`}</strong>{level>0&&<span className="table-latency-grade" data-level={level}><span className="table-grade-bars" aria-hidden="true"/>{tr(level===1?'低':level===2?'中':'高')}</span>}</>}
  </div>
  {ping&&field==='loss'&&<small className="table-network-meta">{tr('24h 丢包')}</small>}
  {ping&&old&&<small className="table-history-note">{tr('较旧记录')}</small>}
  {ping&&snapshot?.failed&&<button type="button" className="table-history-note" onClick={retry}>{tr('读取失败 · 重试')}</button>}
 </div>
}
function Expiry({date}:{date:string|null}) {
 const days=daysUntil(date),label=days===null?(date?tr('未知'):tr('未设到期')):days<0?tr('已过期 {0} 天',-days):days===0?tr('今天到期'):tr('{0} 天后到期',days)
 return <div className="table-expiry" data-state={days===null?'unknown':days<0?'expired':days<=7?'soon':'normal'}><strong>{label}</strong>{date&&<time dateTime={date}>{date}</time>}</div>
}
function NameInfo({node,onClose}:{node:Node;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{const trigger=document.activeElement as HTMLElement|null,el=ref.current!;el.showModal();return()=>{el.close();trigger?.focus({preventScroll:true})}},[])
 return <dialog ref={ref} className="table-name-dialog" aria-labelledby="table-name-title" onCancel={onClose}><div><h2 id="table-name-title">{tr('备注')}</h2><button aria-label={tr('关闭')} onClick={onClose}><X size={18}/></button></div><p>{node.name}</p><p className="table-remark-full">{node.remark}</p></dialog>
}
function Speed({node,directions}:{node:Node;directions:string[]}) {
 return <div className="table-speed">{directions.map(key=>{const v=sortValue(node,key as SortKey,'auto');return <span role="group" key={key} data-direction={key} aria-label={`${tr(key==='upload'?'实时上行':'实时下行')} ${v===null?'—':rate(Number(v))}`}>{v===null?'—':rate(Number(v)).replace(' Mbps','')}{v!==null&&<small>Mbps</small>}</span>})}</div>
}
// Individual ping updates should not rebuild unrelated resource and identity cells.
const TableRow=memo(function TableRow({n,keys,directions,grouped,mobile,probe,warn,high,onOpen,onInfo,state,clock}:{n:Node;keys:string[];directions:string[];grouped:boolean;mobile:boolean;probe:string;warn:number;high:number;onOpen:(id:number)=>void;onInfo:(node:Node)=>void;state:ReturnType<typeof nodeState>;clock:number}) {
 const remarks=(n.remark??'').split(/[;；]/).map(text=>text.trim()).filter(Boolean)
 void clock // Minute changes refresh expiry and the age of retained history.
 return <tr data-state={state}>{keys.map((key,index)=>{
   const v=sortValue(n,key as SortKey,probe)
   return <td key={key} data-column={key} {...tableGroupAttributes(keys,index)}>{key==='name'?<div className="table-identity"><div><div className="table-name-text"><button data-node-id={n.id} className="table-node-name" onClick={()=>onOpen(n.id)} title={n.name}>{grouped&&!mobile&&<><i className="table-status-dot" aria-hidden="true"/>{state==='live'&&<span className="sr-only">{tr('在线')}</span>}</>}{n.name}</button><small>{[!keys.includes('country')?countryName(n.country):'',!keys.includes('system')?n.os:''].filter(Boolean).join(' · ')}</small></div></div>{(mobile||grouped&&state!=='live')&&<Status node={n}/>}</div>:key==='remark'?(remarks.length?<button className="table-remark" aria-label={tr('查看备注：{0}',n.name)} aria-haspopup="dialog" title={n.remark} onClick={()=>onInfo(n)}><RemarkTags texts={remarks.slice(0,3)} compact/>{remarks.length>3&&<span className="table-remark-more">+{remarks.length-3}</span>}</button>:'—'):key==='status'?<Status node={n}/>:['latency','loss','probe'].includes(key)?<NetworkCell node={n} probe={probe} warn={warn} high={high} field={key}/>:extraTableColumns.has(key)?<ExtraTableCell node={n} column={key}/>:key==='speed'?<Speed node={n} directions={directions}/>:key==='traffic'?<div className="table-traffic">{bytes(Number(v))}<small> / {Number.isFinite(n.traffic_limit)?n.traffic_limit>0?bytes(n.traffic_limit):FOREVER:'—'}</small>{Number.isFinite(n.traffic_limit)&&n.traffic_limit>0&&<progress aria-label={tr('流量额度使用率')} max={100} value={Math.min(100,Math.max(0,Number(v)/n.traffic_limit*100))}/>} {n.traffic_limit>0&&Number(v)>n.traffic_limit&&<small className="table-over-limit">{tr('已超额')}</small>}</div>:key==='expiry'?<Expiry date={n.expires_at}/>:v===null?'—':key==='upload'||key==='download'?<Speed node={n} directions={[key]}/>:<div className="table-metric">{Math.round(Number(v))}%<progress aria-label={tr(sortLabels[key as SortKey])} max={100} value={Math.min(100,Math.max(0,Number(v)))}/></div>}</td>
  })}</tr>
})
export function NodeTable({nodes,page,onPageChange,browse,onSort,onSortChange,onResetColumns,onOpen,mobile=false,warn=80,high=160}:{nodes:Node[];page:number;onPageChange:(page:number)=>void;browse:Browse;onSort:(key:SortKey)=>void;onSortChange:(sort:SortKey,direction:'asc'|'desc')=>void;onResetColumns?:()=>void;onOpen:(id:number)=>void;mobile?:boolean;warn?:number;high?:number}) {
 const [clock,tick]=useState(0),[info,setInfo]=useState<Node|null>(null),ref=useRef<HTMLDivElement>(null),[edges,setEdges]=useState({left:false,right:false}),[toolbar,setToolbar]=useState<HTMLElement|null>(null)
 useEffect(()=>{const timer=setInterval(()=>tick(value=>value+1),60000);return()=>clearInterval(timer)},[])
 const grouped=(mobile?browse.mobileTableLayout:browse.tableLayout)==='grouped'
 const showRemarkColumn=!mobile||nodes.some(node=>(node.remark??'').trim().length>0)
 const keys=useMemo(()=>[...tableColumns(browse.columns,grouped,mobile),...(showRemarkColumn?['remark']:[])],[browse.columns,grouped,mobile,showRemarkColumn])
 const directions=useMemo(()=>browse.columns.filter(k=>k==='upload'||k==='download'),[browse.columns])
 const [scrollHint,setScrollHint]=useState(()=>{try{return sessionStorage.getItem('monitor-table-scrolled')!=='1'}catch{return true}});
 useLayoutEffect(()=>{const frame=requestAnimationFrame(()=>setToolbar(mobile?null:document.querySelector<HTMLElement>('#node-results .desktop-results-toolbar .view-toolbar')));return()=>cancelAnimationFrame(frame)},[mobile])
 const openRef=useRef(onOpen);useLayoutEffect(()=>{openRef.current=onOpen},[onOpen])
 const openNode=useCallback((id:number)=>openRef.current(id),[])
 const updateEdges=useCallback(()=>{const el=ref.current;if(!el)return
  const next={left:el.scrollLeft>1,right:el.scrollLeft+el.clientWidth<el.scrollWidth-1}
  setEdges(previous=>next.left===previous.left&&next.right===previous.right?previous:next)
  if(!mobile){const right=el.getBoundingClientRect().right;el.querySelectorAll<HTMLElement>('thead th').forEach(th=>{const rect=th.getBoundingClientRect();th.toggleAttribute('data-partial',rect.left<right-1&&rect.right>right+1)})}
 },[mobile])
 const scrollColumns=(direction:-1|1)=>{const el=ref.current;if(el)el.scrollBy({left:direction*Math.round(el.clientWidth*.7),behavior:'auto'})}
 useEffect(()=>{const observer=new ResizeObserver(updateEdges);if(ref.current){observer.observe(ref.current);const table=ref.current.querySelector('table');if(table)observer.observe(table)}return()=>observer.disconnect()},[updateEdges])
 const composite=(key:string):string[]=>key==='speed'?directions:[]
 const widths=keys.map(key=>key==='name'?(mobile?136:200):key==='remark'?(mobile?120:150):key==='status'?80:['cpu','memory','disk'].includes(key)?(mobile?54:70):key==='speed'?120:key==='latency'?(mobile?80:100):key==='loss'?90:key==='probe'?150:key==='system'?200:key==='traffic'?145:extraTableColumns.has(key)?160:120)
 const pages=Math.max(1,Math.ceil(nodes.length/20));
 const changePage=(next:number)=>{onPageChange(next);requestAnimationFrame(()=>{ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({block:'start'})})}
 const scrollControls=!mobile&&(edges.left||edges.right)&&<div className="table-scroll-controls"><span>{tr('其他列')}</span><button type="button" aria-label={tr('向左查看其他列')} title={tr('向左查看其他列')} disabled={!edges.left} onClick={()=>scrollColumns(-1)}><ChevronLeft size={18}/></button><button type="button" aria-label={tr('向右查看其他列')} title={tr('向右查看其他列')} disabled={!edges.right} onClick={()=>scrollColumns(1)}><ChevronRight size={18}/></button></div>
 const resetColumns=!mobile&&onResetColumns&&<button type="button" className="table-reset-columns" onClick={onResetColumns}>{tr('恢复默认列')}</button>
 return <>{toolbar&&createPortal(<>{scrollControls}{resetColumns}</>,toolbar)}<div className="table-shell" data-left={edges.left} data-right={edges.right}><div ref={ref} className="table-scroll" onScroll={()=>{updateEdges();if(ref.current&&ref.current.scrollLeft>4){setScrollHint(false);try{sessionStorage.setItem('monitor-table-scrolled','1')}catch{/* Optional storage */}}}} tabIndex={0} role="region" aria-label={tr('节点表格，可横向滚动')}><table className="node-table" data-grouped={grouped} data-mobile={mobile} data-compact-network={mobile&&browse.columns.length===2&&browse.columns.includes("cpu")&&browse.columns.includes("latency")} style={{minWidth:widths.reduce((a,b)=>a+b,0)}}><colgroup>{keys.map((key,i)=><col key={key} style={{width:widths[i]}}/>)}</colgroup>
  <thead><tr>{keys.map((key,index)=>{if(key==='remark')return <th key={key} data-column={key} {...tableGroupAttributes(keys,index)} scope="col">{tr('备注')}</th>;const options=composite(key),active=key===browse.sort||options.includes(browse.sort)||key==='name'&&grouped&&!mobile&&browse.sort==='status',label=key==='speed'?tr('实时网速'):tr(tableColumnLabels[key]??sortLabels[key as SortKey]);return <th key={key} data-column={key} {...tableGroupAttributes(keys,index)} aria-sort={active?browse.direction==='asc'?'ascending':'descending':'none'}>{extraTableColumns.has(key)||key==='probe'?<span>{label}</span>:options.length?<Select aria-label={tr('{0}排序',label)} value={active?`${browse.sort}:${browse.direction}`:''} onChange={e=>{const [sort,dir]=e.target.value.split(':');onSortChange(sort as SortKey,dir as 'asc'|'desc')}}><option value="" disabled>{label}</option>{options.flatMap(k=>(['asc','desc'] as const).map(dir=><option value={`${k}:${dir}`} key={`${k}:${dir}`}>{tr(sortLabels[k as SortKey])} {tr(dir==='asc'?'升序':'降序')}</option>))}</Select>:<button aria-label={`${label}${key===browse.sort?browse.direction==='asc'?' ↑':' ↓':''}`} onClick={()=>onSort(key as SortKey)}>{label}<span aria-hidden="true">{key===browse.sort?browse.direction==='asc'?' ↑':' ↓':''}</span></button>}</th>})}</tr></thead>
  <tbody>{nodes.slice((page-1)*20,page*20).map(n=><TableRow key={n.id} n={n} keys={keys} directions={directions} grouped={grouped} mobile={mobile} probe={browse.probe} warn={warn} high={high} onOpen={openNode} onInfo={setInfo} state={nodeState(n)} clock={clock}/>)}</tbody>
 </table></div>{mobile&&edges.right&&scrollHint&&<p className="table-scroll-hint">{tr("左右滑动查看其余指标")}</p>}</div><nav className="table-pagination" aria-label={tr('表格分页')}><span>{tr('共 {0} 个节点 · 每页 20 个',nodes.length)}</span>{pages>1&&<div><button disabled={page===1} onClick={()=>changePage(page-1)}>{tr('上一页')}</button><label><span className="sr-only">{tr('页码')}</span><Select aria-label={tr('页码')} value={page} onChange={e=>changePage(Number(e.target.value))}>{Array.from({length:pages},(_,i)=><option key={i+1} value={i+1}>{tr('第 {0} / {1} 页',i+1,pages)}</option>)}</Select></label><button disabled={page===pages} onClick={()=>changePage(page+1)}>{tr('下一页')}</button></div>}</nav>{info&&<NameInfo node={info} onClose={()=>setInfo(null)}/>}</>
}
