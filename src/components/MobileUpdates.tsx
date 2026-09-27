import {useCallback,useEffect,useRef,useState} from 'react'
import {ChevronRight,ExternalLink} from 'lucide-react'
import {api,ApiError,type Node} from '@/lib/api'
import {compareVersion,readVersions,type Versions} from '@/lib/versions'
import {locale,tr} from '@/lib/i18n'
import {MobileSheet} from './ui/mobile-sheet'
import manifest from '../../theme.json'

export function useMobileVersions(enabled:boolean){
 const [versions,setVersions]=useState<Versions|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[checked,setChecked]=useState<Date|null>(null)
 const request=useRef<AbortController|null>(null)
 const check=useCallback(async()=>{
  request.current?.abort()
  const controller=new AbortController();request.current=controller
  const timeout=setTimeout(()=>controller.abort(),15000)
  setBusy(true);setError('');setVersions(null)
  try{const value=readVersions(await api<unknown>('/version',{signal:controller.signal}));if(request.current===controller){setVersions(value);setChecked(new Date())}}
  catch(e){if(request.current===controller)setError(e instanceof ApiError&&(e.status===401||e.status===403)?'登录已失效，请重新登录':e instanceof ApiError&&e.status===404?'当前后台暂不支持版本查询':'检查失败，请稍后重试')}
  finally{clearTimeout(timeout);if(request.current===controller){setBusy(false);request.current=null}}
 },[])
 useEffect(()=>{const start=enabled?setTimeout(()=>void check(),0):undefined;return()=>{clearTimeout(start);request.current?.abort();request.current=null}},[enabled,check])
 return {versions,busy,error,checked,check}
}
type State=ReturnType<typeof useMobileVersions>
function status(current:string,latest:string){
 if(!current.trim())return tr('尚未上报版本')
 if(!latest.trim())return tr('最新版本暂不可用')
 const compared=compareVersion(current,latest)
 return compared===null?tr('版本无法比较'):compared<0?tr('有新版本'):compared===0?tr('已是最新版本'):tr('当前版本高于发布版本')
}
export function hasMobileUpdates(versions:Versions|null,nodes:Node[]){return !!versions?.notice&&(compareVersion(versions.hub,versions.hub_latest)===-1||nodes.some(n=>compareVersion(n.agent_version,versions.agent_latest)===-1))}
export function MobileUpdates({state,nodes,onClose}:{state:State;nodes:Node[];onClose:()=>void}){
 const {versions,busy,error,checked,check}=state
 const outdated=versions?nodes.filter(n=>compareVersion(n.agent_version,versions.agent_latest)===-1).length:0
 const unknown=nodes.filter(n=>!n.agent_version?.trim()).length
 const incomparable=versions?nodes.filter(n=>n.agent_version?.trim()&&compareVersion(n.agent_version,versions.agent_latest)===null).length:0
 return <MobileSheet title={tr('版本与更新')} onClose={onClose} footer={<><button disabled={busy} onClick={()=>void check()}>{busy?tr('正在检查…'):tr('检查更新')}</button><a href="/admin/update">{tr('前往后台更新')}<ChevronRight size={16}/></a></>}>
  <div className="ma-update-status" role="status">{busy?tr('正在检查…'):error?tr(error):checked?tr('最近检查：{0}',checked.toLocaleTimeString(locale())):tr('尚未检查')}</div>
  {error&&<a className="ma-row" href="/admin/">{tr('进入后台')}<ChevronRight size={16}/></a>}
  <section className="ma-update-card"><h3>Hub</h3><p>{tr('当前版本')} <b>{versions?.hub||'—'}</b></p><p>{tr('最新版本')} <b>{versions?.hub_latest||'—'}</b></p>{versions&&<small>{status(versions.hub,versions.hub_latest)}</small>}<a aria-label={tr('Hub 发布说明')} href="https://github.com/monitor-probe/monitor/releases" target="_blank" rel="noreferrer">{tr('Hub 发布说明')}<ExternalLink size={15} aria-hidden="true"/></a></section>
  <section className="ma-update-card"><h3>Agent</h3><p>{tr('最新版本')} <b>{versions?.agent_latest||'—'}</b></p>{versions&&<small>{versions.agent_latest?tr('{0} 个节点可更新',outdated):tr('最新版本暂不可用')}</small>}{unknown>0&&<small>{tr('{0} 个节点尚未上报版本',unknown)}</small>}{incomparable>0&&<small>{tr('{0} 个节点版本无法比较',incomparable)}</small>}
   {versions&&<details><summary>{tr('节点版本')} · {nodes.length}</summary>{nodes.map(n=><div className="ma-update-node" key={n.id}><strong>{n.name}</strong><span>{n.agent_version||'—'} · {n.online?tr('在线'):tr('离线')}</span><small>{status(n.agent_version,versions.agent_latest)}</small></div>)}</details>}
   <a aria-label={tr('Agent 发布说明')} href="https://github.com/monitor-probe/agent/releases" target="_blank" rel="noreferrer">{tr('Agent 发布说明')}<ExternalLink size={15} aria-hidden="true"/></a>
  </section>
  <section className="ma-update-card"><h3>{tr('主题')} · HEX</h3><p>{tr('当前版本')} <b>{manifest.version}</b></p><small>{tr('主题更新请在后台主题管理中查看。')}</small><a href="/admin/themes">{tr('主题管理')}<ChevronRight size={16}/></a></section>
  <p className="ma-footnote">{tr('这里只检查版本，升级操作请前往后台完成。')}</p><p className="ma-footnote">{tr('版本信息由后台缓存，重复检查不会强制刷新发布源。')}</p>
 </MobileSheet>
}
