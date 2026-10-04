import {useBrushAccessibility} from './useBrushAccessibility'
import '@/styles/mobile-chart-refinement.css'
import {LossTrack} from './LossTrack'
import {Select} from './ui/select'
import {ChartTooltip,useChartTooltip} from './ChartTooltip'
import type {Preferences} from '@/lib/appearance'
import {DetailIdentity,DetailLiveOverview} from './DetailOverview'
import type {ResourceTrendMetric} from '@/lib/resourceTrend'
import '@/styles/detail-aesthetics.css'
import {DetailFacts} from './DetailFacts'
import {MobileRemarks} from './MobileRemarks'
import {ResourceHistory,type ResourceMetricKey} from './ResourceHistory'
import {DetailToolbar,type HistoryTab} from './DetailToolbar'
import { probeCatalog } from '@/lib/ping'
import { tr, locale } from '../lib/i18n.ts'
import { useEffect, useMemo, useState, useRef } from "react";
import { median } from "d3-array";
import { Area, AreaChart, Brush, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, } from "recharts";
import {HistoryState} from "./HistoryState";
import { api, ApiError, type Node } from "@/lib/api";
import { clockFor, timeTicks, } from "@/lib/format";
type Point = {
    ts: number;
    cpu: number;
    mem_used: number;
    disk_used: number;
    net_rx: number;
    net_tx: number;
};
// `latency` is the bucket's median round trip, null when every probe in it timed
// out. `band` is the range its answers spanned, absent when they spanned nothing.
// Missing `loss` is unknown: deployed API versions may omit these statistics.
type PingPoint = {
    task_id: number;
    ts: number;
    latency: number | null;
    band?: [
        number,
        number
    ];
    loss?: number;
};
/** Probe names by id, sent alongside the samples they label. */
type Probes = Record<string, string>;
/**
 * Proportion of the whole window each probe lost, by id. Missing entries remain
 * unknown. Sent because it cannot be derived here: every bucket's `loss` is
 * already a percentage of that bucket, so the sample counts it was divided by are
 * unavailable. Averaging them would weight a bucket holding one sample equally
 * with one holding twelve, and the window's first and last buckets are partial
 * regardless of what the probe does.
 */
type Loss = Record<string, number>;
const historyError = (error:Error) => error instanceof ApiError
    ? error.status===503 ? tr("历史服务暂时不可用，请稍后重试。") : error.status===429 ? tr("请求过于频繁，请稍后重试。") : tr("历史数据请求失败，请重试。")
    : error.name==='AbortError' ? tr("读取超时，请重试。") : tr("网络连接失败，请重试。");
const AXIS = { stroke: "currentColor", fontSize: 12, tickLine: false, axisLine: false };
// No grow-in animation: it would spend 1.5 s drawing a line across the panel on
// every range change, on a page meant to be read at a glance, and on the latency
// chart across seven hundred points per probe.
const SERIES = { dot: false as const, strokeWidth: 1.7, isAnimationActive: false };
// Stable colours identify routes across time windows.
const PALETTE = Array.from({length:8},(_,i)=>({stroke:`var(--latency-line-${i+1})` }));
/**
 * Hampel filter (Hampel 1974; MATLAB ships it as `hampel`). A point more than
 * `sigmas` robust deviations from its window's median is replaced by that median,
 * while everything else passes through unchanged, which is what distinguishes it
 * from a rolling median or a moving average.
 *
 * 1.4826 rescales the median absolute deviation to a standard deviation for
 * normally distributed data; 3 sigma is the conventional cut.
 */
function despike(points: PingPoint[], window = 7, sigmas = 3): PingPoint[] {
    const half = window >> 1;
    // ponytail: recomputes the window per point. A few thousand samples is
    // negligible; substitute a rolling structure if a chart ever needs 100k.
    return points.map((p, i) => {
        // A timeout is a gap rather than a high reading: neither smoothed, nor counted
        // towards what its neighbours are compared against.
        if (p.latency === null)
            return p;
        const near = points
            .slice(Math.max(0, i - half), i + half + 1)
            .map((x) => x.latency)
            .filter((v) => v !== null);
        const mid = median(near) ?? p.latency;
        const mad = median(near.map((v) => Math.abs(v - mid))) ?? 0;
        const outlier = mad > 0 && Math.abs(p.latency - mid) > sigmas * 1.4826 * mad;
        return outlier ? { ...p, latency: mid } : p;
    });
}
import {readRouteSelection,selectedRouteIds,type RouteSelection} from '@/lib/routeSelection'
import {MobileRouteStats} from './MobileRouteStats'
import {MobileDetailOverview} from './MobileDetailOverview'
import {mobileDefaults,type MobilePreferences} from '@/lib/mobilePreferences'
import {NodePicker} from './NodePicker'
import {ArrowLeft} from 'lucide-react'
import {MobileSheet} from './ui/mobile-sheet'
import {Status} from './NodeIdentity'

