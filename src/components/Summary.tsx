import {LoadAlertTile} from './LoadAlertTile'
import type {LoadAlert} from '@/lib/loadAlerts'
import {liveMetrics} from '@/lib/freshness'
import { regionKey, UNKNOWN_REGION } from '@/lib/groups'
import { tr, locale } from '../lib/i18n.ts'
import { ArrowDown, ArrowDownUp, ArrowUp, Gauge, Server, Globe, Clock } from "lucide-react";
import { useEffect, useState } from 'react';
import type { Preferences } from '@/lib/appearance';
import { Card } from "@/components/ui/card";
import { speedHistory, type Node } from "@/lib/api";
import { bytes, rate } from "@/lib/format";
import { cn } from "@/lib/utils";
function Tile({ icon: Icon, label, notice, children }: {
    icon: typeof Server;
    label: string;
    notice?: string;
    children: React.ReactNode;
}) {
    return (<Card className="gap-0 p-3">
      <div className="summary-tile-heading text-xs text-muted-foreground">
        <span className="summary-tile-label"><Icon className="size-3.5"/>{label}</span>
        {notice&&<small className="summary-tile-notice">{notice}</small>}
      </div>
      {children}
    </Card>);
}
/**
 * In and out side by side, the form every traffic figure on this page takes.
 * Stacked below sm, where two tiles share a phone's width and "23.3 MB" has
 * roughly 70px available.
 */
function Flow({ down, up, className }: {
    down: string;
    up: string;
    className?: string;
}) {
    return (<div className={cn("summary-flow tnum grid grid-cols-1 gap-x-2 sm:grid-cols-2", className)}>
      <span className="download inline-flex items-center gap-1">
        <ArrowDown className="size-3 shrink-0 text-muted-foreground"/>
        {down}
      </span>
      <span className="upload inline-flex items-center gap-1">
        <ArrowUp className="size-3 shrink-0 text-muted-foreground"/>
        {up}
      </span>
    </div>);
}
/**
 * A bare polyline with no axes or tooltips: at this size only the shape is
 * legible, and recharts would bring a full chart's machinery for it. Series share
 * one scale so the two throughput lines remain comparable.
 */
