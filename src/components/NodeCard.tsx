import {useId,useRef,useState} from 'react'
import type {OpenRoutes} from '@/lib/routeSelection'
import {liveMetrics,nodeState} from '@/lib/freshness'
import {SpeedIndicators} from './SpeedIndicators'
import {ResourceMetric} from './ResourceMetric'
import {Status} from './NodeIdentity'
import { locale, tr } from '../lib/i18n.ts'
import { Clock3, Server, ArrowDownUp, CalendarDays, ChevronDown } from 'lucide-react';
import type { Node } from '@/lib/api';
import type { Preferences, CardInfo } from '@/lib/appearance';
import { Flag, OsIcon } from './NodeIcons';
import { PingStats } from '@/components/PingStats';
import { RemarkTags } from './RemarkTags';
import { bytes, daysUntil, FOREVER, osName, pair, percent, uptime, money, CYCLES } from '@/lib/format';
import { trafficPeriodLabel, trafficUsage } from '@/lib/traffic';
export function NodeCard({ node, onOpen, onOpenRoutes, probe = 'auto', prefs, info = prefs.cardInfo, mobile = false, density='detailed' }: {
    node: Node;
    onOpen: () => void;
    onOpenRoutes: (route:OpenRoutes) => void;
    probe?: string;
    prefs: Preferences;
    info?: CardInfo;
    mobile?: boolean;
    density?: 'compact'|'detailed';
}) {
    const [secondaryOpen,setSecondaryOpen]=useState(false);
    const notes = (info.remarks ? node.remark ?? "" : "").split(/[;；]/).map(text=>text.trim()).filter(Boolean);
    const notesId=useId();
    const notesDialog=useRef<HTMLDialogElement>(null);
    const notesText=notes.join(' · ');
    const m = liveMetrics(node);
    const traffic = trafficUsage(node);
    const used = traffic.value;
    const trafficLabel = tr(trafficPeriodLabel(node));
    const trafficHint = tr("流量周期：每月 {0} 日重置，本周期自 {1} 起", traffic.resetDay, traffic.periodKey);
    const quotaPercent = node.traffic_limit > 0 ? used / node.traffic_limit * 100 : null;
    const quotaState = quotaPercent === null ? 'unlimited' : quotaPercent > 100 ? 'over' : quotaPercent >= 80 ? 'near' : 'normal';
    const quotaExhausted=info.traffic&&node.traffic_limit>0&&used>=node.traffic_limit;
    const days = daysUntil(node.expires_at);
    const expiry = days === null ? tr("未设到期") : days < 0 ? tr("已到期") : days === 0 ? tr("今天到期") : tr("剩余 {0} 天", days);
    const highCpu = m !== null && m.cpu >= 85;
    const expiring = info.expiry && days !== null && days <= 7;
    const offline = !node.online;
    const showSecondary=mobile||density==='detailed'||secondaryOpen;
    const reported = node.last_seen > 0 ? new Date(node.last_seen * 1000) : null;
    const reportTime = reported && Number.isFinite(reported.getTime()) ? reported : null;
    const hasSecondary = (info.price && node.price > 0) || notes.length > 0;
    const secondary = hasSecondary && <div className="node-secondary"><section className="node-more" aria-label={tr("更多信息")}>
      <div className="node-footer">
        {notes.length > 0 && <><button type="button" className="node-remarks" aria-label={tr("备注")} title={notesText} aria-haspopup="dialog" onClick={()=>notesDialog.current?.showModal()}><RemarkTags texts={notes.slice(0,3)} compact/>{notes.length>3&&<span className="remark-more">+{notes.length-3}</span>}</button><dialog ref={notesDialog} className="card-notes-dialog" aria-labelledby={notesId} onClick={event=>{if(event.target===event.currentTarget){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.currentTarget.close()}}}><div className="card-notes-heading"><h2 id={notesId}>{tr("备注")}</h2><button type="button" autoFocus onClick={()=>notesDialog.current?.close()}>{tr("关闭")}</button></div><p>{notes.join('\n')}</p></dialog></>}

        {info.price && node.price > 0 && <span className="tag node-price">{money(node.price, node.currency)} / {tr(Object.hasOwn(CYCLES, node.billing_cycle) ? CYCLES[node.billing_cycle] : node.billing_cycle)}</span>}
      </div>
    </section></div>;
    const billing = (info.traffic || info.expiry || (!offline && info.uptime)) && <div className="card-billing">
      {info.traffic && <div className="network-box traffic-summary" data-quota-state={quotaState} title={trafficHint}><div><span className="billing-label"><ArrowDownUp size={12} aria-hidden="true"/><small>{trafficLabel}</small></span><b className="billing-used">{bytes(used)}</b></div><small className="billing-allowance">{tr("额度 {0}",node.traffic_limit > 0 ? bytes(node.traffic_limit) : FOREVER)}</small></div>}
      {info.expiry && <div className={`card-expiry ${days !== null && days <= 7 ? 'expiring' : ''}`} data-expiry-state={days===null?'unknown':days<0?'expired':days<=7?'soon':'normal'}><span className="billing-label"><CalendarDays size={12} aria-hidden="true"/>{tr("到期时间")}</span><b>{days !== null && node.expires_at ? node.expires_at.replaceAll('-','.') : '—'}</b><small>{days!==null&&days>=0&&days<=7&&<i className="expiry-dot" aria-hidden="true"/>}{expiry}</small></div>}
      {!offline && info.uptime && <div className="card-uptime"><span className="billing-label"><Clock3 size={12} aria-hidden="true"/>{tr("在线时长")}</span><b>{m ? uptime(m.uptime) : '—'}</b></div>}
    </div>;
    const hasDisclosure=!mobile&&density==='compact'&&Boolean(billing||(!offline&&info.connections)||secondary);
    return <article data-density={prefs.layout==='compact'?'overview':'full'} data-card-density={density} data-indicator={prefs.graph} data-metric-state={nodeState(node)} className={`node-card compact-network-card graphic-card ${offline ? 'node-offline' : ''}`}>
    <button data-node-id={node.id} className="node-open" onClick={onOpen} aria-label={tr("查看 {0}", node.name)}>
      <div className="node-heading"><div className="node-symbol">{node.country ? (prefs.icons ? <Flag code={node.country} key={node.country}/> : node.country) : <Server size={20}/>}</div><div className="node-identity"><div className="node-name-row"><h3 title={node.name}>{node.name}</h3>{(highCpu || (mobile && expiring)) && <span className="card-issue">{highCpu && <span>{tr("高负载")} · CPU {Math.round(m!.cpu)}%</span>}{mobile && expiring && <span className={days!==null&&days<0?'is-expired':undefined}>{days!==null&&days>0&&<>{tr("即将到期")} · </>}{expiry}</span>}</span>}</div><div className="node-os-row"><p>{prefs.icons && node.os && <OsIcon os={node.os} key={node.os}/>}{node.os ? osName(node.os) : tr("等待首次上报")}</p>{!mobile && expiring && <span className="card-issue card-expiry-tag"><span className={days!==null&&days<0?'is-expired':undefined}>{days!==null&&days>0&&<>{tr("即将到期")} · </>}{expiry}</span></span>}{!mobile&&quotaExhausted&&<span className="card-issue card-quota-tag"><span>{tr('流量额度已用尽')}</span></span>}</div></div><div className="node-status-group">{(node.ipv4 || node.ipv4_pin || node.ipv6 || node.ipv6_pin) && <div className="node-ip-tags" aria-label={tr("IP 协议")} >{(node.ipv4 || node.ipv4_pin) && <span className="tag">V4</span>}{(node.ipv6 || node.ipv6_pin) && <span className="tag">V6</span>}</div>}<Status node={node}/></div></div>
      {offline ? <div className="offline-summary"><div className="offline-last-report"><span><Clock3 size={12} aria-hidden="true"/>{tr("最近上报时间")}</span>{reportTime ? <time dateTime={reportTime.toISOString()}>{reportTime.toLocaleString(locale())}</time> : <b>{tr("上次上报时间未知")}</b>}</div>{!mobile&&showSecondary&&billing}</div> : <><div className="resources"><ResourceMetric label="CPU" value={m?.cpu ?? null} foot={tr("{0} 核", node.cpu_cores)}/><ResourceMetric label={tr("内存")} value={m ? percent(m.mem_used, m.mem_total) : null} foot={m ? (prefs.showTotals ? pair(m.mem_used, m.mem_total) : bytes(m.mem_used)) : tr("容量 {0}", bytes(node.mem_total))}/><ResourceMetric label={tr("硬盘")} value={m ? percent(m.disk_used, m.disk_total) : null} foot={m ? (prefs.showTotals ? pair(m.disk_used, m.disk_total) : bytes(m.disk_used)) : tr("容量 {0}", bytes(node.disk_total))}/><ResourceMetric label={tr("负载")} value={m && node.cpu_cores > 0 ? m.load[0] / node.cpu_cores * 100 : null} displayValue={m ? m.load[0].toFixed(2) : "—"} foot={tr("1 分钟 · {0} 核",node.cpu_cores)}/></div>
      <div className="card-network">
        <SpeedIndicators key={node.id} node={node}/>
        {info.connections&&showSecondary && <div className="node-connections">{([['TCP',m?.tcp],['UDP',m?.udp]] as const).map(([label,value])=><div key={label}><span>{label}</span><b>{value === undefined ? '—' : value.toLocaleString()}</b></div>)}</div>}
        {!mobile&&showSecondary&&billing}
      </div></>}
    </button>
      {hasDisclosure&&<button type="button" className="node-secondary-toggle" aria-label={tr('更多信息')} aria-expanded={secondaryOpen} onClick={()=>setSecondaryOpen(value=>!value)}>{tr('更多信息')}<ChevronDown size={15} aria-hidden="true"/></button>}
      {mobile && billing && <div className="mobile-card-extra">{billing}</div>}
      <PingStats scale={prefs.latencyScale} latencyWindow={prefs.latencyWindow} warn={prefs.latencyWarn} high={prefs.latencyHigh} count={prefs.homeRoutes} online={node.online} id={node.id} probe={probe} onOpenRoutes={onOpenRoutes}/>
      {mobile ? secondary && <div className="mobile-card-extra">{secondary}</div> : showSecondary&&secondary}
  </article>;
}
