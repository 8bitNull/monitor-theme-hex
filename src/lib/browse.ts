import {liveMetrics, nodeState} from './freshness.ts'
import {resolveProbe} from './nodeProbes.ts'
import { regionKey } from './groups.ts'
import type { Node } from './api.ts'
import { getPing, summarizePing } from './ping.ts'
import { isRecentPingSample } from './pingRecency.ts'
import { trafficUsed } from './traffic.ts'
import { locale } from './i18n.ts'
export const sortLabels = { default: '后台默认', name: '名称', status: '在线状态', cpu: 'CPU', memory: '内存', disk: '硬盘', upload: '上传速度', download: '下载速度', traffic: '流量用量 / 总额度', latency: '所选线路延迟', loss: '24h 丢包', expiry: '到期时间' }
export const tableColumnLabels:Record<string,string>={cpu:'CPU',memory:'内存',disk:'硬盘',upload:'上传速度',download:'下载速度',latency:'延迟',loss:'丢包率',probe:'探测线路',traffic:'流量用量 / 总额度',expiry:'到期时间',connections:'TCP／UDP 连接数',uptime:'在线时长',system:'系统信息',country:'地区',billing:'费用与账期',todayTraffic:'今日流量',load:'系统负载',swap:'Swap 使用率',processes:'进程数',lastSeen:'最近上报时间'}
export const availableTableColumns=Object.keys(tableColumnLabels)
export type SortKey = keyof typeof sortLabels
export type Browse = { query: string; status: string; region: string; sort: SortKey; direction: 'asc' | 'desc'; view: 'cards' | 'table'; probe: string; columns: string[]; mobileColumns: string[]; columnsVersion: number; tableLayout: 'grouped'|'separate'; mobileTableLayout: 'grouped'|'separate' }
export const defaultBrowse: Browse = { query: '', status: 'all', region: 'all', sort: 'default', direction: 'asc', view: 'cards', probe: 'auto', columnsVersion: 5, tableLayout:'grouped', mobileTableLayout:'grouped', mobileColumns: ['cpu','latency'], columns: ['cpu', 'memory', 'disk', 'upload', 'download', 'traffic', 'latency', 'loss', 'probe', 'expiry'] }
export function normalizeBrowse(input:unknown): Browse {
  const v=input && typeof input==='object' && !Array.isArray(input)?input as Record<string,unknown>:{}
  const columns=(value:unknown,fallback:string[],mobile=false)=>{
    if(!Array.isArray(value))return fallback
    const selected=[...value]
    const oldCompact=mobile&&selected.length===2&&selected.includes('cpu')&&selected.includes('latency')
    if(Number(v.columnsVersion)<5 || v.columnsVersion===undefined){if(selected.includes('latency')&&!oldCompact)selected.push('loss','probe')}
    return availableTableColumns.filter(c=>selected.includes(c))
  }
  const layout=(key:string,field:string)=>v[key]==='grouped'||v[key]==='separate'?v[key]:Array.isArray(v[field])?'separate':'grouped'
  return {...defaultBrowse,query:typeof v.query==='string'?v.query:'',status:['all','online','offline','pending'].includes(String(v.status))?v.status as string:'all',region:typeof v.region==='string'?v.region:'all',sort:Object.hasOwn(sortLabels,String(v.sort))?v.sort as SortKey:'default',direction:v.direction==='desc'?'desc':'asc',view:v.view==='table'?'table':'cards',probe:typeof v.probe==='string'?v.probe:'auto',columns:Array.isArray(v.columns)&&![2,3,4,5].includes(Number(v.columnsVersion))?columns([...(v.columns as unknown[]),'traffic'],defaultBrowse.columns):columns(v.columns,defaultBrowse.columns),mobileColumns:columns(v.mobileColumns,defaultBrowse.mobileColumns,true),tableLayout:layout('tableLayout','columns'),mobileTableLayout:layout('mobileTableLayout','mobileColumns')}
}
export function readBrowse(): Browse {
  try {
    const v=JSON.parse(sessionStorage.getItem('monitor-next-browse-v1')||'{}')
    let table:Record<string,unknown>={}
    try {const stored=JSON.parse(localStorage.getItem('monitor-next-table-columns-v1')||'null');if(stored&&typeof stored==='object'&&!Array.isArray(stored)){const valid=normalizeBrowse(stored);table={columns:valid.columns,mobileColumns:valid.mobileColumns,tableLayout:valid.tableLayout,mobileTableLayout:valid.mobileTableLayout,columnsVersion:valid.columnsVersion}}}catch{/* Optional storage must not block session preferences. */}
    const normalized=normalizeBrowse({...v,...table})
    try { if(v && v.columnsVersion!==5 && (Array.isArray(v.columns)||Array.isArray(v.mobileColumns)) && !sessionStorage.getItem('monitor-next-table-v3-backup')) sessionStorage.setItem('monitor-next-table-v3-backup',JSON.stringify({columns:v.columns,mobileColumns:v.mobileColumns,columnsVersion:v.columnsVersion,sort:v.sort,direction:v.direction})) } catch { /* Backup storage must not discard readable preferences. */ }
    return normalized
  } catch { return {...defaultBrowse} }
}
export function tableColumns(columns:string[],grouped:boolean,mobile:boolean):string[] {
  const keys=['name',...(!grouped&&!mobile?['status']:[]),...columns]
  if(!grouped)return keys
  let speed=false
  return keys.flatMap(key=>key==='upload'||key==='download'?(speed?[]:(speed=true,['speed'])):[key]).sort((a,b)=>['name','status','cpu','memory','disk','speed',...availableTableColumns.filter(k=>!['cpu','memory','disk'].includes(k))].indexOf(a)-['name','status','cpu','memory','disk','speed',...availableTableColumns.filter(k=>!['cpu','memory','disk'].includes(k))].indexOf(b))
}
export function tablePreset(preset:'overview'|'network'|'billing',mobile:boolean):Partial<Browse> {
  const columns=preset==='network'?['upload','download','latency']:preset==='billing'?['traffic','expiry']:mobile?defaultBrowse.mobileColumns:defaultBrowse.columns
  return mobile?{mobileColumns:[...columns],mobileTableLayout:'grouped'}:{columns:[...columns],tableLayout:'grouped'}
}
const regionNames = new Intl.DisplayNames(['zh-CN'], { type: 'region' })
const englishRegions = new Intl.DisplayNames(['en'], { type: 'region' })
function englishRegion(code: string) { try { return englishRegions.of(code.toUpperCase()) || code } catch { return code } }
export function regionName(code: string) { try { return regionNames.of(code.toUpperCase()) || code } catch { return code } }
export function primaryPing(id: number, probe: string) {
  probe = resolveProbe(id, probe)
  const snapshot = getPing(id)
  if (!snapshot?.data) return undefined
  const stats = summarizePing(snapshot.data)
  return probe === 'auto' ? stats[0] : stats.find(p => String(p.id) === probe)
}
export function sortValue(n: Node, key: SortKey, probe: string): number | string | null {
  const m = liveMetrics(n)
  switch (key) {
    case 'name': return n.name
    case 'status': return n.online ? 1 : 0
    case 'cpu': return m?.cpu ?? null
    case 'memory': return m && m.mem_total > 0 ? Math.min(100, m.mem_used / m.mem_total * 100) : null
    case 'disk': return m && m.disk_total > 0 ? Math.min(100, m.disk_used / m.disk_total * 100) : null
    case 'upload': return m?.net_tx ?? null
    case 'download': return m?.net_rx ?? null
    case 'traffic': return trafficUsed(n)
    case 'expiry': { const date = n.expires_at ? Date.parse(n.expires_at) : NaN; return Number.isFinite(date) ? date : null }
    case 'latency':
    case 'loss': {
      const snapshot = getPing(n.id), ping = primaryPing(n.id, probe)
      return !snapshot?.failed && snapshot?.updatedAt && Date.now() - snapshot.updatedAt < 120000 && ping && isRecentPingSample(ping.latest.ts) ? key==='loss'?ping.loss:ping.latest.latency : null
    }
    default: return n.sort
  }
}
export function matchesStatus(node: Node, status: string): boolean {
  switch (status) {
    case 'online': return node.online
    case 'offline': return !node.online
    case 'pending': { const state=nodeState(node); return state==='stale'||state==='missing' }
    default: return true
  }
}
export function browseNodes(nodes: Node[], options: Browse): Node[] {
  const q = options.query.trim().toLocaleLowerCase()
  const keys = new Map(nodes.map(n=>[n.id,sortValue(n,options.sort,options.probe)]))
  return nodes.filter(n => matchesStatus(n, options.status) && (options.region === 'all' || regionKey(n.country) === options.region) && [n.name, n.country, regionName(n.country), englishRegion(n.country), n.os, n.arch].join(' ').toLocaleLowerCase().includes(q)).sort((a, b) => {
    const fallback = a.sort - b.sort || a.id - b.id
    if (options.sort === 'default') return fallback
    const av = keys.get(a.id)!, bv = keys.get(b.id)!
    if (av === null || bv === null) return av === bv ? fallback : av === null ? 1 : -1
    const diff = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv, locale(), { numeric: true }) : Number(av) - Number(bv)
    return (options.direction === 'asc' ? diff : -diff) || fallback
  })
}
