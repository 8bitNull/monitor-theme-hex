import {expiring,quotaWarning} from '@/lib/billingReminders'
import {useCallback,useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore,type Dispatch,type SetStateAction} from 'react'
import {ArrowLeft,ArrowDown,ArrowUp,BarChart3,ChevronRight,LayoutGrid,Search,Server,Settings2,SlidersHorizontal,X} from 'lucide-react'
import type {Node} from '@/lib/api'
import type {Preferences} from '@/lib/appearance'
import type {MobilePreferences} from '@/lib/mobilePreferences'
import {mobileDefaults} from '@/lib/mobilePreferences'
import {tr,locale,getLanguage,setLanguage} from '@/lib/i18n'
import {adaptiveRate,bytes,daysUntil,osName,percent,relativeTime,uptime} from '@/lib/format'
import {liveMetrics,nodeState} from '@/lib/freshness'
import {countryName} from '@/lib/regionNames'
import {groupRegions,regionKey,UNKNOWN_REGION} from '@/lib/groups'
import {trafficUsage} from '@/lib/traffic'
import {usePing} from '@/lib/usePing'
import {resolveProbe,useNodeProbe} from '@/lib/nodeProbes'
import {getPing,pingRevision,subscribePing,watchPing,probeCatalog,summarizePing} from '@/lib/ping'
import {isRecentPingSample} from '@/lib/pingRecency'
import {Flag} from './NodeIcons'
import {Status} from './NodeIdentity'
import {LoadAlertTile,LoadRecords} from './LoadAlertTile'
import {MobileSheet} from './ui/mobile-sheet'
import {MobileUpdates,useMobileVersions,hasMobileUpdates} from './MobileUpdates'
import '@/styles/mobile-refinement.css'
import type {LoadAlert} from '@/lib/loadAlerts'
import {homePage,type HomePage} from '@/lib/navigation'
import manifest from '../../theme.json'
import {MobileMapPage} from './MobileMapPage'
import {readMapState,writeMapState,type MapCamera} from '@/lib/mobileMap'