function ChartSettingsSheet({kind,onClose,smooth,onSmooth}:{kind:'settings'|'statistics';onClose:()=>void;smooth:boolean;onSmooth:(value:boolean)=>void}){
    return <MobileSheet title={tr(kind==='settings'?'图表设置':'统计口径')} onClose={onClose}>
      <div className="ma-chart-sheet-body">{kind==='settings'?<><label className="ma-chart-smoothing"><span>{tr('抑制尖峰')}</span><input type="checkbox" checked={smooth} onChange={e=>onSmooth(e.target.checked)}/></label><p>{tr('抑制尖峰仅改变图线显示，不修改原始数据。')}</p><p>{tr('摘要与提示仍使用原始采样，缺失与超时保留断点。')}</p></>:<><p>{tr('P95 表示 95% 的有效采样延迟不高于此值。')}</p><p>{tr('P95 根据完整查询范围内有效采样桶的原始延迟中位值计算，不包含超时和缺失采样。')}</p><p>{tr('丢包率使用服务端提供的完整时间范围统计，不平均各采样桶的百分比；未提供统计时不推断为零。')}</p><p>{tr('缩放只改变图表视野，不改变摘要统计范围。')}</p></>}</div>
    </MobileSheet>;
}

export function NodeDetail({ node, probe = "auto", nodes, onSwitch, detailInfoMode, onDetailInfoMode, mobilePreferences=mobileDefaults, onBack }: {
    onBack?:()=>void;
    mobilePreferences?:MobilePreferences;
    detailInfoMode:Preferences['detailInfoMode'];
    onDetailInfoMode:(mode:Preferences['detailInfoMode'])=>void;
    node: Node;
    probe?:string;
    nodes:Node[];
    onSwitch:(id:number)=>void;
}) {
    const [compact,setCompact]=useState(()=>matchMedia('(max-width:899px)').matches);
    const [mobile,setMobile]=useState(()=>matchMedia('(max-width:720px)').matches);
    useEffect(()=>{const media=matchMedia('(max-width:720px)');const update=()=>setMobile(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
    type MobileSection='overview'|'resources'|'latency'|'info';
    const [mobileSection,setMobileSection]=useState<MobileSection>(()=>{const p=new URLSearchParams(location.search),section=p.get('section');return location.hash==='#latency'?'latency':p.has('eventStart')?'resources':['overview','resources','info'].includes(section??'')?section as MobileSection:'overview'});
    useEffect(()=>{const media=matchMedia('(max-width:899px)');const update=()=>setCompact(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
    const [tab, setTab] = useState<HistoryTab>(()=>location.hash === "#latency" ? "latency" : "resources");
    // Each tab keeps its own range: a 7-day trend and a 1-hour trace answer
    // different questions.
    const params=new URLSearchParams(location.search);
    const eventStart=Number(params.get('eventStart'))||0,eventEnd=Number(params.get('eventEnd'))||eventStart;
    const age=(Date.now()-eventStart)/3600000;
    const eventRange=[1,6,24,168].find(h=>h>=age)??168;
    const initialMetric=params.get('metric') as ResourceMetricKey;
    const [resourceMetric,setResourceMetric]=useState<ResourceMetricKey>(['cpu','mem_used','disk_used','network'].includes(initialMetric)?initialMetric:'cpu');
    const [ranges, setRanges] = useState({ resources:eventStart?eventRange:([1,6,24,168].includes(Number(params.get("rh")))?Number(params.get("rh")):(mobile?mobilePreferences.hours:6)), latency:[1,6,24].includes(Number(params.get("lh")))?Number(params.get("lh")):(mobile?mobilePreferences.hours:6) });
    const hours = ranges[tab];
    const historyVisible=!mobile||mobileSection==='resources'||mobileSection==='latency';
    const {frame:tooltipFrame,dismiss:tooltipDismiss,onChartClick:tooltipClick,onChartPointerMove:tooltipMove,onChartKeyDown:tooltipKey}=useChartTooltip(`${node.id}:${hours}:${tab}`,compact);
    const legend=useRef<HTMLDivElement>(null);
    const [retry, setRetry] = useState(0);
    const [smooth, setSmooth] = useState(false);
    const [chartSheet,setChartSheet]=useState<'settings'|'statistics'|null>(null);
    const [zoomExpanded,setZoomExpanded]=useState(false);
    useEffect(()=>{if(location.hash === "#latency"){const frame=requestAnimationFrame(()=>{if(matchMedia('(max-width:720px)').matches)window.scrollTo(0,0);else document.getElementById("latency")?.scrollIntoView()});return ()=>cancelAnimationFrame(frame)}},[]);
    // Probes switched off. Hiding a slow one is what makes the fast ones readable,
    // as the axis rescales to what remains.
    const [expandedRoutes,setExpandedRoutes]=useState(false);
    const openRoutes=()=>{setExpandedRoutes(true);requestAnimationFrame(()=>{legend.current?.scrollIntoView({block:'nearest'});legend.current?.querySelector<HTMLButtonElement>('button')?.focus()})};
    const chooseRange=()=>document.querySelector<HTMLElement>('.detail-ranges button')?.focus();
    const [highlightProbe, setHighlightProbe] = useState<number | null>(null);
    const [selectedProbes, setSelectedProbes] = useState<RouteSelection>(()=>readRouteSelection(params.get("routes")));
    const [data, setData] = useState<{
        key: string;
        metrics: Point[];
        ping: PingPoint[];
        probes: Probes;
        loss?: Loss;
    } | null>(null);
    // Retained rather than folded into an empty result: a refused request and an
    // empty window are different answers, and the hub has reason to refuse this one
    // -- it caps how many history windows it builds concurrently, since each holds
    // the connection the agents report through. Rendered as an empty window, a 503
    // would misdirect the reader.
    const [failed, setFailed] = useState("");
    const [loading,setLoading]=useState(true);
    const busy=useRef(true);
    const retained=useRef<{key:string;value:NonNullable<typeof data>}|null>(null);
    const refresh=()=>{if(!busy.current){busy.current=true;setLoading(true);setRetry(n=>n+1);}};
    const [updated,setUpdated]=useState<number|null>(null);
    useEffect(()=>{const q=new URLSearchParams(location.search);q.set('rh',String(ranges.resources));q.set('lh',String(ranges.latency));q.set('metric',resourceMetric);if(mobile)q.set('section',mobileSection);if(selectedProbes===null)q.delete('routes');else q.set('routes',selectedProbes==='all'?'all':selectedProbes.join(','));history.replaceState(history.state,'',location.pathname+'?'+q+((mobile?mobileSection==='latency':tab==='latency')?'#latency':''))},[ranges,resourceMetric,selectedProbes,tab,mobile,mobileSection]);
    // Where the brush has been dragged, so the axis reticks for the visible span
    // rather than retaining the whole window's ticks.
    const [zoomWindow, setZoomWindow] = useState<[
        number,
        number
    ] | null>(null);
    useEffect(() => {
        if(!historyVisible)return;
        let active = true;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        // The charts must not continue drawing the old range while the new one is in
        // flight.
        // oxlint-disable-next-line react/set-state-in-effect
        const key=`${node.id}:${hours}:${tab}`;
        const previous=retained.current?.key===key?retained.current.value:null;
        setData(previous);
        if(!previous)setUpdated(null);
        busy.current=true;setLoading(true);
        // oxlint-disable-next-line react/set-state-in-effect
        if(!previous)setZoomWindow(null);
        // oxlint-disable-next-line react/set-state-in-effect
        setFailed("");
        // What this screen can resolve, in device pixels, which is the unit the line
        // is drawn in: a 1280-wide retina panel has 2560 of them for a day of minutes.
        // Read here rather than from a ref, since the hub only thins further, an
        // approximate figure suffices, and the viewport is known before layout. A
        // rotation keeps whatever it fetched with.
        //
        // The tab determines which half is requested; the other accounted for a third
        // to two thirds of every response and was never drawn.
        const points = Math.round(globalThis.innerWidth * (globalThis.devicePixelRatio || 1));
        const series = tab === "latency" ? "ping" : "metrics";
        api<{
            metrics: Point[];
            ping: PingPoint[];
            probes: Probes;
            loss?: Loss;
        }>(`/nodes/${node.id}/metrics?hours=${hours}&points=${points}&series=${series}`, { signal: controller.signal, cache: 'no-store' })
            .then((next) => { clearTimeout(timeout); if (active) {const snapshot={...next,key};retained.current={key,value:snapshot};setData(snapshot);setUpdated(Date.now());busy.current=false;setLoading(false);} })
            .catch((e: Error) => {
            // `|| "..."` as in App.tsx: HTTP/2 dropped statusText, so a bodiless
            // failure from a proxy arrives as the empty string and renders as no
            // error.
            clearTimeout(timeout);
            if (active) {
                setFailed(historyError(e));
                setData(previous || { key, metrics: [], ping: [], probes: {} });
                busy.current=false;setLoading(false);
            }
        });
        return () => { active = false; clearTimeout(timeout); controller.abort(); };
    }, [node.id, hours, tab, retry,historyVisible]);
    // Keep one request in flight. Background tabs do not poll; returning starts
    // a fresh 30-second cycle and immediately refreshes the visible history.
    useEffect(()=>{
        if(tab!=="latency"||!historyVisible)return;
        let timer:ReturnType<typeof setInterval>|undefined;
        const sync=()=>{if(!document.hidden&&!busy.current){busy.current=true;setLoading(true);setRetry(n=>n+1)}};
        const schedule=()=>{clearInterval(timer);if(!document.hidden)timer=setInterval(sync,30000)};
        const visibility=()=>{schedule();if(!document.hidden)sync()};
        schedule();document.addEventListener('visibilitychange',visibility);
        return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility)};
    },[node.id,hours,tab,historyVisible]);
    // One series per probe that reported, labelled from the names the samples
    // arrived with. Memoised, as are the two below: the node prop changes every few
    // seconds as live metrics arrive, and rebuilding the chart's data array on those
    // renders would reset the brush.
    const pingSeries = useMemo(() => data ? probeCatalog(data).map(({id,name})=>({
        id, name, points: (data.ping ?? []).filter(p=>p.task_id===id).sort((a,b)=>a.ts-b.ts)
    })) : [], [data]);
    // The hub answers in seconds; the time axis requires milliseconds.
    const metricRows = useMemo(() => (data?.metrics ?? []).map((m) => ({ ...m, ts: m.ts * 1000 })), [data]);
    const defaultProbe = probe === "auto" ? pingSeries.find(s=>s.points.length)?.id : Number(probe);
    const visibleIds = selectedRouteIds(selectedProbes,pingSeries.map(s=>s.id),defaultProbe);
    const shownProbes = pingSeries.filter(s=>visibleIds.includes(s.id));
    // The same probe ID retains its colour when the time window/catalog changes.
    const style = (id:number) => PALETTE[id-1] ?? {stroke:`hsl(${(id*137.508)%360} 28% var(--latency-line-lightness))`};
    // The hub stamps every sample with its bucket rather than the second the probe
    // finished, so probes reporting at the bucket's rate share rows instead of each
    // contributing its own: a day of four probes is 717 rows rather than 2,868. A
    // slower probe leaves gaps in its own column. Keep these gaps visible.
    //
    // Every probe and both versions of every sample are held here whether or not
    // they are on screen: recharts resets the brush when the data array changes
    // identity, and re-reads a controlled selection only when the index props
    // change, which they do not. Hiding a probe or enabling despiking therefore
    // selects a `dataKey` rather than rebuilding the array.
    const pingRows = useMemo(() => {
        const rows = new Map<number, {
            ts: number;
        } & Record<string, number | [
            number,
            number
        ] | null>>();
        for (const s of pingSeries) {
            const smoothed = despike(s.points);
            s.points.forEach((p, i) => {
                const previous=s.points[i-1];
                if(previous && p.ts-previous.ts>7200){const gap=(previous.ts+p.ts)/2;const missing=rows.get(gap)??{ts:gap*1000};missing[`t${s.id}`]=null;missing[`s${s.id}`]=null;missing[`b${s.id}`]=null;rows.set(gap,missing)}
                const row = rows.get(p.ts) ?? { ts: p.ts * 1000 };
                row[`t${s.id}`] = p.latency;
                row[`s${s.id}`] = smoothed[i].latency;
                row[`l${s.id}`] = typeof p.loss === "number" && Number.isFinite(p.loss) && p.loss >= 0 && p.loss <= 100 ? p.loss : null;
                // Raw, never despiked: the band exists to show what the line omits, and
                // smoothing it would omit the same points.
                row[`b${s.id}`] = p.band ?? null;
                rows.set(p.ts, row);
            });
        }
        return [...rows.values()].sort((a, b) => a.ts - b.ts);
    }, [pingSeries]);
    // Save timestamps, not row indices: a rolling history response drops old
    // rows and shifts indices. Clamp only when the selected history has expired.
    const zoom=useMemo<[number,number]|null>(()=>{
        if(!zoomWindow||!pingRows.length)return null;
        const first=pingRows.findIndex(p=>p.ts>=zoomWindow[0]);
        const start=first<0?pingRows.length-1:first;
        let end=pingRows.length-1;
        while(end>start&&pingRows[end].ts>zoomWindow[1])end--;
        return [start,end];
    },[pingRows,zoomWindow]);
    const setZoom=(indices:[number,number]|null)=>{
        if(!indices||indices[0]===0&&indices[1]===pingRows.length-1){setZoomWindow(null);return}
        const start=pingRows[indices[0]],end=pingRows[indices[1]];
        if(start&&end)setZoomWindow([start.ts,end.ts]);
    };
    // A real time axis rather than the category axis recharts defaults to: on a
    // category axis ticks are selected by index, so a period the agent was offline
    // for collapses to nothing.
    const timeAxis = (rows: {
        ts: number;
    }[], from = 0, to = rows.length - 1) => ({
        dataKey: "ts",
        type: "number" as const,
        domain: ["dataMin", "dataMax"] as const,
        // Explicit, or recharts places them at 05:14 and 10:22. Any that still collide
        // are dropped by `minTickGap`.
        ticks: rows.length ? timeTicks(rows[from].ts, rows[to].ts) : undefined,
        tickFormatter: clockFor(hours),
        minTickGap: compact ? 65 : hours > 24 ? 72 : 40,
        ...AXIS,
    });
    const rangeStart=pingRows[Math.min(zoom?.[0]??0,Math.max(0,pingRows.length-1))]?.ts??0;
    const rangeEnd=pingRows[Math.min(zoom?.[1]??pingRows.length-1,Math.max(0,pingRows.length-1))]?.ts??0;
    const quickStart=(minutes:number)=>pingRows.findIndex(row=>row.ts>=pingRows[pingRows.length-1].ts-minutes*60000);
    useBrushAccessibility(tooltipFrame,pingRows,zoom?.[0]??0,zoom?.[1]??Math.max(0,pingRows.length-1),locale());
    const zoomed=!!zoom&&(zoom[0]>0||zoom[1]<pingRows.length-1);
    // Mobile sliders control an explicit slice. Folding their UI never resets
    // the domain, and no hidden Recharts Brush can retain stale index state.
    const mobileChartRows=useMemo(()=>zoom?pingRows.slice(zoom[0],zoom[1]+1):pingRows,[pingRows,zoom]);
    const activeRoute=shownProbes.find(s=>s.id===defaultProbe)??shownProbes[0];
    const previewRoute=activeRoute?.id??(pingSeries.some(s=>s.id===defaultProbe)?defaultProbe:pingSeries[0]?.id);
    const collapsedRoutes=pingSeries.filter(s=>visibleIds.includes(s.id)||s.id===previewRoute);
    const axisMaximum=shownProbes.reduce((max,s)=>s.points.reduce((max,p)=>Math.max(max,p.latency??0,p.band?.[1]??0),max),0);
    const axisWidth=compact?Math.max(30,Math.min(60,String(Math.ceil(axisMaximum*1.1)).length*7+12)):52;
    const routeValue=selectedProbes===null?'auto':selectedProbes==='all'?'all':selectedProbes.length===1?String(selectedProbes[0]):'custom';
    const globalRoute=pingSeries.find(s=>s.id===defaultProbe);
    const latestRoutePoint=shownProbes.length===1?activeRoute?.points.at(-1):undefined;
    const routeLabel=routeValue==='auto'?tr("跟随全局：{0}",globalRoute?.name??tr("无该线路记录")):routeValue==='all'?tr("显示全部线路"):routeValue==='custom'?`${tr("自定义")} · ${visibleIds.length}`:activeRoute?.name??tr("无该线路记录");
    const routeControl=<Select sheet={mobile} aria-label={tr("查看线路")} title={routeLabel} displayValue={<><span>{routeLabel}</span>{latestRoutePoint&&<b> · {latestRoutePoint.latency===null?tr("超时"):`${Math.round(latestRoutePoint.latency)} ms`}</b>}</>} value={routeValue} onChange={e=>{setSelectedProbes(e.target.value==='auto'?null:e.target.value==='all'?'all':[Number(e.target.value)]);setExpandedRoutes(false);setHighlightProbe(null);tooltipDismiss()}}>
      <option value="auto">{tr("跟随全局：{0}",globalRoute?.name??tr("无该线路记录"))}</option>
      {pingSeries.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
      {pingSeries.length>1&&<option value="all">{tr("显示全部线路")}</option>}
      {routeValue==='custom'&&<option value="custom" disabled>{tr("自定义")} · {visibleIds.length}</option>}
      {Array.isArray(selectedProbes)&&selectedProbes.length===1&&!pingSeries.some(s=>s.id===selectedProbes[0])&&<option value={selectedProbes[0]} disabled>{tr("无该线路记录")} · {selectedProbes[0]}</option>}
    </Select>;
    const changeSection=(section:MobileSection)=>{setMobileSection(section);if(section==='resources'||section==='latency')setTab(section);tooltipDismiss();};
    const mobileStats=shownProbes.map(route=>{
        const latest=route.points.at(-1),values=route.points.flatMap(p=>p.latency!==null&&Number.isFinite(p.latency)&&p.latency>=0?[p.latency]:[]).sort((a,b)=>a-b);
        const loss=data?.loss&&Object.hasOwn(data.loss,String(route.id))?data.loss[route.id]:undefined;
        return {...route,latest,p95:values.length?values[Math.ceil(values.length*.95)-1]:null,loss:typeof loss==='number'&&Number.isFinite(loss)&&loss>=0&&loss<=100?loss:null};
    });
    const previewActive=tab==='resources';
    const previewMatches=data?.key===`${node.id}:${ranges.resources}:resources`;
    const selectPreview=(metric:ResourceTrendMetric)=>{
        setTab('resources');setResourceMetric(metric);
        requestAnimationFrame(()=>{const section=document.querySelector<HTMLElement>('.detail-history');section?.focus({preventScroll:true});section?.scrollIntoView({block:'start'});});
    };
    const mobileUpdate=loading?tr('正在更新'):failed?tr('更新失败'):updated?new Date(updated).toLocaleTimeString(locale(),{hour:'2-digit',minute:'2-digit',hour12:false}):tr('等待数据');
    return (<div className="node-detail" data-mobile-section={mobileSection}>
      {mobile?<div className="ma-detail-header"><button className="ma-icon" onClick={onBack??(()=>history.back())} aria-label={tr('返回总览')}><ArrowLeft size={20}/></button><div><NodePicker node={node} nodes={nodes} onSwitch={onSwitch}/></div></div>:<DetailIdentity node={node} nodes={nodes} onSwitch={onSwitch}/>}
      {mobile&&<nav className="ma-detail-tabs" aria-label={tr('详情分区')}>{([{key:'overview',label:tr('总览')},{key:'resources',label:tr('资源')},{key:'latency',label:tr('网络')},{key:'info',label:tr('资料')}] as const).map(({key,label})=><button key={key} aria-pressed={mobileSection===key} onClick={()=>changeSection(key)}>{label}</button>)}</nav>}
      <div className="detail-workspace">
      {mobile&&mobileSection==='overview'&&<div className="ma-detail-status"><Status node={node}/><small>{node.last_seen>0?tr('上次上报：{0}',new Date(node.last_seen*1000).toLocaleTimeString(locale())):tr('等待首次上报')}</small></div>}
      {!mobile?<DetailLiveOverview node={node} preview={{rows:previewActive&&previewMatches?metricRows:[],hours:ranges.resources,loading:previewActive&&(loading||!previewMatches),failed:previewActive&&previewMatches&&!!failed,active:previewActive,updated:previewMatches?updated:null}} onSelectResource={selectPreview}/>:mobileSection==='overview'?<MobileDetailOverview node={node} totals={mobilePreferences.totals} onNetwork={()=>changeSection('latency')} onResource={metric=>{setResourceMetric(metric);changeSection('resources');requestAnimationFrame(()=>{document.querySelector<HTMLElement>('.detail-history')?.focus({preventScroll:true});window.scrollTo(0,0)})}}/>:null}
      {(!mobile||mobileSection==='resources'||mobileSection==='latency')&&<section className="detail-history" tabIndex={-1} aria-label={tr("历史图表")}>
       {mobile&&<div className="ma-chart-heading"><h2>{tr(tab==='latency'?'网络质量':'资源历史')}</h2><small title={updated?new Date(updated).toLocaleString(locale()):undefined} data-failed={!!failed}>{mobileUpdate}</small></div>}
       {mobile&&tab==='latency'&&<div className="ma-network-summary"><div className="latency-route-controls">{routeControl}</div>
         <MobileRouteStats routes={mobileStats} comparing={expandedRoutes} color={id=>style(id).stroke} onStatistics={()=>setChartSheet('statistics')}/>

         <div className="ma-chart-scope"><span>{tr('统计：完整 {0} 小时范围',hours)}</span>{mobileStats.length===1&&!expandedRoutes&&<button className="ma-statistics-help" aria-label={tr('统计口径')} onClick={()=>setChartSheet('statistics')}>ⓘ</button>}{pingSeries.length>1&&<button type="button" aria-expanded={expandedRoutes} onClick={()=>setExpandedRoutes(v=>!v)}>{expandedRoutes?tr('收起线路'):tr('比较线路')}</button>}</div>
       </div>}
       <DetailToolbar mobile={mobile} onSettings={()=>setChartSheet('settings')} busy={loading} updated={updated} failed={!!failed} tab={tab} hours={hours} onTab={setTab} onHours={value=>setRanges(all=>({...all,[tab]:value}))} onRefresh={refresh} resourceMetric={resourceMetric} onResourceMetric={setResourceMetric} smooth={smooth} onSmooth={setSmooth}/>
      {eventStart>0&&<p className="event-context">{tr('告警时段：{0} — {1}',new Date(eventStart).toLocaleString(locale()),new Date(eventEnd).toLocaleString(locale()))}{age>168||hours<age?<span>{tr('当前历史范围无法覆盖完整告警时段。')}</span>:data&&!(data.metrics??[]).some(p=>p.ts*1000>=eventStart&&p.ts*1000<=eventEnd)?<span>{tr('此告警时段没有返回历史样本。')}</span>:null}</p>}
      {failed && <div className="history-notice" role="alert"><span>{data && (data.metrics?.length || data.ping?.length)?tr("更新失败，保留上次历史记录。"):tr("读取历史数据失败：")}{failed}{updated!==null && data && (data.metrics?.length || data.ping?.length)?<small className="history-retained-time">{tr("上次成功更新：{0}",new Date(updated).toLocaleString(locale()))}</small>:null}</span><button disabled={loading} onClick={refresh}>{tr("重试")}</button></div>}
      <div className="detail-history-body" data-history={tab}>
      {!data ? (<HistoryState loading={!failed} failed={!!failed} message={failed?tr("暂无可用历史数据"):tr("正在读取历史数据")}/>) : failed && !data.metrics?.length && !data.ping?.length ? (<HistoryState failed message={tr("暂无可用历史数据")}/>) : tab === "latency" ? (pingSeries.length === 0 ? (<HistoryState message={tr("这段时间没有延迟数据")} action={tr("调整时间范围")} onAction={chooseRange}/>) : (
         <div className="latency-view">
            {!mobile&&<div className="latency-route-controls">{routeControl}{pingSeries.length>1&&<button type="button" className="expand-routes" aria-label={expandedRoutes?tr("收起线路"):tr("比较线路")} aria-expanded={expandedRoutes} onClick={()=>setExpandedRoutes(v=>!v)}>{expandedRoutes?tr("收起线路"):tr("比较线路")}</button>}</div>}
            {(expandedRoutes||!mobile&&shownProbes.length>1)&&<div ref={legend} className="route-chips" role="group" aria-label={tr("线路图例")} data-expanded={expandedRoutes}>
              <div className="route-chip-list">
                {(expandedRoutes?pingSeries:collapsedRoutes).map(s=>{const latest=s.points.at(-1),shown=visibleIds.includes(s.id);return <button key={s.id} aria-label={s.name} aria-pressed={shown} title={`${s.name} · ${latest?tr("采样：{0}",new Date(latest.ts*1000).toLocaleString(locale())):tr("暂无探测记录")}`} onMouseEnter={()=>setHighlightProbe(s.id)} onMouseLeave={()=>setHighlightProbe(null)} onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setHighlightProbe(s.id)}} onBlur={()=>setHighlightProbe(null)} onClick={()=>{setExpandedRoutes(true);setSelectedProbes(shown?visibleIds.filter(id=>id!==s.id):[...visibleIds,s.id])}}><i className="route-chip-check" aria-hidden="true">{shown?'✓':''}</i><svg width="20" height="8" aria-hidden="true"><line x1="0" y1="4" x2="20" y2="4" stroke={style(s.id).stroke} strokeWidth="2"/></svg><span>{s.name}</span><b>{!latest?'—':latest.latency===null?tr("超时"):`${Math.round(latest.latency)} ms`}</b></button>})}
              </div>
            </div>}
            <div className="latency-chart-caption"><span>{tr("延迟")} · ms</span><span className="latency-chart-key" style={{color:'var(--muted-foreground)','--latency-key-color':activeRoute?style(activeRoute.id).stroke:undefined} as React.CSSProperties}>{shownProbes.length===1&&<><i className="latency-band-key"/><span title={tr("采样范围（最小–最大）")}>{tr("采样范围")}</span></>}<i className="latency-line-key"/>{smooth?tr("抑制尖峰"):tr("采样中位值")}</span></div>
            <div className="detail-chart-frame text-muted-foreground" title={tr("拖动两端缩放 · 双击恢复全范围")} onDoubleClick={()=>{setZoom(null);tooltipDismiss()}} ref={tooltipFrame} onClickCapture={tooltipClick} onPointerMove={tooltipMove} onKeyDownCapture={tooltipKey}>
              {shownProbes.length === 0 ? (<HistoryState message={(selectedProbes?.length || selectedProbes === null && probe !== "auto") ? tr("无该线路记录") : tr("没有选中任何探测")} action={tr("选择线路")} onAction={openRoutes}/>) : !shownProbes.some(s=>s.points.length) ? <HistoryState message={tr("这段时间没有延迟数据")} action={tr("调整时间范围")} onAction={chooseRange}/> : (<ResponsiveContainer>
                  <ComposedChart data={mobile?mobileChartRows:pingRows}>
                    <CartesianGrid strokeDasharray="3 5" stroke="var(--border)" vertical={false}/>
                    <XAxis height={compact?30:68} {...(mobile?timeAxis(mobileChartRows):timeAxis(pingRows, Math.min(zoom?.[0] ?? 0, pingRows.length - 1), Math.min(zoom?.[1] ?? pingRows.length - 1, pingRows.length - 1)))}/>
                    {/* Not anchored at zero: these lines live in a narrow band
                    far from it, and zero flattens every wobble. */}
                    <YAxis width={axisWidth} domain={["auto", "auto"]} {...AXIS}/>
                    <Tooltip filterNull={!mobile} itemSorter={item=>{const id=Number(String(item.dataKey).slice(1));const index=pingSeries.findIndex(s=>s.id===id);return index}} content={props=><ChartTooltip {...props} compact={compact} dismiss={tooltipDismiss}/>} wrapperStyle={{pointerEvents:'auto'}} trigger={compact?"click":"hover"} allowEscapeViewBox={{x:false,y:false}} cursor={{stroke:"var(--border)",strokeDasharray:"3 4"}} isAnimationActive={false} labelFormatter={(ts) => new Date(Number(ts)).toLocaleString(locale())}
            // The line is drawn from what answered, so without this a
            // bucket that lost most of its packets reads as normal.
            // `dataKey` is `t7`/`s7`; the loss sits at `l7`.
            formatter={(v, name, item) => {
                    const band=item?.payload?.[`b${String(item.dataKey).slice(1)}`];
                    const loss = item?.payload?.[`l${String(item.dataKey).slice(1)}`];
                    if(mobile){
                        const raw=item?.payload?.[`t${String(item.dataKey).slice(1)}`];
                        const hasLoss=typeof loss==='number'&&Number.isFinite(loss);
                        return [<><span>{typeof raw==='number'&&Number.isFinite(raw)?`${Number(raw.toFixed(1))} ms`:raw===null&&hasLoss&&loss===100?tr('超时'):tr('无有效延迟采样')}</span>{Array.isArray(band)&&<small className="tooltip-loss">{tr('采样范围')} {band.map((n:number)=>Number(n.toFixed(1))).join('–')} ms</small>}<small className="tooltip-loss">{tr('丢包')} {hasLoss?`${loss.toFixed(1)}%`:tr('未统计')}</small></>,name];
                    }
                    return [<><span>{Number.isFinite(Number(v))?Number(Number(v).toFixed(1)):"—"} ms</span>{Array.isArray(band)&&<small className="tooltip-loss">{tr("采样范围")} {band.map((n:number)=>Number(n.toFixed(1))).join('–')} ms</small>}{loss == null ? <small className="tooltip-loss"> · {tr("丢")} —</small> : <small className="tooltip-loss">{tr(" \u00B7 丢 {0}%",loss)}</small>}</>, name];
                }} contentStyle={{ fontSize: 12 }}/>
                    {/* Behind the line, the range that bucket's answers
                    spanned -- Smokeping's "smoke". At the day window a
                    bucket moves 63 ms at the 90th percentile against the
                    25 ms the trend moves, so a line alone draws the smaller
                    of the two.

                    Only with one probe on screen: rendered for four, the
                    bands overlap into a fog and their extremes drag the
                    axis from 165-385 out to 140-420. */}
                    {shownProbes.length === 1 &&
                    shownProbes.map((s) => (<Area className="detail-latency-band" key={`band${s.id}`} dataKey={`b${s.id}`} stroke="none" fill={style(s.id).stroke} fillOpacity={0.07} isAnimationActive={false} tooltipType="none" legendType="none" connectNulls={false}/>))}
                    {shownProbes.map((s) => (<Line className="detail-latency-line" key={s.id} dataKey={`${smooth ? "s" : "t"}${s.id}`} name={s.name} stroke={style(s.id).stroke} {...SERIES} strokeOpacity={highlightProbe!==null && visibleIds.includes(highlightProbe) && highlightProbe!==s.id ? 0.2 : 1} onMouseEnter={()=>{if(!compact)setHighlightProbe(s.id)}} onMouseLeave={()=>{if(!compact)setHighlightProbe(null)}} connectNulls={false}/>))}
                    {/* Drag either handle to zoom into a stretch of the trend. */}
                    {!mobile&&<Brush ariaLabel={tr("时间范围")} dataKey="ts" height={44} travellerWidth={compact?44:12} startIndex={zoom?.[0]??0} endIndex={zoom?.[1]??pingRows.length-1} tickFormatter={clockFor(hours)} fill="var(--card)" className="latency-brush" stroke="var(--border)" onChange={(r) => {tooltipDismiss();setZoom([r.startIndex ?? 0, r.endIndex ?? pingRows.length - 1])}}>
                      <AreaChart data={pingRows}><XAxis xAxisId="preview" dataKey="ts" type="number" domain={['dataMin','dataMax']} hide/><Area xAxisId="preview" dataKey={`t${activeRoute?.id}`} stroke={activeRoute?style(activeRoute.id).stroke:"var(--latency-line-1)"} fill={activeRoute?style(activeRoute.id).stroke:"var(--latency-line-1)"} fillOpacity={.07} strokeWidth={1} isAnimationActive={false} connectNulls={false}/></AreaChart>
                    </Brush>}
                  </ComposedChart>
                </ResponsiveContainer>)}
              {!compact&&pingRows.length>0&&<div className="latency-range-heading"><span>{tr("时间范围")} <b>{clockFor(hours)(rangeStart)} — {clockFor(hours)(rangeEnd)}</b></span><span>{zoomed&&<button onClick={()=>{setZoom(null);tooltipDismiss()}}>{tr("恢复范围")}</button>}</span></div>}
            </div>
            {compact&&pingRows.length>0&&<div className="latency-range-caption"><span>{clockFor(hours)(rangeStart)} – {clockFor(hours)(rangeEnd)}</span>{!mobile&&zoomed&&<button onClick={()=>{setZoom(null);tooltipDismiss()}}>{tr("恢复范围")}</button>}</div>}
            {mobile&&pingRows.length>1&&shownProbes.length>0&&<><div className="ma-chart-zoom-actions"><button aria-expanded={zoomExpanded} aria-controls="ma-chart-zoom" onClick={()=>setZoomExpanded(v=>!v)}>{tr(zoomExpanded?'收起缩放':'缩放时间范围')}</button>{zoomed&&<button onClick={()=>{setZoom(null);tooltipDismiss()}}>{tr('恢复全范围')}</button>}</div>{zoomExpanded&&<div id="ma-chart-zoom" className="ma-chart-zoom"><p>{tr('仅调整当前图表视野；摘要统计仍使用完整查询范围。')}</p><div className="ma-chart-zoom-presets">{[15,30].map(minutes=><button key={minutes} type="button" disabled={quickStart(minutes)>=pingRows.length-1} onClick={()=>{setZoom([quickStart(minutes),pingRows.length-1]);tooltipDismiss()}}>{tr('最近 {0} 分钟',minutes)}</button>)}</div><label>{tr('开始时间')}<output>{new Date(rangeStart).toLocaleString(locale())}</output><input aria-label={tr('开始时间')} type="range" min={0} max={pingRows.length-2} value={zoom?.[0]??0} aria-valuetext={new Date(rangeStart).toLocaleString(locale())} onChange={e=>{const start=Number(e.target.value);setZoom([start,Math.max(start+1,zoom?.[1]??pingRows.length-1)]);tooltipDismiss()}}/></label><label>{tr('结束时间')}<output>{new Date(rangeEnd).toLocaleString(locale())}</output><input aria-label={tr('结束时间')} type="range" min={1} max={pingRows.length-1} value={zoom?.[1]??pingRows.length-1} aria-valuetext={new Date(rangeEnd).toLocaleString(locale())} onChange={e=>{const end=Number(e.target.value);setZoom([Math.min(end-1,zoom?.[0]??0),end]);tooltipDismiss()}}/></label></div>}</>}
            {shownProbes.length>0&&pingRows.length>0&&<LossTrack showRoute={mobile} selected={activeRoute?.id} key={`${node.id}:${hours}:${activeRoute?.id}`} series={shownProbes} preferred={defaultProbe} start={pingRows[Math.min(zoom?.[0]??0,pingRows.length-1)].ts} end={pingRows[Math.min(zoom?.[1]??pingRows.length-1,pingRows.length-1)].ts}/>}
          </div>)) : (data.metrics ?? []).length === 0 ? (<HistoryState message={tr("这段时间没有历史数据")} action={tr("调整时间范围")} onAction={chooseRange}/>) : (<ResourceHistory compact={compact} mobile={mobile} rows={metricRows} node={node} hours={hours} metric={resourceMetric}/>)}
      </div></section>}

      {(!mobile||mobileSection==='info')&&<DetailFacts node={node} compact={mobile?false:compact} mobile={mobile} mode={detailInfoMode} onMode={onDetailInfoMode}/>}
      {mobile&&mobileSection==='info'&&<section className="ma-panel ma-info-extra"><div className="ma-row"><span>{tr('名称')}</span><small>{node.name}</small></div><div className="ma-row"><span>{tr('节点分组')}</span><small>{node.group||tr('未分组')}</small></div>{node.remark&&<MobileRemarks text={node.remark}/>}</section>}
      </div>
      {mobile&&chartSheet&&<ChartSettingsSheet kind={chartSheet} onClose={()=>setChartSheet(null)} smooth={smooth} onSmooth={setSmooth}/>}
    </div>);
}
