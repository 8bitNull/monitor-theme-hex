import {useId,useState} from 'react'
import type {OpenRoutes} from '@/lib/routeSelection'
import {liveMetrics,nodeState} from '@/lib/freshness'
import {SpeedIndicators} from './SpeedIndicators'
import {ResourceMetric} from './ResourceMetric'
import {Status} from './NodeIdentity'
import { locale, tr } from '../lib/i18n.ts'
import { Clock3, Server, ArrowDownUp, CalendarDays } from 'lucide-react';
import type { Node } from '@/lib/api';
import type { Preferences, CardInfo } from '@/lib/appearance';
import { Flag, OsIcon } from './NodeIcons';
import { PingStats } from '@/components/PingStats';
import { RemarkTags } from './RemarkTags';
import { bytes, daysUntil, FOREVER, osName, pair, percent, relativeTime, uptime, money, CYCLES } from '@/lib/format';
import { trafficPeriodLabel, trafficUsage } from '@/lib/traffic';
export function NodeCard({ node, authed, onOpen, onOpenRoutes, probe = 'auto', prefs, info = prefs.cardInfo, mobile = false, density='detailed' }: {
    node: Node;
    authed: boolean;
    onOpen: () => void;
    onOpenRoutes: (route:OpenRoutes) => void;
    probe?: string;
    prefs: Preferences;
    info?: CardInfo;
    mobile?: boolean;
    density?: 'compact'|'detailed';
}) {
    const notes = (info.remarks ? node.remark ?? "" : "").split(/[;；]/).map(text=>text.trim()).filter(Boolean);
    const supplementaryId=useId();
    const notesText=notes.join(' · ');
    const offline = !node.online;
    // These zeros are presentation values for the card; live telemetry remains unavailable.
    const m = offline ? {cpu:0,mem_used:0,mem_total:node.mem_total,disk_used:0,disk_total:node.disk_total,load:[0,0,0],uptime:0,tcp:0,udp:0} : liveMetrics(node);
    const uptimeText=offline?tr('{0} 分',0):m?uptime(m.uptime):'—';
    // Keep the last online wrapping when the shorter zero replaces uptime.
    const [uptimeSlot,setUptimeSlot]=useState(uptimeText);
    if(!offline&&uptimeSlot!==uptimeText)setUptimeSlot(uptimeText);
    const traffic = trafficUsage(node);
    const used = traffic.value;
    const trafficLabel = tr(trafficPeriodLabel(node));
    const trafficHint = tr("流量周期：每月 {0} 日重置，本周期自 {1} 起", traffic.resetDay, traffic.periodKey);
    const quotaPercent = node.traffic_limit > 0 ? used / node.traffic_limit * 100 : null;
    const quotaState = quotaPercent === null ? 'unlimited' : quotaPercent > 100 ? 'over' : quotaPercent >= 80 ? 'near' : 'normal';
    const quotaExhausted=info.traffic&&node.traffic_limit>0&&used>=node.traffic_limit;
    const days = daysUntil(node.expires_at);
    const expiry = days === null ? tr("未设到期") : days < 0 ? tr("已到期") : days === 0 ? tr("今天到期") : tr("剩余 {0} 天", days);
    const highCpu = m !== null && m.cpu >= 85 ? Math.round(m.cpu) : null;
    const [cpuNotice,setCpuNotice]=useState(highCpu);
    if(!offline&&cpuNotice!==highCpu)setCpuNotice(highCpu);
    const expiring = info.expiry && days !== null && days <= 7;
    const reported = node.last_seen > 0 ? new Date(node.last_seen * 1000) : null;
    const reportTime = reported && Number.isFinite(reported.getTime()) ? reported : null;
    const reportHint = reportTime ? `${tr("最近上报时间")}：${relativeTime(node.last_seen)} · ${reportTime.toLocaleString(locale())}` : tr("上次上报时间未知");
    const showPrice = authed && info.price && node.price > 0;
    const hasSecondary = showPrice || notes.length > 0;
    const secondary = hasSecondary && <div className="node-secondary"><section className="node-more" aria-label={tr("更多信息")}>
      <div className="node-footer">
        {notes.length > 0 && <div className="node-remarks" aria-label={tr("备注")} title={notesText}><RemarkTags texts={notes}/></div>}

        {showPrice && <span className="tag node-price">{money(node.price, node.currency)} / {tr(Object.hasOwn(CYCLES, node.billing_cycle) ? CYCLES[node.billing_cycle] : node.billing_cycle)}</span>}
      </div>
    </section></div>;
    const billing = (info.traffic || info.expiry || info.uptime) && <div className="card-billing">
      {info.traffic && <div className="network-box traffic-summary" data-quota-state={quotaState} title={trafficHint}><div><span className="billing-label"><ArrowDownUp size={12} aria-hidden="true"/><small>{trafficLabel}</small></span><b className="billing-used">{bytes(used)}</b></div><small className="billing-allowance">{tr("额度 {0}",node.traffic_limit > 0 ? bytes(node.traffic_limit) : FOREVER)}</small></div>}
      {info.expiry && <div className={`card-expiry ${days !== null && days <= 7 ? 'expiring' : ''}`} data-expiry-state={days===null?'unknown':days<0?'expired':days<=7?'soon':'normal'}><span className="billing-label"><CalendarDays size={12} aria-hidden="true"/>{tr("到期时间")}</span><b>{days !== null && node.expires_at ? node.expires_at.replaceAll('-','.') : '—'}</b><small className="billing-remaining">{days!==null&&days>=0&&days<=7&&<i className="expiry-dot" aria-hidden="true"/>}{expiry}</small></div>}
      {info.uptime && <div className="card-uptime"><span className="billing-label"><Clock3 size={12} aria-hidden="true"/>{tr("在线时长")}</span><b>{offline?<><span className="offline-value-space" aria-hidden="true">{uptimeSlot}</span><span className="offline-value-zero">{uptimeText}</span></>:uptimeText}</b></div>}
    </div>;
    const connections=info.connections&&<div className="node-connections">{([['TCP',m?.tcp],['UDP',m?.udp]] as const).map(([label,value])=><div key={label}><span>{label}</span><b>{value === undefined ? '—' : value.toLocaleString()}</b></div>)}</div>;
    const hasSupplementary=Boolean(billing||secondary);
    return <article data-density={prefs.layout==='compact'?'overview':'full'} data-card-density={density} data-indicator={prefs.graph} data-metric-state={nodeState(node)} className={`node-card compact-network-card graphic-card ${offline ? 'node-offline' : ''}`}>
    <button data-node-id={node.id} className="node-open" title={offline ? reportHint : undefined} onClick={onOpen} aria-label={tr("查看 {0}", node.name)}>
      <div className="node-heading"><div className="node-symbol">{node.country ? (prefs.icons ? <Flag code={node.country} key={node.country}/> : node.country) : <Server size={20}/>}</div><div className="node-identity"><div className="node-name-row"><h3 title={node.name}>{node.name}</h3>{(cpuNotice !== null || (mobile && expiring)) && <span className="card-issue">{cpuNotice !== null && <span className="card-cpu-issue" aria-hidden={offline||undefined}>{tr("高负载")} · CPU {cpuNotice}%</span>}{mobile && expiring && <span className={days!==null&&days<0?'is-expired':undefined}>{days!==null&&days>0&&<>{tr("即将到期")} · </>}{expiry}</span>}</span>}</div><div className="node-os-row"><p>{prefs.icons && node.os && <OsIcon os={node.os} key={node.os}/>}{mobile?(node.os ? osName(node.os) : tr("等待首次上报")):<span className="node-os-name">{node.os ? osName(node.os) : tr("等待首次上报")}</span>}</p>{(node.ipv4 || node.ipv4_pin || node.ipv6 || node.ipv6_pin) && <div className="node-ip-tags" aria-label={tr("IP 协议")} >{(node.ipv4 || node.ipv4_pin) && <span className="tag">V4</span>}{(node.ipv6 || node.ipv6_pin) && <span className="tag">V6</span>}</div>}{!mobile && expiring && <span className="card-issue card-expiry-tag"><span className={days!==null&&days<0?'is-expired':undefined}>{days!==null&&days>0?tr("{0} 天后到期",days):expiry}</span></span>}{!mobile&&quotaExhausted&&<span className="card-issue card-quota-tag"><span>{tr('流量额度已用尽')}</span></span>}</div></div><div className="node-status-group"><Status node={node}/></div></div>
      <div className="resources"><ResourceMetric label="CPU" value={m?.cpu ?? null} foot={tr("{0} 核", node.cpu_cores)}/><ResourceMetric label={tr("内存")} value={m ? percent(m.mem_used, m.mem_total) : null} foot={m ? (prefs.showTotals ? pair(m.mem_used, m.mem_total) : bytes(m.mem_used)) : tr("容量 {0}", bytes(node.mem_total))}/><ResourceMetric label={tr("硬盘")} value={m ? percent(m.disk_used, m.disk_total) : null} foot={m ? (prefs.showTotals ? pair(m.disk_used, m.disk_total) : bytes(m.disk_used)) : tr("容量 {0}", bytes(node.disk_total))}/><ResourceMetric label={tr("负载")} value={m && node.cpu_cores > 0 ? m.load[0] / node.cpu_cores * 100 : null} displayValue={m ? m.load[0].toFixed(2) : "—"} foot={tr("1 分钟 · {0} 核",node.cpu_cores)}/></div>
      <div className="card-network">
        {!mobile && density==='detailed' && connections && <div className="card-network-heading"><span>{tr('实时网络')}</span>{connections}</div>}
        <SpeedIndicators key={node.id} node={node} zeroOffline sharedEmpty={!mobile}/>
        {mobile&&connections}
      </div>
    </button>
      {mobile && billing && <div className="mobile-card-extra">{billing}</div>}
      <PingStats showStaleRecord={mobile} scale={prefs.latencyScale} latencyWindow={prefs.latencyWindow} warn={prefs.latencyWarn} high={prefs.latencyHigh} count={prefs.homeRoutes} online={node.online} id={node.id} probe={probe} onOpenRoutes={onOpenRoutes}/>
      {mobile && secondary && <div className="mobile-card-extra">{secondary}</div>}
      {!mobile&&(density==='detailed'?hasSupplementary:hasSecondary)&&<section id={supplementaryId} className="node-supplementary" aria-label={tr('更多信息')}>{density==='detailed'&&billing}{secondary}</section>}
  </article>;
}
