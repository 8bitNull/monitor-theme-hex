import {tr} from '@/lib/i18n'

type RouteStat={id:number;name:string;latest?:{latency:number|null};p95:number|null;loss:number|null}

function readings(route:RouteStat){
 return {
  latest:!route.latest?'—':route.latest.latency===null?tr('超时'):Number.isFinite(route.latest.latency)?<>{route.latest.latency.toFixed(1)}<small> ms</small></>:'—',
  p95:route.p95===null?'—':<>{route.p95.toFixed(1)}<small> ms</small></>,
  loss:route.loss===null?<span className="ma-unknown-loss">{tr('未统计')}</span>:`${route.loss.toFixed(1)}%`,
 }
}

export function MobileRouteStats({routes,comparing,color,onStatistics}:{routes:RouteStat[];comparing:boolean;color:(id:number)=>string;onStatistics:()=>void}){
 if(routes.length===1&&!comparing){
  const values=readings(routes[0])
  return <dl className="ma-route-summary" aria-label={tr('完整范围线路统计')}>
   <div><dt>{tr('最新')}</dt><dd>{values.latest}</dd></div>
   <div><dt>P95</dt><dd>{values.p95}</dd></div>
   <div><dt>{tr('丢包')}</dt><dd>{values.loss}</dd></div>
  </dl>
 }
 if(!routes.length)return null
 return <table className="ma-route-statistics"><caption className="sr-only">{tr('完整范围线路统计')}</caption>
  <thead><tr><th scope="col">{tr('线路')}</th><th scope="col">{tr('最新')}</th><th scope="col"><button aria-label={tr('统计口径')} onClick={onStatistics}>P95 ⓘ</button></th><th scope="col"><button onClick={onStatistics}>{tr('丢包')} ⓘ</button></th></tr></thead>
  <tbody>{routes.map(route=><tr key={route.id}><th scope="row"><span className="ma-route-dot" style={{background:color(route.id)}}/>{route.name}</th>{Object.entries(readings(route)).map(([key,value])=><td key={key}>{value}</td>)}</tr>)}</tbody>
 </table>
}
