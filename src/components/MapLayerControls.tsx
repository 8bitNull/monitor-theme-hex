import {useId} from 'react'
import {tr} from '@/lib/i18n'
import type {MapLayer} from '@/lib/worldMapModel'
import '@/styles/map-layers.css'
export function mapLayerDescription(layer:MapLayer){return layer==='traffic'?tr('真实上传 / 下载活动'):layer==='probe'?tr('当前线路质量 · 灰色表示未知'):tr('节点在线状态')}
export function MapLayerControls({layer,onLayer,abnormalCount,onAbnormal}:{layer:MapLayer;onLayer:(layer:MapLayer)=>void;abnormalCount:number;onAbnormal:()=>void}){
 const hint=useId()
  return <div className="map-layer-tools" data-map-overlay><div className="map-layer-row"><div role="group" aria-label={tr('地图图层')} aria-describedby={hint} className="map-layer-buttons" data-map-overlay>{(['nodes','traffic','probe'] as const).map(value=><button key={value} aria-pressed={value===layer} onClick={()=>onLayer(value)}>{value==='nodes'?tr('节点'):value==='traffic'?tr('流量'):tr('探测')}</button>)}</div><button className="map-abnormal" data-map-overlay disabled={abnormalCount===0} onClick={onAbnormal}>{tr('异常地区 {0}',abnormalCount)}</button></div><p id={hint}>{mapLayerDescription(layer)}</p></div>
}