type Page=HomePage
type Filter={status:string;region:string;group:string;sort:string}
const empty:Filter={status:'all',region:'all',group:'all',sort:'default'}
function readMobileBrowse(){try{const value=JSON.parse(sessionStorage.getItem('hex-mobile-browse')||'{}');return {query:typeof value.query==='string'?value.query:'',filter:{...empty,...value.filter}}}catch{return {query:'',filter:empty}}}
const regionLabel=(code:string)=>code===UNKNOWN_REGION?tr('未知地区'):countryName(code)
function matches(n:Node,f:Filter,query:string){return (f.status==='all'||f.status==='online'&&n.online||f.status==='offline'&&!n.online||f.status==='high'&&(liveMetrics(n)?.cpu??0)>=85||f.status==='expiry'&&expiring(n)||f.status==='quota'&&quotaWarning(n))&&(f.region==='all'||regionKey(n.country)===f.region)&&(f.group==='all'||(n.group??'')===f.group.slice(1))&&`${n.name} ${n.group??''} ${n.os} ${regionLabel(regionKey(n.country))}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())}
function Meter({label,value}:{label:string;value:number|null}){return <div className="ma-meter"><div><span>{label}</span><b>{value===null?'—':value.toFixed(1)}{value!==null&&<small>%</small>}</b></div><div className="ma-track" data-hot={value!==null&&value>=85}><i style={{width:`${Math.max(0,Math.min(100,value??0))}%`}}/></div></div>}
function CompactNode({node,prefs,detailed,onOpen}:{node:Node;prefs:Preferences;detailed:boolean;onOpen:(id:number,section?:'latency',probe?:number)=>void}){
 const {ref,snapshot,retry}=usePing(node.id),choice=useNodeProbe(node.id,prefs.probe)
 const stats=snapshot?.data?summarizePing(snapshot.data):[]
 const selected=choice.probe==='auto'?stats[0]:stats.find(s=>String(s.id)===choice.probe)
 const m=liveMetrics(node),state=nodeState(node),days=daysUntil(node.expires_at)
 const recent=!!selected&&isRecentPingSample(selected.latest.ts)&&!snapshot?.failed
 const routeCaption=selected?`${selected.name}${!recent?` · ${snapshot?.failed?tr('更新失败 · 上次数据'):tr('较旧记录')} · ${tr('延迟')}`:''}`:snapshot?.failed?tr('暂不可用 · 自动重试'):snapshot?.data?tr('无该线路记录'):tr('正在读取探测记录…')
 const info=prefs.mobileInfoMode==='custom'?(prefs.mobileCardInfo??prefs.cardInfo):prefs.cardInfo
 return <div ref={ref} className="ma-node" data-compact={!detailed} data-state={state}><button data-node-id={node.id} onClick={()=>onOpen(node.id)} aria-label={tr('查看 {0}',node.name)}>
  <div className="ma-node-head"><span className="ma-flag">{node.country?(prefs.icons?<Flag code={node.country}/>:node.country):<Server size={19}/>}</span><span className="ma-identity"><strong>{node.name}</strong><small>{osName(node.os)}{node.group&&` · ${node.group}`}</small></span><Status node={node}/></div>
  {node.online?<div className="ma-meters"><Meter label="CPU" value={m?.cpu??null}/><Meter label={tr('内存')} value={m?percent(m.mem_used,m.mem_total):null}/></div>:<p className="ma-notice muted">{tr('最近上报时间')}<br/>{node.last_seen>0?<time dateTime={new Date(node.last_seen*1000).toISOString()} title={new Date(node.last_seen*1000).toLocaleString(locale())}>{relativeTime(node.last_seen)} · {new Date(node.last_seen*1000).toLocaleString(locale())}</time>:tr('上次上报时间未知')}</p>}
  {state==='stale'&&<p className="ma-notice muted">{tr('数据已过期')}</p>}{state==='missing'&&<p className="ma-notice muted">{tr('等待首次上报')}</p>}
  {m&&m.cpu>=85&&<p className="ma-notice">{tr('高负载')} · CPU {m.cpu.toFixed(1)}%</p>}
  {info.expiry&&days!==null&&days<=7&&<p className="ma-notice">{days<0?tr('已到期'):days===0?tr('今日到期'):tr('剩余 {0} 天',days)}</p>}
  {info.traffic&&node.traffic_limit>0&&trafficUsage(node).value>=node.traffic_limit&&<p className="ma-notice">{tr('流量额度已用尽')}</p>}
  {detailed&&(info.traffic||(m&&(info.uptime||info.connections)))&&<div className="ma-extra">{info.traffic&&<span>{tr('本月用量')} {bytes(trafficUsage(node).value)}</span>}{info.uptime&&m&&<span>{tr('在线时长')} {uptime(m.uptime)}</span>}{info.connections&&m&&<span>TCP {m.tcp} · UDP {m.udp}</span>}</div>}
 </button>{node.online&&<><div className="ma-net"><span><ArrowUp size={12}/><b>{m?adaptiveRate(m.net_tx):'—'}</b></span><span><ArrowDown size={12}/><b>{m?adaptiveRate(m.net_rx):'—'}</b></span>{selected?<button type="button" className="ma-network-link" title={selected.name} aria-label={tr('查看线路：{0}',selected.name)} onClick={()=>onOpen(node.id,'latency',selected.id)}>{!detailed&&<span className="ma-network-name">{selected.name}</span>}<span className="ma-network-value">{recent?(selected.latest.latency===null?tr('超时'):<><b>{Math.round(selected.latest.latency)}</b><small>ms</small></>):'—'}<ChevronRight size={12}/></span></button>:<span className="ma-network-placeholder" aria-hidden={detailed||undefined}>{!detailed&&<small className="ma-network-pending" title={routeCaption}>{routeCaption}</small>}<span>—</span></span>}</div>{(detailed||(!recent&&(snapshot?.failed||snapshot?.data)))&&<div className="ma-route-footer"><small className="ma-route-caption" role={snapshot?.failed?'alert':undefined}>{routeCaption}</small>{snapshot?.failed&&<button type="button" className="ma-route-retry" onClick={retry}>{tr('读取失败 · 重试')}</button>}</div>}</>}</div>
}
export function MobileApp({active,page,onNavigate,nodes,prefs,onPrefs,mobile,onMobile,siteName,authed,connection,lastUpdated,loadAlerts,onOpen,onAlert}:{
 active:boolean;page:Page;onNavigate:(page:Page)=>void;nodes:Node[]|null;prefs:Preferences;onPrefs:Dispatch<SetStateAction<Preferences>>;mobile:MobilePreferences;onMobile:Dispatch<SetStateAction<MobilePreferences>>;
 siteName:string;authed:boolean;connection:string;lastUpdated:number|null;loadAlerts:{events:LoadAlert[];saved:boolean};onOpen:(id:number,section?:'latency',probe?:number)=>void;onAlert:(event:LoadAlert)=>void
}){
 const [mapState,setMapState]=useState(readMapState)
 const mapRegion=useCallback((region:string)=>setMapState(s=>({...s,region})),[])
 const mapCamera=useCallback((camera:MapCamera)=>setMapState(s=>({...s,camera})),[])
 useEffect(()=>writeMapState(mapState),[mapState])
 const [query,setQuery]=useState(()=>readMobileBrowse().query),[filter,setFilter]=useState<Filter>(()=>readMobileBrowse().filter),[draft,setDraft]=useState<Filter>(empty)
 const [sheet,setSheet]=useState<'filters'|'routes'|'records'|'updates'|null>(null),[routeQuery,setRouteQuery]=useState(''),[undo,setUndo]=useState<MobilePreferences|null>(null)
 const versionState=useMobileVersions(authed&&active&&page==='settings')
 const updates=authed&&hasMobileUpdates(versionState.versions,nodes??[])
 const scroll=useRef<Record<Page,number>>({nodes:0,overview:0,settings:0,map:0})
 const previousPage=useRef(page),restoringScroll=useRef(false)
 useEffect(()=>{try{sessionStorage.setItem('hex-mobile-browse',JSON.stringify({query,filter}))}catch{/* Optional storage. */}},[query,filter])
 useEffect(()=>{if(!active)return;const record=()=>{if(!restoringScroll.current&&location.pathname==='/'&&homePage()===page)scroll.current[page]=window.scrollY};const remember=()=>{scroll.current[page]=window.scrollY};addEventListener('scroll',record,{passive:true});addEventListener('hex:before-history-navigation',remember);return()=>{removeEventListener('scroll',record);removeEventListener('hex:before-history-navigation',remember)}},[active,page])
 useLayoutEffect(()=>{
  if(!active||previousPage.current===page)return
  previousPage.current=page
  const target=scroll.current[page]
  restoringScroll.current=true
  window.scrollTo(0,target)
  let frame=requestAnimationFrame(()=>{window.scrollTo(0,target);frame=requestAnimationFrame(()=>{restoringScroll.current=false})})
  return()=>{cancelAnimationFrame(frame);restoringScroll.current=false}
 },[active,page])
 const sorted=[...(nodes??[])].sort((a,b)=>a.sort-b.sort||a.id-b.id),online=sorted.filter(n=>n.online),fresh=online.filter(n=>liveMetrics(n))
 const high=sorted.filter(n=>(liveMetrics(n)?.cpu??0)>=85),regions=groupRegions(sorted)
 const reminders=sorted.filter(n=>expiring(n)||quotaWarning(n))
 const needsAttention=sorted.filter(n=>nodeState(n)!=='live'||(liveMetrics(n)?.cpu??0)>=85)
 const groups=[...new Set(sorted.map(n=>n.group).filter((s):s is string=>!!s))]
 useSyncExternalStore(subscribePing,pingRevision)
 const ids=sorted.map(n=>n.id).join(',')
 useEffect(()=>{if(!active||!ids||(page!=='settings'&&filter.sort!=='latency'))return;return watchPing(ids.split(',').map(Number))},[active,ids,page,filter.sort])
 const probes=new Map<number,string>();for(const n of sorted){const data=getPing(n.id)?.data;if(data)for(const p of probeCatalog(data))probes.set(p.id,p.name)}
 let shown=sorted.filter(n=>matches(n,filter,query))
 if(filter.sort==='cpu')shown=shown.sort((a,b)=>(liveMetrics(b)?.cpu??-1)-(liveMetrics(a)?.cpu??-1))
 if(filter.sort==='name')shown=shown.sort((a,b)=>a.name.localeCompare(b.name,locale()))
 if(filter.sort==='latency'){const value=(n:Node)=>{const snapshot=getPing(n.id);if(!snapshot?.data||snapshot.failed)return Infinity;const stats=summarizePing(snapshot.data),probe=resolveProbe(n.id,prefs.probe),s=probe==='auto'?stats[0]:stats.find(s=>String(s.id)===probe);return s&&isRecentPingSample(s.latest.ts)&&s.latest.latency!==null?s.latest.latency:Infinity};shown=shown.sort((a,b)=>value(a)-value(b))}
 const navigate=(next:Page)=>{scroll.current[page]=window.scrollY;onNavigate(next)}
 const filterStatus=(status:string)=>{setFilter(f=>({...f,status:f.status===status?'all':status}));if(page!=='nodes')navigate('nodes')}
 const statuses=[['all',tr('全部')],['online',tr('在线')],['offline',tr('离线')],['high',tr('高负载')],['expiry',tr('到期提醒')],['quota',tr('流量提醒')]]
 const attention=[{status:'offline',label:tr('离线'),count:sorted.length-online.length},{status:'high',label:tr('高负载'),count:high.length},{status:'expiry',label:tr('到期提醒'),count:sorted.filter(expiring).length},{status:'quota',label:tr('流量提醒'),count:sorted.filter(quotaWarning).length}].filter(item=>item.count>0)
 const sorts=[['default',tr('后台默认')],['cpu',tr('负载优先')],['latency',tr('所选线路延迟')],['name',tr('名称')]]
 const activeFilters=([{key:'status',label:statuses.find(s=>s[0]===filter.status)?.[1]},{key:'region',label:regionLabel(filter.region)},{key:'group',label:filter.group.slice(1)||tr('未分组')},{key:'sort',label:sorts.find(s=>s[0]===filter.sort)?.[1]}] as const).filter(f=>filter[f.key]!==empty[f.key])
 const routeOptions=[['auto',tr('各节点首条线路')],...[...probes].map(([id,name])=>[String(id),name])].filter(([,name])=>name.toLocaleLowerCase().includes(routeQuery.trim().toLocaleLowerCase()))
 const names=[filter.status!=='all'?statuses.find(s=>s[0]===filter.status)?.[1]:null,filter.region!=='all'?regionLabel(filter.region):null,filter.group!=='all'?(filter.group.slice(1)||tr('未分组')):null].filter(Boolean)
 const total=(key:'day_rx'|'day_tx')=>sorted.reduce((sum,n)=>sum+n[key],0)
 const net=(key:'net_rx'|'net_tx')=>fresh.reduce((sum,n)=>sum+liveMetrics(n)![key],0)
 const connectionText=connection==='realtime'?tr('实时连接'):connection==='polling'?tr('轮询更新'):connection==='connecting'?tr('正在连接'):tr('连接中断 · 数据可能已过期')
 const liveStatus=<span className="ma-live" title={connectionText} data-connected={connection==='realtime'||connection==='polling'}>{lastUpdated?new Date(lastUpdated).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'}):connectionText}<small>{lastUpdated?connectionText:''}</small></span>
 return <div className="mobile-app" data-page={page} data-map-page={page==='map'||undefined} hidden={!active}>
  {page!=='map'&&<><header className="ma-header"><div><h1><span className="ma-logo">H</span><span className="ma-site-name" title={siteName}>{siteName}</span></h1></div>{page==='nodes'&&liveStatus}</header>
  {page!=='nodes'&&<div className="ma-page-heading"><h2 className="ma-page-title">{page==='overview'?tr('概览'):tr('设置')}</h2>{page==='overview'&&liveStatus}</div>}
  </>}
  {page==='map'&&<div className="mm-page-header"><button aria-label={tr('返回概览')} onClick={()=>navigate('overview')}><ArrowLeft size={21}/></button><h1>{tr('地图')}</h1></div>}
  {page==='map'?(active&&<MobileMapPage nodes={nodes} enabled={prefs.modules.map} state={mapState} updated={lastUpdated?`${new Date(lastUpdated).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit'})} · ${connectionText}`:connectionText} onRegion={mapRegion} onCamera={mapCamera} onOpen={onOpen}/>):!nodes?<div className="ma-loading" role="status">{tr('正在加载节点')}{[0,1,2].map(i=><div key={i}/>)}</div>:page==='nodes'?<>
   <div className="ma-summary"><button onClick={()=>filterStatus('online')}>{tr('在线')} <b>{online.length}/{sorted.length}</b></button><button onClick={()=>filterStatus('offline')}>{tr('离线')} <b>{sorted.length-online.length}</b></button><button onClick={()=>filterStatus('high')}>{tr('高负载')} <b>{high.length}</b></button></div>
   {attention.length>0&&<div className="ma-home-attention" role="group" aria-label={tr('需要关注')}>{attention.map(item=><button key={item.status} aria-pressed={filter.status===item.status} onClick={()=>{setFilter({...empty,status:item.status});setQuery('');window.scrollTo(0,0)}}>{item.label} <b>{item.count}</b><ChevronRight size={12} aria-hidden="true"/></button>)}</div>}
   <div className="ma-search"><label><Search size={18}/><input type="search" aria-label={tr('搜索节点')} placeholder={tr('搜索名称、地区、操作系统…')} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button aria-label={tr('清除搜索')} onClick={()=>setQuery('')}><X size={16}/></button>}</label><button className="ma-icon" aria-label={tr('筛选节点')} aria-pressed={activeFilters.length>0} onClick={()=>{setDraft(filter);setSheet('filters')}}><SlidersHorizontal size={19}/></button></div>
   {groups.length>0&&<div className="ma-business-tabs" role="group" aria-label={tr('节点分组')}>{[['all',tr('全部')],...groups.map(g=>['='+g,g]),...(sorted.some(n=>!n.group)?[['=',tr('未分组')]]:[])].map(([key,label])=><button key={key} aria-pressed={filter.group===key} onClick={()=>setFilter(f=>({...f,group:key}))}>{label}<small>{key==='all'?sorted.length:sorted.filter(n=>(n.group??'')===key.slice(1)).length}</small></button>)}</div>}
   {activeFilters.length>0&&<div className="ma-filter-tags">{activeFilters.map(f=><button key={f.key} aria-label={tr('移除筛选：{0}',f.label??'')} onClick={()=>setFilter(p=>({...p,[f.key]:empty[f.key]}))}>{f.label}<X size={13}/></button>)}<button onClick={()=>{setFilter(empty);setQuery('')}}>{tr('清除全部条件')}</button></div>}
   <div className="ma-heading"><h2>{names.length?names.join(' · '):tr('节点')}</h2><small>{tr('匹配 {0} 个节点',shown.length)}</small></div>
   <div id="mobile-node-results">{shown.map(node=><CompactNode key={node.id} node={node} prefs={prefs} detailed={mobile.detailed} onOpen={onOpen}/>)}{shown.length===0&&<div className="ma-empty"><p>{sorted.length?tr('没有符合条件的节点'):tr('还没有节点')}</p>{sorted.length>0?<>{query&&<button onClick={()=>setQuery('')}>{tr('仅清除搜索')}</button>}<button onClick={()=>{setFilter(empty);setQuery('')}}>{tr('清除全部条件')}</button></>:authed?<a href="/admin/">{tr('前往后台添加节点')}</a>:tr('请联系管理员添加节点。')}</div>}</div>
  </>:page==='overview'?<>
   <section className="ma-hero"><div>{tr('服务器运行概况')}<Server size={19}/></div><strong>{online.length}<small>/ {sorted.length} {tr('在线')}</small></strong>{(online.length<sorted.length||high.length>0)&&<div className="ma-attention-actions"><button onClick={()=>{setFilter({...empty,status:'offline'});setQuery('');navigate('nodes')}}>{tr('{0} 个离线',sorted.length-online.length)}<ChevronRight size={14}/></button><button onClick={()=>{setFilter({...empty,status:'high'});setQuery('');navigate('nodes')}}>{tr('高负载')} {high.length}<ChevronRight size={14}/></button></div>}{sorted.length>0&&needsAttention.length===0&&reminders.length===0&&<p className="ma-health-summary">{tr('当前节点运行正常，暂无到期或流量提醒。')}</p>}{sorted.length===0&&<p className="ma-health-summary-empty">{tr('还没有节点')}</p>}<div className="ma-health-track"><i style={{width:`${sorted.length?online.length/sorted.length*100:0}%`}}/></div></section>
   {needsAttention.length>0&&<><div className="ma-heading"><h2>{tr('需要关注')}</h2></div><section className="ma-panel ma-rows">{needsAttention.map(n=><button className="ma-row" key={n.id} onClick={()=>onOpen(n.id)}><span>{n.name}<small>{!n.online?tr('离线'):nodeState(n)==='stale'?tr('数据已过期'):nodeState(n)==='missing'?tr('等待数据'):tr('高负载')}</small></span><ChevronRight size={17}/></button>)}</section></>}
   {(prefs.modules.traffic||prefs.modules.speed)&&<div className="ma-stat-grid">{prefs.modules.traffic&&<section className="ma-panel"><small>{tr('今日流量')}</small><strong>{bytes(total('day_rx')+total('day_tx'))}</strong><p>↑ {bytes(total('day_tx'))}　↓ {bytes(total('day_rx'))}</p></section>}{prefs.modules.speed&&<section className="ma-panel"><small>{tr('实时网速')}</small><strong>{fresh.length?adaptiveRate(net('net_rx')+net('net_tx')):'—'}</strong><p>{fresh.length<online.length?tr('{0} 个节点暂无实时数据',online.length-fresh.length):tr('当前数据')}</p></section>}</div>}
   {reminders.length>0&&<><div className="ma-heading"><h2>{tr('到期与用量')}</h2></div><div className="ma-reminder-shortcuts">{[['expiry',tr('到期提醒'),sorted.filter(expiring).length],['quota',tr('流量提醒'),sorted.filter(quotaWarning).length]].map(([key,label,count])=><button key={key} onClick={()=>{setFilter({...empty,status:String(key)});setQuery('');navigate('nodes')}}>{label} <b>{count}</b><ChevronRight size={14}/></button>)}</div>
   <section className="ma-panel ma-rows">{reminders.map(n=><button className="ma-row" key={n.id} onClick={()=>onOpen(n.id)}><span>{n.name}<small>{expiring(n)?((daysUntil(n.expires_at)??0)<0?tr('已到期'):tr('剩余 {0} 天',daysUntil(n.expires_at)!)):''}{expiring(n)&&quotaWarning(n)?' · ':''}{quotaWarning(n)?tr('流量已用 {0}%',Math.round(trafficUsage(n).value/n.traffic_limit*100)):''}</small></span><ChevronRight size={17}/></button>)}</section></>}
   <div className="ma-heading ma-regions-heading"><div><h2>{tr('地区分布')}</h2><small>· {regions.length}</small></div>{prefs.modules.map?<button className="mm-entry" onClick={()=>navigate('map')}>{tr('查看地图')}<ChevronRight size={15}/></button>:null}</div><section className="ma-panel ma-rows">{regions.map(r=><button className="ma-row" key={r.code} onClick={()=>{setFilter({...empty,region:r.code});setQuery('');navigate('nodes')}}><span className="ma-region">{r.code!==UNKNOWN_REGION&&<Flag code={r.code}/>} {regionLabel(r.code)}</span><small>{sorted.filter(n=>regionKey(n.country)===r.code&&n.online).length}/{r.total} {tr('在线')} <ChevronRight size={15}/></small></button>)}</section>
   {prefs.modules.busiest&&(loadAlerts.events.length>0?<><div className="ma-heading"><h2>{tr('本机负载记录')}</h2></div><LoadAlertTile {...loadAlerts} available={sorted.map(n=>n.id)} onOpen={onAlert}/><p className="ma-footnote">{tr('仅记录当前浏览器打开期间观测到的高负载。')}</p></>:<button className="ma-records-entry ma-row" onClick={()=>setSheet('records')}><span>{tr('本机负载记录')}<small>{tr('仅记录此浏览器打开期间的观测')}</small></span><small>{tr('暂无高负载记录')}<ChevronRight size={16}/></small></button>)}
  </>:<>
   <div className="ma-heading"><h2>{tr('外观与显示')}</h2></div><section className="ma-panel ma-rows">
    <label className="ma-row"><span>{tr('明暗模式')}</span><select aria-label={tr('明暗模式')} value={prefs.appearance} onChange={e=>onPrefs(p=>({...p,appearance:e.target.value as Preferences['appearance']}))}><option value="system">{tr('跟随系统')}</option><option value="light">{tr('浅色')}</option><option value="dark">{tr('深色')}</option></select></label>
    <label className="ma-row"><span>{tr('节点列表')}<small>{tr('紧凑显示关键状态；详细显示流量、在线时长和连接数。')}</small></span><select aria-label={tr('节点列表')} value={mobile.detailed?'detailed':'compact'} onChange={e=>onMobile(p=>({...p,detailed:e.target.value==='detailed'}))}><option value="compact">{tr('紧凑')}</option><option value="detailed">{tr('详细')}</option></select></label>
    <label className="ma-row"><span>{tr('详情页显示资源容量')}<small>{tr('显示内存、硬盘的总容量。')}</small></span><input type="checkbox" aria-label={tr('详情页显示资源容量')} className="ma-toggle" checked={mobile.totals} onChange={e=>onMobile(p=>({...p,totals:e.target.checked}))}/></label>
   </section><div className="ma-heading"><h2>{tr('监控偏好')}</h2></div><section className="ma-panel ma-rows">
    <button className="ma-row" onClick={()=>{setRouteQuery('');setSheet('routes')}}><span>{tr('主要探测线路')}</span><small>{prefs.probe==='auto'?tr('各节点首条线路'):probes.get(Number(prefs.probe))??prefs.probe}<ChevronRight size={16}/></small></button>
    <div className="ma-row ma-history-preference"><div><label htmlFor="mobile-history-hours">{tr('新详情页默认历史范围')}</label><details className="ma-preference-help"><summary>{tr('用于新打开的详情页。')}</summary><p>{tr('仅保存在此浏览器；已有页面及链接指定范围保持不变。')}</p></details></div><select id="mobile-history-hours" value={mobile.hours} aria-label={tr('新详情页默认历史范围')} onChange={e=>onMobile(p=>({...p,hours:Number(e.target.value) as 1|6|24}))}>{[1,6,24].map(h=><option value={h} key={h}>{h}h</option>)}</select></div>
    {prefs.modules.busiest&&<button className="ma-row" onClick={()=>setSheet('records')}><span>{tr('本机负载记录')}<small>{tr('仅记录此浏览器打开期间的观测')}</small></span><small>{loadAlerts.events.length}<ChevronRight size={16}/></small></button>}
   </section><div className="ma-heading"><h2>{tr('应用')}</h2></div><section className="ma-panel ma-rows">
    <label className="ma-row"><span>Language / 语言</span><select aria-label="Language / 语言" value={getLanguage()} onChange={e=>setLanguage(e.target.value as 'zh'|'en')}><option value="zh">简体中文</option><option value="en">English</option></select></label>
    <a className="ma-row" href="/admin/"><span>{authed?tr('进入后台'):tr('登录')}</span><ChevronRight size={16}/></a>
    {authed&&<button className="ma-row" onClick={()=>setSheet('updates')}><span>{tr('版本与更新')}</span><small>{updates?<><i className="ma-update-dot"/>{tr('有新版本')}</>:versionState.busy?tr('正在检查…'):versionState.error?tr('检查未完成'):tr('查看版本')}<ChevronRight size={16}/></small></button>}
    <button className="ma-row" onClick={()=>{setUndo({...mobile});onMobile({...mobileDefaults})}}><span>{tr('恢复手机显示默认设置')}<small>{tr('仅重置列表显示、资源容量和默认历史范围')}</small></span><ChevronRight size={16}/></button>
   </section>
   <div className="ma-app-info"><strong>HEX · v{manifest.version}</strong><p>{tr('让服务器状态一目了然')}</p><a href={manifest.url} target="_blank" rel="noreferrer">{tr('项目主页')}</a></div>
  </>}
  {undo&&<div className="ma-undo" role="status"><span>{tr('已恢复手机显示默认设置')}</span><button onClick={()=>{onMobile(undo);setUndo(null)}}>{tr('撤销')}</button><button aria-label={tr('关闭')} onClick={()=>setUndo(null)}><X size={16}/></button></div>}
  {page!=='map'&&<><p className="ma-footnote">{page==='settings'?'Powered by monitor-probe':`${manifest.name} · ${manifest.version}`}</p>
  <nav className="ma-nav" aria-label={tr('主导航')}>{([{key:'nodes',label:tr('节点'),Icon:LayoutGrid},{key:'overview',label:tr('概览'),Icon:BarChart3},{key:'settings',label:tr('设置'),Icon:Settings2}] as const).map(({key,label,Icon})=><button key={key} aria-current={page===key?'page':undefined} onClick={()=>navigate(key)}><span><Icon size={21}/>{key==='settings'&&updates&&<i className="ma-update-dot" title={tr('有新版本')}/>}</span>{label}</button>)}</nav></>}
  {active&&authed&&sheet==='updates'&&<MobileUpdates state={versionState} nodes={sorted} onClose={()=>setSheet(null)}/>}
  {sheet==='records'&&<LoadRecords {...loadAlerts} available={sorted.map(n=>n.id)} onOpen={onAlert} onClose={()=>setSheet(null)}/>}
  {sheet==='filters'&&<MobileSheet title={tr('筛选节点')} onClose={()=>setSheet(null)} footer={<><button onClick={()=>setDraft(empty)}>{tr('重置')}</button><button onClick={()=>{setFilter(draft);setSheet(null);window.scrollTo(0,0)}}>{tr('显示 {0} 个节点',sorted.filter(n=>matches(n,draft,query)).length)}</button></>}>
   {([{key:'status',label:tr('状态'),options:statuses},{key:'region',label:tr('地区'),options:[['all',tr('所有地区')],...regions.map(r=>[r.code,regionLabel(r.code)])]},{key:'group',label:tr('节点分组'),options:[['all',tr('全部分组')],...groups.map(g=>['='+g,g]),...(sorted.some(n=>!n.group)?[['=',tr('未分组')]]:[])]},{key:'sort',label:tr('排序'),options:sorts}] as const).map(section=><section key={section.key}><h3>{section.label}</h3><div className="ma-chips">{section.options.map(([key,label])=><button key={key} aria-pressed={draft[section.key]===key} onClick={()=>setDraft(d=>({...d,[section.key]:key}))}>{label}</button>)}</div></section>)}
  </MobileSheet>}
  {sheet==='routes'&&<MobileSheet title={tr('主要探测线路')} onClose={()=>setSheet(null)} search={<label className="ma-route-search"><Search size={17}/><input type="search" value={routeQuery} aria-label={tr('搜索线路')} placeholder={tr('搜索线路')} onChange={e=>setRouteQuery(e.target.value)}/></label>}>
   {routeOptions.map(([id,name])=><button className="ma-row" key={id} aria-pressed={prefs.probe===id} onClick={()=>{onPrefs(p=>({...p,probe:id}));setSheet(null)}}><span>{name}</span><span>{prefs.probe===id?'✓':''}</span></button>)}
   {routeOptions.length===0&&<p className="ma-empty">{tr('无该线路记录')}</p>}
   <p className="ma-footnote">{tr('节点独立选择优先于全局线路；其余线路可在详情查看。')}</p>
  </MobileSheet>}
 </div>
}
