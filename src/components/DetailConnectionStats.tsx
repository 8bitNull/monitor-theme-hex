import type {Node} from '@/lib/api'
import {liveMetrics} from '@/lib/freshness'
import {uptime} from '@/lib/format'
import {tr} from '@/lib/i18n'

export function DetailConnectionStats({node,withLoad=false}:{node:Node;withLoad?:boolean}){
 const m=liveMetrics(node)
 if(!m)return null
 return <div className={`detail-status-band${withLoad?' with-load':''}`}>
  {withLoad&&<div className="detail-status-load"><span>{tr('系统负载')}</span><div className="detail-load-values">{m.load.map((value,i)=><b key={i}>{Number.isFinite(value)?value.toFixed(2):'—'} <small>{tr('{0} 分钟',[1,5,15][i])}</small></b>)}</div></div>}
  <div><span>{tr('连接数')}</span><b>TCP {m.tcp??'—'} · UDP {m.udp??'—'}</b></div>
  <div><span>{tr('在线时长')}</span><b>{uptime(m.uptime)}</b></div>
 </div>
}
