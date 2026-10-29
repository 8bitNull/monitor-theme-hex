import {tr} from '../lib/i18n'
import {Cpu,MemoryStick,HardDrive,Gauge} from 'lucide-react'
export function ResourceMetric({ label, value, foot, displayValue }: {
    label: string;
    value: number | null;
    foot: string;
    displayValue?: string;
}) {
    const n = value === null ? 0 : Math.max(0, Math.min(100, value));
    const Icon = label === "CPU" ? Cpu : label === tr("内存") ? MemoryStick : label === tr("负载") ? Gauge : HardDrive;
    return <div className={`resource ${n >= 90 ? 'danger' : n >= 75 ? 'warning' : ''}`}>
    <div className="metric-ring"><svg viewBox="0 0 80 80" aria-hidden="true"><circle className="ring-track" cx="40" cy="40" r="33"/><circle className="ring-value" cx="40" cy="40" r="33" pathLength="100" strokeDasharray={`${n} 100`}/></svg><strong>{displayValue ?? (value === null ? '—' : `${n.toFixed(0)}%`)}</strong></div>
    <div className="resource-label"><span title={label} aria-label={label}><Icon size={14}/><span>{label}</span></span><strong className="bar-number">{displayValue ?? (value === null ? '—' : <>{n.toFixed(1)}<span className="resource-unit">%</span></>)}</strong></div>
    <div className="resource-bar"><i style={{ width: `${n}%` }}/></div><div className="resource-columns" aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} className={value !== null && i < Math.ceil(n / 5) ? "filled" : ""} style={{ height: `${35 + i * 3.4}%` }}/>)}</div><small title={foot}>{foot}</small>
  </div>;
}
