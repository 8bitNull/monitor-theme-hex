import type {OpenRoutes} from '@/lib/routeSelection'
import {LatencyBars} from './LatencyBars'
import {latencyBand} from '@/lib/trends'
import {LossMetric} from './LossMetric'
import {Select} from '@/components/ui/select'
import {useNodeProbe} from '../lib/nodeProbes'
import { tr } from '../lib/i18n.ts'
import { Unlink } from 'lucide-react'
import { usePing } from '@/lib/usePing'
import { summarizePing, probeCatalog, recentPingRows, type PingWindow } from '@/lib/ping'
import {isRecentPingSample} from '@/lib/pingRecency'
export function PingStats({ online = true, showStaleRecord = true, id, probe = "auto", onOpenRoutes, count = 1, scale = 200, latencyWindow = 1, warn = 80, high = 160 }: { scale?:200|500; latencyWindow?:PingWindow; warn?:number; high?:number; count?:number; online?:boolean; showStaleRecord?:boolean; id:number; probe?:string; onOpenRoutes:(route:OpenRoutes)=>void }) {
 const choice=useNodeProbe(id,probe)
 const {ref,snapshot}=usePing(id)
 const stats=snapshot?.data?summarizePing(snapshot.data):null
 const catalog=snapshot?.data?probeCatalog(snapshot.data):[]
 const primary=choice.probe === "auto" ? stats?.[0] : stats?.find(s=>String(s.id)===choice.probe)
 const shown=primary?[primary,...(stats || []).filter(s=>s.id!==primary.id)].slice(0,Math.max(1,Math.min(3,count))):[]
 const fallback=probe === "auto" ? stats?.[0] : stats?.find(s=>String(s.id)===probe)
  return <section ref={ref} className="ping-stats route-matrix" data-loading={!snapshot?.data&&!snapshot?.failed} data-node-online={online} data-route-count={shown.length} data-requested-count={count} data-latency-window={latencyWindow} aria-label={tr("首页延迟统计")}>
  <div className="matrix-heading"><div className="route-controls"><div className="route-picker"><Select displayValue={primary?.name || (!snapshot?.data ? tr("正在读取…") : tr("无该线路记录"))} title={choice.selected==="auto"?tr("全局：{0}",fallback?.name || tr("无该线路记录")):primary?.name} className="route-select" aria-label={tr("节点探测线路")} value={choice.selected} onChange={e=>choice.select(e.target.value)}><option value="auto">{tr("全局：{0}",fallback?.name || tr("无该线路记录"))}</option>{catalog.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}{choice.selected!=="auto"&&!catalog.some(s=>String(s.id)===choice.selected)&&<option value={choice.selected}>{tr("无该线路记录")} · {choice.selected}</option>}</Select></div>{choice.selected!=="auto" && <button onClick={()=>choice.select("auto")} aria-label={tr("恢复跟随全局线路")} title={tr("恢复跟随全局线路")}><Unlink size={14}/></button>}{catalog.length>1 && <button className="route-count" onClick={()=>onOpenRoutes({kind:"all"})} aria-label={tr("查看全部 {0} 条线路",catalog.length)} title={tr("查看全部 {0} 条线路",catalog.length)}><span>· {tr("{0}条线路",catalog.length)}</span></button>}</div>{shown.length===1&&<LossMetric value={primary?.loss??null}/>}</div>
  {snapshot?.failed && stats && <p className="ping-stale">{tr("更新失败 · 上次数据")}</p>}
  {!online&&<p className="ping-stale">{tr("节点离线 · 线路探测独立更新")}</p>}
   {!stats?(snapshot?.failed?<p className="ping-empty">{tr("暂不可用 · 自动重试")}</p>:<div className="ping-loading" role="status" aria-label={tr("正在读取探测记录…")}><span className="ping-loading-line" aria-hidden="true"/><span className="ping-loading-line" aria-hidden="true"/></div>):!stats.length?<p className="ping-empty">{tr("暂无探测记录")}</p>:!primary?<p className="ping-empty">{tr("无该线路记录")}</p>:<>
   {shown.map(s=><div className="ping-probe" key={s.id}>
    <div className="matrix-values">
     <div className="latency-stat"><div className="latency-reading"><span title={s.name}>{shown.length===1?tr("延迟"):s.name}</span><LatencyBars key={`${id}:${s.id}:${latencyWindow}`} rows={recentPingRows(s.allRows,latencyWindow)} scale={scale} warn={warn} high={high}/><button className="latency-link" onClick={()=>onOpenRoutes({kind:"single",id:s.id})} aria-label={tr("查看线路：{0}",s.name)} data-tone={isRecentPingSample(s.latest.ts)&&!snapshot?.failed?latencyBand(s.latest.latency,warn,high):undefined} title={tr("延迟")}>{s.latest.latency===null?tr("超时"):<>{Math.round(s.latest.latency)}<small> ms</small></>}</button></div>
     </div>
     {shown.length>1&&<LossMetric value={s.loss}/>}
    </div>
    {showStaleRecord&&!isRecentPingSample(s.latest.ts)&&<p className="ping-stale">{tr("较旧记录")}</p>}
   </div>)}
  </>}
 </section>
}
