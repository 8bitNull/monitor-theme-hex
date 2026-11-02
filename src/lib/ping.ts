import { tr, getLanguage } from './i18n.ts'
import { isRecentPingSample } from './pingRecency.ts'
// Fetch cadence does not change the backend's probe/history resolution.
export const PING_REFRESH_INTERVAL = 5000;
export const PING_RETRY_INTERVAL = 60000;
export type PingPoint = {
    task_id: number;
    ts: number;
    latency: number | null;
    loss?: number;
};
export type PingHistory = {
    ping: PingPoint[];
    probes?: Record<string, string>;
    loss?: Record<string, number>;
};
/** Only a present server loss map can imply zero for an omitted route. */
export function windowLoss(data: PingHistory, id: number): number | null {
    const map = data.loss && typeof data.loss === 'object' && !Array.isArray(data.loss) ? data.loss : undefined;
    const raw = map?.[String(id)];
    return map && raw === undefined ? 0 : typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : null;
}
const catalogs = new WeakMap<PingHistory,{language:string;value:{id:number;name:string}[]}>();
export function probeCatalog(data: PingHistory) {
    const saved=catalogs.get(data); if(saved?.language===getLanguage()) return saved.value;
    const ids = new Set<number>();
    for (const key of Object.keys(data.probes ?? {})) { const id = Number(key); if (Number.isSafeInteger(id) && id > 0) ids.add(id); }
    for (const p of data.ping ?? []) if (p && Number.isSafeInteger(p.task_id) && p.task_id > 0) ids.add(p.task_id);
    const value = [...ids].sort((a,b)=>a-b).map(id=>({id, name: typeof data.probes?.[id] === 'string' ? data.probes[id] : tr("探测 {0}", id)}));
    catalogs.set(data,{language:getLanguage(),value}); return value;
}
export type PingWindow = 1 | 6 | 24;
type Summary = { id:number; name:string; latest:PingPoint; loss:number|null; jitter:number|null; rows:PingPoint[]; allRows:PingPoint[] };
const summaries = new WeakMap<PingHistory, {language:string; value:Summary[]}>();
export function summarizePing(data: PingHistory) {
    if (!Array.isArray(data?.ping))
        throw new Error(tr("\u5EF6\u8FDF\u6570\u636E\u683C\u5F0F\u5F02\u5E38"));
    const memo = summaries.get(data);
    if (memo?.language === getLanguage()) return memo.value;
    const groups = new Map<number, PingPoint[]>();
    for (const p of data.ping) {
        if (!p || !Number.isFinite(p.task_id) || !Number.isFinite(p.ts) || !(p.latency === null || (typeof p.latency === 'number' && Number.isFinite(p.latency) && p.latency >= 0)))
            continue;
        const rows = groups.get(p.task_id) || [];
        rows.push(p);
        groups.set(p.task_id, rows);
    }
    const value = [...groups].sort(([a], [b]) => a - b).map(([id, rows]) => {
        rows.sort((a, b) => a.ts - b.ts);
        let changes = 0, pairs = 0;
        for (let i = 1; i < rows.length; i++) {
            if (rows[i].latency !== null && rows[i - 1].latency !== null) {
                changes += Math.abs(rows[i].latency! - rows[i - 1].latency!);
                pairs++;
            }
        }
        // Window loss must come from the server; bucket percentages cannot be averaged.
        const loss = windowLoss(data, id);
        const name = data.probes?.[String(id)];
        return { id, name: typeof name === 'string' ? name : tr("\u63A2\u6D4B {0}", id), latest: rows.at(-1)!, loss, jitter: pairs ? changes / pairs : null, rows: rows.slice(-40), allRows: rows };
    });
    summaries.set(data, {language:getLanguage(), value});
    return value;
}
/** Auto prefers a recent route in ID order, including timeouts; pinned routes never switch. */
export function selectPing(stats: Summary[], probe: string, now = Date.now()): Summary | undefined {
    if (probe !== 'auto') return stats.find(route => String(route.id) === probe);
    return stats.find(route => isRecentPingSample(route.latest.ts, now))
        ?? stats.reduce<Summary | undefined>((latest, route) => !latest || route.latest.ts > latest.latest.ts ? route : latest, undefined);
}
export function recentPingRows(rows: PingPoint[], hours: PingWindow) {
    const end = rows.at(-1)?.ts;
    if (end === undefined)
        return [];
    const start = end - hours * 3600;
    return rows.filter(row => row.ts >= start);
}
// At most two history scans at once, including pages with many nodes.
let active = 0;
const queue: (() => void)[] = [];
const cache = new Map<number, {
    expires: number;
    request: Promise<PingHistory>;
}>();
export type PingSnapshot = {
    data?: PingHistory;
    updatedAt?: number;
    failed?: boolean;
};
const snapshots = new Map<number, PingSnapshot>();
const nodeListeners = new Map<number, Set<() => void>>();
export function subscribeNodePing(id:number, listener:()=>void) {
    const set = nodeListeners.get(id) ?? new Set<()=>void>();
    nodeListeners.set(id,set); set.add(listener);
    return ()=>{set.delete(listener); if(!set.size) {nodeListeners.delete(id);trimSnapshots();}};
}
const listeners = new Set<() => void>();
let revision = 0;
export const pingRevision = () => revision;
export const subscribePing = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getPing = (id: number) => snapshots.get(id);
/** Retain all observed/in-flight nodes and at most 200 other snapshots. */
function trimSnapshots() {
    let inactive = [...snapshots.keys()].filter(id=>!nodeListeners.has(id) && cache.get(id)?.expires !== Infinity).length;
    for (const id of snapshots.keys()) {
        if(inactive<=200) break;
        if(nodeListeners.has(id) || cache.get(id)?.expires === Infinity) continue;
        cache.delete(id); snapshots.delete(id); inactive--;
    }
}
function publish(id: number, snapshot: PingSnapshot) {
    snapshots.delete(id); snapshots.set(id, snapshot); trimSnapshots();
    revision++; nodeListeners.get(id)?.forEach(listener=>listener()); listeners.forEach(listener=>listener());
}
async function limited<T>(run: () => Promise<T>): Promise<T> {
    if (active >= 2)
        await new Promise<void>(resolve => queue.push(resolve));
    else
        active++;
    try {
        return await run();
    }
    finally {
        const next = queue.shift();
        if (next)
            next();
        else
            active--;
    }
}
export function loadPing(id: number, force = false): Promise<PingHistory> {
    const saved = cache.get(id);
    if (saved && (saved.expires === Infinity || (!force && saved.expires > Date.now())))
        return saved.request;
    const entry = { expires: Infinity, request: null as unknown as Promise<PingHistory> };
    entry.request = limited(async () => {
        // Preserve minute resolution and the server's full-window loss. The homepage
        // selects its display window from this 24-hour response; detail charts reuse it.
        const response = await fetch(`/api/nodes/${id}/metrics?hours=24&points=1440&series=ping`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
        if (!response.ok)
            throw new Error(tr("\u5EF6\u8FDF\u6570\u636E\u6682\u4E0D\u53EF\u7528"));
        const data = await response.json() as PingHistory;
        summarizePing(data);
        return data;
    }).then(data => {
        publish(id, { data, updatedAt: Date.now(), failed: false });
        entry.expires = Date.now() + PING_REFRESH_INTERVAL;
        trimSnapshots();
        return data;
    }).catch(error => {
        // Share failure backoff too: other cards/sort/map watchers must not
        // retry a failing node whenever their healthy nodes refresh.
        entry.expires = Date.now() + PING_RETRY_INTERVAL;
        publish(id, { ...snapshots.get(id), failed: true });
        throw error;
    });
    cache.set(id, entry);
    return entry.request;
}
/** Schedule at cache expiry, including when another watcher/manual read renewed it. */
export function watchPing(ids: number[]): () => void {
    let stopped = false, pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = async (event?: Event) => {
        clearTimeout(timer);
        if (stopped || pending || document.hidden)
            return;
        pending = true;
        // Resume signals may recover a failed connection before its automatic
        // backoff expires; successful snapshots still respect their five-second TTL.
        await Promise.all(ids.map(id => loadPing(id, !!event && !!snapshots.get(id)?.failed).catch(() => { })));
        pending = false;
        if (!stopped && !document.hidden) {
            const now = Date.now();
            // Cache hits wait only for their remaining TTL; failed requests
            // keep their shared one-minute backoff rather than retrying at 5s.
            const next = Math.min(now + PING_RETRY_INTERVAL, ...ids.map(id => cache.get(id)?.expires ?? now + PING_REFRESH_INTERVAL));
            timer = setTimeout(() => { void refresh(); }, Math.max(0, next - now));
        }
    };
    void refresh();
    document.addEventListener('visibilitychange', refresh);
    // Mobile browsers can resume without a visibility transition; the shared
    // cache/in-flight request still deduplicates overlapping wake-up signals.
    const resumeEvents = ['focus', 'online', 'pageshow'] as const;
    for (const event of resumeEvents) window.addEventListener(event, refresh);
    return () => {
        stopped = true;
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', refresh);
        for (const event of resumeEvents) window.removeEventListener(event, refresh);
    };
}
