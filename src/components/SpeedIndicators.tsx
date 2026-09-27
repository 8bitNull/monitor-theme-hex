import {useMemo} from 'react'
import {MicroTrend,useTrendCeiling} from './MicroTrend'
import {liveMetrics,nodeState} from '@/lib/freshness'
import {ArrowUp, ArrowDown} from 'lucide-react'
import {nodeSpeedSamples, type Node} from '@/lib/api'
import {adaptiveRateParts,rate} from '@/lib/format'
import {tr, locale} from '@/lib/i18n'

/** A shared scale, never a claimed bandwidth utilization percentage. */
export function SpeedIndicators({node, detail=false, compact=false}: {node:Node; detail?:boolean; compact?:boolean}) {
  const m=liveMetrics(node)
  const tx=m?.net_tx, rx=m?.net_rx
  const state=nodeState(node)
  const stale=state==='stale'
  const samples=nodeSpeedSamples(node.id)
  const trends=useMemo(()=>({tx:samples.map(p=>({ts:p.ts,value:p.tx})),rx:samples.map(p=>({ts:p.ts,value:p.rx}))}),[samples])
  const end=node.last_seen||Date.now()/1000,start=end-60
  const trendTop=useTrendCeiling(samples,Math.max(0,...samples.flatMap(p=>[p.rx,p.tx])),1024)
  const hint=state==='offline'?tr("离线"):state==='missing'?tr("等待数据"):stale?tr("数据已过期，上次上报：{0}",new Date(node.last_seen*1000).toLocaleString(locale())):tr('最近 60 秒网速')
  return <div className={`speed-pair speed-indicators ${detail?'detail-speed':''}`} data-state={state} aria-label={tr("实时网速")} title={hint}>
    {([['upload',tx,ArrowUp,tr("实时上行")],['download',rx,ArrowDown,tr("实时下行")]] as const).map(([direction,value,Icon,label])=>{
      const {amount,unit}=adaptiveRateParts(value??NaN)
      return <div className={direction} key={direction} aria-label={`${label} ${amount} ${unit}${stale?' · '+tr("数据已过期"):''}`}>
        <Icon size={16} aria-hidden="true"/><span className="speed-direction">{detail&&!compact?label:tr(direction==='upload'?'上行':'下行')}</span><strong><span className="speed-amount">{amount}</span><small>{unit || "\u00a0"}</small></strong>
        <div className="speed-trend"><MicroTrend rows={m?trends[direction==='upload'?'tx':'rx']:[]} start={start} end={end} top={trendTop} gap={15} label={tr('最近 60 秒网速')} emptyLabel={m?undefined:state==='offline'?tr('离线'):stale?tr('数据已过期'):tr('等待数据')}/>{detail&&<span className="speed-trend-caption">{tr('最近 60 秒')} · 0–{rate(trendTop)}</span>}</div>
      </div>
    })}
  </div>
}