function Spark({ series }: {
    series: {
        values: number[];
        className: string;
    }[];
}) {
    const top = Math.max(...series.flatMap((s) => s.values), 1);
    const width = Math.max(...series.map((s) => s.values.length), 2) - 1;
    return (<svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-7 w-full" aria-hidden>
      {series.map((s, i) => (<polyline key={i} className={s.className} fill="none" stroke="currentColor" strokeWidth={1.25} vectorEffect="non-scaling-stroke" points={s.values.map((v, x) => `${(x / width) * 100},${23 - (v / top) * 22}`).join(" ")}/>))}
    </svg>);
}
function CurrentTime() {
    const [time, setTime] = useState(() => new Date());
    useEffect(() => { const timer = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(timer); }, []);
    return <Tile icon={Clock} label={tr("当前时间")}><strong className="summary-time">{time.toLocaleTimeString(locale(), { hour12: false })}</strong><small className="text-muted-foreground">{time.toLocaleDateString(locale())}{tr("\u00B7 本地时间")}</small></Tile>;
}
export function Summary({ nodes, prefs, loadAlerts, onAlert, status, onStatus, onCollapse }: {
    nodes: Node[];
    status:string; onStatus:(value:string)=>void; onCollapse:(value:boolean)=>void;
    prefs: Preferences;
    loadAlerts: {events:LoadAlert[];saved:boolean};
    onAlert:(event:LoadAlert)=>void;
}) {
    const online = nodes.filter((n) => n.online);
    const fresh = online.filter(n=>liveMetrics(n));
    const unavailable = online.length-fresh.length;
    const sum = (pick: (n: Node) => number) => nodes.reduce((total, n) => total + pick(n), 0);
    // Current totals exclude expired samples even before a new push arrives.
    const now = {rx:fresh.reduce((s,n)=>s+n.metrics!.net_rx,0),tx:fresh.reduce((s,n)=>s+n.metrics!.net_tx,0)};
    const regions = new Set(nodes.map(n => regionKey(n.country)).filter(c => c !== UNKNOWN_REGION));
    if (!Object.entries(prefs.modules).some(([key, on]) => key !== 'map' && on))
        return null;
    return (<div className="overview-summary" data-collapsed={prefs.summaryCollapsed}><button className="summary-toggle" aria-expanded={!prefs.summaryCollapsed} onClick={()=>onCollapse(!prefs.summaryCollapsed)}>{prefs.summaryCollapsed?tr("展开总览"):tr("收起总览")}</button>
    <div className="summary-compact">
      {prefs.modules.online&&<><button aria-pressed={status==='online'} onClick={()=>onStatus(status==='online'?'all':'online')}>{tr("在线")} {online.length}/{nodes.length}</button><button aria-pressed={status==='offline'} onClick={()=>onStatus(status==='offline'?'all':'offline')}>{tr("离线")} {nodes.length-online.length}</button></>}
      {prefs.modules.speed&&<span>{tr("实时网速")} <b>{fresh.length?rate(now.rx+now.tx):'—'}</b></span>}
      {prefs.modules.busiest&&<span>{tr("高负载")} {loadAlerts.events.filter(e=>e.status==='active').length}</span>}
      {!prefs.modules.online&&!prefs.modules.speed&&!prefs.modules.busiest&&<span>{tr("总览已收起")}</span>}
    </div><div className="summary-grid grid gap-3" data-load-alerts={prefs.modules.busiest}>
      {prefs.modules.online && <Tile icon={Server} label={tr("节点")}>
        <div className="summary-node-count tnum mt-1 text-xl font-semibold">
          <button aria-label={tr("筛选在线节点")} aria-pressed={status==='online'} onClick={()=>onStatus(status==='online'?'all':'online')}><span>{tr("在线")}</span><b>{online.length}</b></button><span aria-hidden="true">/</span><button aria-label={tr("显示全部节点")} aria-pressed={status==='all'} onClick={()=>onStatus('all')}><span>{tr("全部")}</span><b>{nodes.length}</b></button>
        </div>
        
        <div className="mt-auto pt-1 text-xs text-muted-foreground">
          <button className="summary-offline-filter" data-attention={nodes.length>online.length?'offline':unavailable>0?'pending':undefined} aria-label={tr("筛选离线节点")} aria-pressed={status==='offline'} onClick={()=>onStatus(status==='offline'?'all':'offline')}>{unavailable > 0 ? tr("{0} 离线 · {1} 待更新", nodes.length-online.length, unavailable) : nodes.length - online.length > 0 ? tr("{0} 个离线", nodes.length - online.length) : tr("全部在线")}</button>
        </div>
      </Tile>}

      {prefs.modules.traffic && <Tile icon={ArrowDownUp} label={tr("今日流量")}>
        <strong className="summary-total">{bytes(sum(n=>n.day_rx+n.day_tx))}</strong>
        <Flow down={bytes(sum((n) => n.day_rx))} up={bytes(sum((n) => n.day_tx))} className="mt-1 text-sm font-semibold"/>
      </Tile>}

      {prefs.modules.speed && <Tile icon={Gauge} label={tr("实时网速")} notice={unavailable>0?tr("{0} 个节点暂无实时数据",unavailable):undefined}>
        <strong className="summary-total">{fresh.length?rate(now.rx+now.tx):'—'}</strong>
        <Flow down={fresh.length?rate(now.rx):"—"} up={fresh.length?rate(now.tx):"—"} className="mt-1 text-sm font-semibold"/>
        {fresh.length>0 && <div className="mt-auto pt-1">
          <Spark series={[
                    { values: speedHistory.map((s) => s.rx), className: "download" },
                    { values: speedHistory.map((s) => s.tx), className: "upload" },
                ]}/>
        </div>}
      </Tile>}
      {prefs.modules.busiest && <LoadAlertTile {...loadAlerts} onOpen={onAlert} available={nodes.map(n=>n.id)}/>}
      {prefs.modules.regions && <Tile icon={Globe} label={tr("地区统计")}><div className="tnum mt-1 text-xl font-semibold">{regions.size}{tr("个地区")}</div><small className="text-muted-foreground">{nodes.filter(n => regionKey(n.country) === UNKNOWN_REGION).length}{tr("个节点未定位")}</small></Tile>}
      {prefs.modules.clock && <CurrentTime />}
    </div></div>);
}
