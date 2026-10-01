import { tr } from './i18n.ts'
export const palettes = {
  default: '电光青',
  midnight: '极光紫',
  forest: '矩阵绿',
  sunset: '炽阳金',
  ocean: '深空蓝',
  rose: '赛博粉'
};
export const cardLayouts = { classic: '经典', modern: '现代', minimal: '极简', detailed: '详细', compact: '紧凑行' };
export const graphStyles = { ring: '圆环', bar: '进度条', columns: '分段柱条', minimal: '极简数字' };
export const moduleLabels = { online: '在线节点', busiest: '高负载提示', traffic: '流量统计', speed: '实时网速', regions: '地区统计', clock: '当前时间', map: '首页地图' };
export const cardInfoLabels = { traffic: '本月用量', connections: 'TCP／UDP', uptime: '在线时长', expiry: '到期信息', remarks: '备注标签', price: '价格' };
export type CardInfo = Record<keyof typeof cardInfoLabels, boolean>;
export const defaultCardInfo: CardInfo = {traffic:true,connections:true,uptime:true,expiry:true,remarks:true,price:true};
export type DisplayPatch = {infoDensity?: 'overview' | 'full'; detailInfoMode?: 'auto' | 'expanded' | 'collapsed'; cardInfo?: Partial<CardInfo>; mobileCardInfo?: CardInfo | null; mobileInfoMode?: 'follow' | 'custom'; desktopColumns?: 'auto' | '2' | '3' | '4'};
export type Preferences = {
    summaryCollapsed: boolean;
    infoDensity: 'overview' | 'full';
    detailInfoMode: 'auto' | 'expanded' | 'collapsed';
    cardInfo: CardInfo;
    mobileCardInfo: CardInfo | null;
    mobileInfoMode: 'follow' | 'custom';
    desktopColumns: 'auto' | '2' | '3' | '4';
    // Legacy import metadata only; v2 uses one shared visual system.
    probe: string;
    homeRoutes: number;
    latencyScale: 200 | 500;
    latencyWindow: 1 | 6 | 24;
    latencyWarn: number;
    latencyHigh: number;
    skin: 'lumina' | 'original';
    mobileLayout: keyof typeof cardLayouts | 'inherit';
    designVersion: 1;
    schemaVersion: 3;
    palette: keyof typeof palettes;
    graph: keyof typeof graphStyles;
    layout: 'comfortable' | 'compact';
    cardLayout: keyof typeof cardLayouts;
    appearance: 'system' | 'light' | 'dark';
    map: boolean;
    showTotals: boolean;
    icons: boolean;
    backgroundUrl: string;
    backgroundBlur: number;
    backgroundMask: number;
    backgroundType: 'soft' | 'glass';
    glass: boolean;
    cardOpacity: number;
    cardBlur: number;
    speedStyle: 'spark';
    modules: Record<keyof typeof moduleLabels, boolean>;
};
export const defaults: Preferences = {
    summaryCollapsed: false, infoDensity: 'overview',
    detailInfoMode: 'auto',
    cardInfo: {...defaultCardInfo}, mobileCardInfo: null, mobileInfoMode: 'follow', desktopColumns: 'auto',
    probe: 'auto', homeRoutes: 1, latencyScale:500, latencyWindow:1, latencyWarn:150, latencyHigh:300, skin: 'lumina', mobileLayout: 'inherit', designVersion: 1, schemaVersion: 3, palette: 'default', graph: 'bar', layout: 'comfortable', cardLayout: 'classic', appearance: 'system', map: true,
    showTotals: true, icons: true, backgroundUrl: '', backgroundBlur: 0, backgroundMask: 45, backgroundType: 'soft', glass: true, cardOpacity: 88, cardBlur: 12, speedStyle: 'spark',
    modules: { online: true, busiest: true, traffic: true, speed: true, regions: false, clock: false, map: true },
};
function object(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
export function safeBackground(value: unknown): string {
    if (typeof value !== 'string' || value.length > 2048)
        return '';
    const s = value.trim();
    if (!s || [...s].some(c => c.charCodeAt(0) <= 32 || c === '\\'))
        return '';
    if (s.startsWith('/') && !s.startsWith('//'))
        return s;
    try {
        const url = new URL(s);
        return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    }
    catch {
        return '';
    }
}
export function normalizePreferences(input: unknown, base: Preferences = defaults): Preferences {
    const v = object(input);
    const choose = <T extends string>(value: unknown, choices: readonly T[], fallback: T): T => choices.includes(value as T) ? value as T : fallback;
    const bool = (key: keyof Preferences) => typeof v[key] === 'boolean' ? v[key] as boolean : base[key] as boolean;
    const number = (key: keyof Preferences, min: number, max: number) => typeof v[key] === 'number' && Number.isFinite(v[key]) ? Math.max(min, Math.min(max, v[key] as number)) : base[key] as number;
    const modules = { ...base.modules };
    for (const key of Object.keys(moduleLabels) as (keyof typeof moduleLabels)[]) {
        if (typeof object(v.modules)[key] === 'boolean')
            modules[key] = object(v.modules)[key] as boolean;
    }
    const info = (input: unknown, fallback: CardInfo): CardInfo => Object.fromEntries(Object.keys(defaultCardInfo).map(key=>[key,typeof object(input)[key]==='boolean'?object(input)[key]:fallback[key as keyof CardInfo]])) as CardInfo;
    const warn=number('latencyWarn',1,4999),high=number('latencyHigh',2,5000);
    return {
        summaryCollapsed:bool('summaryCollapsed'), infoDensity:choose(v.infoDensity,['overview','full'],base.infoDensity),
        latencyScale:v.latencyScale===200||v.latencyScale===500?v.latencyScale:base.latencyScale,
        latencyWindow:v.latencyWindow===1||v.latencyWindow===6||v.latencyWindow===24?v.latencyWindow:base.latencyWindow,
        latencyWarn:warn<high?warn:base.latencyWarn,
        latencyHigh:warn<high?high:base.latencyHigh,
        detailInfoMode: choose(v.detailInfoMode, ['auto','expanded','collapsed'],base.detailInfoMode),
        cardInfo: info(v.cardInfo, base.cardInfo),
        mobileCardInfo: v.mobileCardInfo === null ? null : v.mobileCardInfo && typeof v.mobileCardInfo === 'object' && !Array.isArray(v.mobileCardInfo) ? info(v.mobileCardInfo, base.mobileCardInfo || base.cardInfo) : base.mobileCardInfo,
        mobileInfoMode: choose(v.mobileInfoMode, ['follow','custom'],base.mobileInfoMode),
        desktopColumns: choose(v.desktopColumns, ['auto','2','3','4'],base.desktopColumns),
        probe: v.probe === 'auto' || (typeof v.probe === 'string' && /^[1-9]\d*$/.test(v.probe) && Number.isSafeInteger(Number(v.probe))) ? v.probe : base.probe,
        homeRoutes: Math.round(number('homeRoutes', 1, 3)),
        skin: choose(v.skin, ['lumina', 'original'], base.skin),
        mobileLayout: choose(v.mobileLayout, ['inherit', ...Object.keys(cardLayouts)] as Preferences['mobileLayout'][], Object.hasOwn(v, 'cardLayout') && !Object.hasOwn(v, 'mobileLayout') ? 'inherit' : base.mobileLayout),
        designVersion: 1,
        schemaVersion: 3,
        palette: choose(v.palette, Object.keys(palettes) as (keyof typeof palettes)[], base.palette),
        graph: choose(v.graph, Object.keys(graphStyles) as (keyof typeof graphStyles)[], base.graph),
        // v1.1/v1.2 layout was density, not a card design. Preserve that meaning.
        layout: choose(v.layout, ['comfortable', 'compact'], v.cardLayout === 'compact' ? 'compact' : base.layout),
        cardLayout: choose(v.cardLayout, Object.keys(cardLayouts) as (keyof typeof cardLayouts)[], base.cardLayout),
        appearance: choose(v.appearance, ['system', 'light', 'dark'], base.appearance),
        map: bool('map'), showTotals: bool('showTotals'), icons: bool('icons'), glass: bool('glass'),
        backgroundUrl: typeof v.backgroundUrl === 'string' ? safeBackground(v.backgroundUrl) : base.backgroundUrl,
        backgroundBlur: number('backgroundBlur', 0, 30), backgroundMask: number('backgroundMask', 0, 90),
        backgroundType: choose(v.backgroundType, ['soft', 'glass'], base.backgroundType),
        cardOpacity: number('cardOpacity', 55, 100), cardBlur: number('cardBlur', 0, 24),
        speedStyle: 'spark', modules,
    };
}
export function parsePreferences(text: string, base: Preferences = defaults): Preferences {
    if (text.length > 65536)
        throw new Error(tr("配置文件不能超过 64 KB"));
    let v: unknown;
    try {
        v = JSON.parse(text);
    }
    catch {
        throw new Error(tr("文件不是有效的 JSON 配置"));
    }
    if (!v || typeof v !== 'object' || Array.isArray(v))
        throw new Error(tr("配置必须是一个对象"));
    const data = object(v);
    if (data.schemaVersion !== undefined && data.schemaVersion !== 1 && data.schemaVersion !== 2 && data.schemaVersion !== 3)
        throw new Error(tr("不支持此配置版本"));
    if (!Object.keys(data).some(key => key !== 'schemaVersion' && Object.hasOwn(defaults, key)))
        throw new Error(tr("没有可用的外观设置"));
    if (data.backgroundUrl && !safeBackground(data.backgroundUrl))
        throw new Error(tr("背景仅支持 HTTP(S) 地址或站内绝对路径"));
    return normalizePreferences({...data,...(!Object.hasOwn(data,"infoDensity")&&data.schemaVersion!==3?{infoDensity:"full"}:{})}, base);
}
export function restoreAppearance(current: Preferences, site: Preferences): Preferences {
    return { ...site, summaryCollapsed:current.summaryCollapsed, infoDensity:current.infoDensity, detailInfoMode:current.detailInfoMode, cardInfo:current.cardInfo,mobileCardInfo:current.mobileCardInfo,mobileInfoMode:current.mobileInfoMode,desktopColumns:current.desktopColumns, probe:current.probe, homeRoutes:current.homeRoutes, latencyScale:current.latencyScale, latencyWindow:current.latencyWindow, latencyWarn:current.latencyWarn, latencyHigh:current.latencyHigh, map: current.map, modules: { ...current.modules } };
}

/** Store only differing fields; nested module choices inherit independently. */
export function preferenceOverrides(value: Preferences, base: Preferences): Record<string, unknown> {
 const out: Record<string,unknown>={}
 for(const key of Object.keys(defaults) as (keyof Preferences)[]) {
  if(['schemaVersion','designVersion','modules','cardInfo','mobileCardInfo'].includes(key)) continue
  if(value[key]!==base[key]) out[key]=value[key]
 }
 const modules:Record<string,boolean>={}
 for(const key of Object.keys(moduleLabels) as (keyof typeof moduleLabels)[]) if(value.modules[key]!==base.modules[key]) modules[key]=value.modules[key]
 const cardInfo:Record<string,boolean>={}
 for(const key of Object.keys(defaultCardInfo) as (keyof CardInfo)[]) if(value.cardInfo[key]!==base.cardInfo[key]) cardInfo[key]=value.cardInfo[key]
 if(Object.keys(cardInfo).length) out.cardInfo=cardInfo
 if(JSON.stringify(value.mobileCardInfo)!==JSON.stringify(base.mobileCardInfo)) out.mobileCardInfo=value.mobileCardInfo
 if(Object.keys(modules).length) out.modules=modules
 return out
}
