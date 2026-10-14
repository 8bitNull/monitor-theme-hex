import {X} from 'lucide-react'
import {tr} from '@/lib/i18n'
import {countryName} from '@/lib/regionNames'
import {adaptiveRate} from '@/lib/format'
import type {MapRegionSummary} from '@/lib/mapLayers'
import type {MapProbeQuality} from '@/lib/mapProbeQuality'
export function mapProbeLabel(quality:MapProbeQuality|undefined){
 return quality?.state==='timeout'?tr('最近探测无响应'):quality?.state==='high'?tr('高延迟'):quality?.state==='slow'?tr('延迟偏高'):quality?.state==='loss'?(quality.sampleLoss===null?tr('探测异常'):tr('最近采样丢包 {0}%',quality.sampleLoss)):quality?.state==='healthy'?tr('最近探测正常'):tr('暂无有效探测')
}
export function MapRegionDetails({summary,quality,onClose,onOpen,side='right'}:{side?:'left'|'right';summary:MapRegionSummary;quality:Map<number,MapProbeQuality>;onClose:()=>void;onOpen:(id:number)=>void}){
 return <section className="map-region-details" role="region" aria-label={tr('地区详情')} data-map-overlay data-region={summary.code} data-side={side} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();onClose()}}}>
  <header><strong>{countryName(summary.code)}</strong><button aria-label={tr('关闭地区详情')} onClick={onClose}><X size={14}/></button></header>
  <div className="map-detail-scroll"><p>{tr('{0} / {1} 在线',summary.online,summary.total)}</p><div className="map-detail-rates"><span>↑ {tr('上传')} <b>{summary.tx===null?'—':adaptiveRate(summary.tx)}</b></span><span>↓ {tr('下载')} <b>{summary.rx===null?'—':adaptiveRate(summary.rx)}</b></span></div><p>{tr('探测异常 {0}',summary.abnormal)} · {tr('有效探测 {0} / {1}',summary.probeKnown,summary.online)}</p>{summary.trafficSamples<summary.online&&<p>{tr('{0} 个节点暂无实时数据',summary.online-summary.trafficSamples)}</p>}
  <div className="map-detail-nodes">{summary.nodes.slice(0,2).map(node=>{const q=node.online?quality.get(node.id):undefined;return <button key={node.id} aria-label={tr('查看 {0}',node.name)} onClick={()=>onOpen(node.id)} data-quality={q?.state??'unknown'}><strong title={node.name}>{node.name}</strong><span className="map-detail-quality">{node.online?mapProbeLabel(q):tr('离线')}{q?.latency!==null&&q?.latency!==undefined?` · ${q.latency.toFixed(1)} ms`:''}</span><span>{q?.name||tr('无该线路记录')}</span><span className="map-detail-history">{tr('24h 丢包')} {q?.historyLoss!==null&&q?.historyLoss!==undefined?`${q.historyLoss.toFixed(1)}%`:'—'}</span></button>})}</div>{summary.total>2&&<p>{tr('另有 {0} 个节点',summary.total-2)}</p>}</div>
 </section>
}
