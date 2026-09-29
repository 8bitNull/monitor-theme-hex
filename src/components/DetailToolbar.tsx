import {Activity,Network,RefreshCw,SlidersHorizontal,Waves} from 'lucide-react'
import {tr,locale} from '@/lib/i18n'
import {resourceOptions,type ResourceMetricKey} from './ResourceHistory'

const RANGES = [
    { hours: 1, label: "1 小时" },
    { hours: 6, label: "6 小时" },
    { hours: 24, label: "24 小时" },
    { hours: 168, label: "7 天" },
];
// Latency stops at a day. A week-wide bucket would still carry the spread and the
// loss figure, but a week of probe history is outside this page's purpose, and
// these are the windows in which every ping remains on the chart.
const RANGES_FOR = { resources: RANGES, latency: RANGES.filter((r) => r.hours <= 24) };
const TABS = [
    { key: "resources", label: "资源" },
    { key: "latency", label: "网络延迟" },
] as const;

function Tab({ active, onClick, children, label }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    label?:string;
}) {
    return (<button type="button" aria-label={label} onClick={onClick} aria-pressed={active} className={`rounded-md px-2.5 py-1 text-xs transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
      {children}
    </button>);
}

function ResourceMetricControl({metric,onMetric}:{metric:ResourceMetricKey;onMetric:(metric:ResourceMetricKey)=>void}){
    return <div className="detail-resource-metric">
      <div className="detail-resource-metric-desktop" role="group" aria-label={tr("资源指标")}>
        {resourceOptions.map(({key,label,Icon})=><button type="button" key={key} aria-label={tr(label)} title={tr(label)} aria-pressed={metric===key} onClick={()=>onMetric(key)}><Icon size={14} aria-hidden="true"/><span>{tr(label)}</span></button>)}
      </div>
      <details className="detail-resource-metric-mobile">
        <summary aria-label={tr("资源指标")}><SlidersHorizontal size={16} aria-hidden="true"/><span>{tr(resourceOptions.find(o=>o.key===metric)!.label)}</span><span aria-hidden="true">▾</span></summary>
        <div className="detail-resource-metric-menu" role="group" aria-label={tr("资源指标")}>
          {resourceOptions.map(({key,label,Icon})=><button type="button" key={key} aria-label={tr(label)} title={tr(label)} aria-pressed={metric===key} onClick={e=>{onMetric(key);e.currentTarget.closest("details")?.removeAttribute("open")}}><Icon size={14} aria-hidden="true"/><span>{tr(label)}</span>{metric===key&&<span className="detail-metric-check" aria-hidden="true">✓</span>}</button>)}
        </div>
      </details>
    </div>
}

export type HistoryTab='resources'|'latency'
export function DetailToolbar({busy,updated,failed,tab,hours,onTab,onHours,onRefresh,resourceMetric,onResourceMetric,smooth,onSmooth,mobile=false,onSettings}:{busy:boolean;updated:number|null;failed:boolean;tab:HistoryTab;hours:number;onTab:(tab:HistoryTab)=>void;onHours:(hours:number)=>void;onRefresh:()=>void;resourceMetric:ResourceMetricKey;onResourceMetric:(metric:ResourceMetricKey)=>void;smooth:boolean;onSmooth:(smooth:boolean)=>void;mobile?:boolean;onSettings?:()=>void}){
 const updateText=busy?tr("正在更新"):failed?(updated?tr("上次成功更新：{0}",new Date(updated).toLocaleTimeString(locale(),{hour:"2-digit",minute:"2-digit",second:"2-digit"})):tr("更新失败")):updated?tr("更新于 {0}",new Date(updated).toLocaleTimeString(locale(),{hour:"2-digit",minute:"2-digit",second:"2-digit"})):tr("等待数据")
 if(mobile)return <div id="latency" className="ma-history-tools">
   {tab==='resources'&&<ResourceMetricControl metric={resourceMetric} onMetric={onResourceMetric}/>}
   <div className="ma-history-tools-row"><div className="detail-ranges" role="group" aria-label={tr('当前查看范围')}>{RANGES_FOR[tab].map(r=><Tab key={r.hours} label={tr(r.label)} active={hours===r.hours} onClick={()=>onHours(r.hours)}>{r.hours===168?'7d':`${r.hours}h`}</Tab>)}</div>
   <button type="button" className="ma-icon" disabled={busy} aria-busy={busy} aria-label={tr('刷新历史')} title={updateText} onClick={onRefresh}><RefreshCw size={17}/></button>
   {tab==='latency'&&<button type="button" className="ma-icon" aria-label={tr('图表设置')} onClick={onSettings}><SlidersHorizontal size={17}/></button>}</div>
 </div>;
 return <div id="latency" className="detail-chart-toolbar" data-history-tab={tab} data-range-count={RANGES_FOR[tab].length}>
        <div className="detail-toolbar-selection"><div className="detail-tabs" role="group" aria-label={tr("图表类型")}>{TABS.map(t=><Tab key={t.key} label={tr(t.label)} active={tab===t.key} onClick={()=>onTab(t.key)}>{t.key==="resources" ? <Activity size={15}/> : <Network size={15}/>}<span>{tr(t.key==="resources" ? "资源" : "延迟")}</span></Tab>)}</div>
        {tab==="resources" ? <><span className="detail-submenu-divider" aria-hidden="true">|</span><ResourceMetricControl metric={resourceMetric} onMetric={onResourceMetric}/></> : <><span className="detail-submenu-divider" aria-hidden="true">|</span><label className="detail-smooth" title={tr("抑制尖峰仅改变图线显示，不修改原始数据。")}><input type="checkbox" aria-label={tr("抑制尖峰")} checked={smooth} onChange={e=>onSmooth(e.target.checked)}/><Waves size={15} aria-hidden="true"/><span>{tr("抑制尖峰")}</span></label></>}
        </div><div className="detail-toolbar-actions"><span className="detail-update" data-failed={failed} title={updated?tr("最后成功获取：{0}",new Date(updated).toLocaleString(locale())):undefined}><span className="detail-update-full">{updateText}</span>{!busy&&!failed&&updated!==null&&<span className="detail-update-short" aria-label={updateText}>{new Date(updated).toLocaleTimeString(locale(),{hour:"2-digit",minute:"2-digit",hour12:false})}</span>}</span><div className="detail-ranges" role="group" aria-label={tr("当前查看范围")}>{RANGES_FOR[tab].map(r=><Tab key={r.hours} label={tr(r.label)} active={hours===r.hours} onClick={()=>onHours(r.hours)}>{r.hours===168 ? "7d" : `${r.hours}h`}</Tab>)}</div>
        <button type="button" className="detail-refresh" disabled={busy} aria-busy={busy} aria-label={tr("刷新历史")} title={updated?tr("最后成功获取：{0}",new Date(updated).toLocaleString(locale())):tr("刷新历史")} onClick={onRefresh}><RefreshCw size={16}/></button></div>
      </div>
}
