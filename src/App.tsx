import {BillingReminders} from './components/BillingReminders';
import {MapPanel} from './components/MapPanel';
import {MobileApp} from './components/MobileApp';
import {useMobilePreferences} from './lib/mobilePreferences';
import {MobileSearch} from './components/MobileSearch';
import {countryName} from './lib/regionNames';
import {RegionPicker} from './components/RegionPicker';
import themeManifest from '../theme.json';
import {useLoadAlerts} from './lib/useLoadAlerts';
import {DesktopRegionFilter} from './components/DesktopRegionFilter';
import {probeRevision,subscribeProbes,resolveProbe} from './lib/nodeProbes';
import { tr, locale, getLanguage, subscribeLanguage, setLanguage } from './lib/i18n.ts'
import { readCollection } from '@/lib/collection';
import { systemKey } from '@/lib/groups';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useRef, useLayoutEffect, useSyncExternalStore } from "react";
import {  Moon, Sun, Wrench, LogIn, Globe, LayoutGrid, ArrowLeft, Radio, Table2, Search, X, ArrowUp } from "lucide-react";
import { usePreferences, useAppearance, useDesktopPreferences } from '@/lib/preferences';
import { type Preferences as ThemePreferences, defaults } from '@/lib/appearance';
import { Background, useBackground } from '@/components/Background';
import { readBrowse, browseNodes, defaultBrowse, type Browse, type SortKey } from '@/lib/browse';
import { getPing, watchPing, pingRevision, subscribePing } from '@/lib/ping';
import { NodeTable } from '@/components/NodeTable';
import { NodeCard } from "@/components/NodeCard";
import { Summary } from "@/components/Summary";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, useNodes } from "@/lib/api";
import type {Node} from '@/lib/api';
import {homePage,homePath,readReturnContext,saveReturnContext,type HomePage} from '@/lib/navigation';
import {searchNodes} from '@/lib/nodeSearch';
import '@/styles/ux-navigation.css';
type Me = {
    authed: boolean;
    github: boolean;
    site_name: string;
    public_page: boolean;
};
// Split out because recharts is most of this bundle and the list page draws no
// chart. The landing page is 242 kB rather than 629 kB (77 kB gzipped against
// 188 kB), with the rest fetched immediately after it paints.
const loadDetail = () => import("@/components/NodeDetail").then((m) => ({ default: m.NodeDetail }));
const NodeDetail = lazy(loadDetail);

// `/node/{id}` is a real page: it survives a reload, can be linked to, and back
// leaves the detail view rather than the site. The hub serves index.html for any
// unknown path, so no server-side route is required.
function useNodeRoute() {
    const read = () => {const match=location.pathname.match(/^\/node\/(\d+)/);return match?Number(match[1]):null;};
    const [id,setId]=useState(read);
    const [page,setPage]=useState<HomePage>(()=>read()===null?homePage():readReturnContext(history.state)?.page??'nodes');
    const home=useRef({y:readReturnContext(history.state)?.scrollY??0,node:0,offset:0,width:0,tableX:0,tableOffset:0,tableY:0,table:false});
    const pending=useRef(false);
    useEffect(()=>{
        const previous=history.scrollRestoration;history.scrollRestoration='manual';
        const sync=()=>{const next=read();pending.current=next===null;setId(next);setPage(next===null?homePage():readReturnContext(history.state)?.page??'nodes');};
        addEventListener('popstate',sync);
        return()=>{removeEventListener('popstate',sync);history.scrollRestoration=previous;};
    },[]);
    useLayoutEffect(()=>{
        if(id!==null || !pending.current)return;
        pending.current=false;
        let stopped=false;
        const restore=()=>{
            if(stopped)return;
            const target=document.querySelector<HTMLElement>(`[data-node-id="${home.current.node}"]`);
            if(!target){const table=document.querySelector<HTMLElement>('.table-scroll');if(table){table.scrollTop=home.current.tableY;table.scrollLeft=home.current.tableX;}scrollTo(0,home.current.y);return;}
            const table=document.querySelector<HTMLElement>('.table-scroll');
            if(table&&home.current.table){table.scrollLeft=home.current.tableX;table.scrollTop+=target.getBoundingClientRect().top-table.getBoundingClientRect().top-home.current.tableOffset;}
            // Mobile branding scrolls away. Keep a stable clearance for sticky search
            // instead of following its increasingly negative viewport coordinate.
            const top=Math.max(72,(document.querySelector('header')?.getBoundingClientRect().bottom || 0)+12);
            const desired=home.current.width===innerWidth?Math.max(top,Math.min(home.current.offset,innerHeight-80)):top;
            scrollTo(0,scrollY+target.getBoundingClientRect().top-desired);
            target.focus({preventScroll:true});
        };
        const observer=new ResizeObserver(restore);
        const main=document.querySelector('main');if(main)observer.observe(main);
        const stop=()=>{stopped=true;observer.disconnect();};
        for(const event of ['wheel','touchstart','pointerdown','keydown'])addEventListener(event,stop,{passive:true,once:true});
        // Cached and newly loaded cards can exchange height without resizing main.
        let frame=0;const settle=()=>{restore();if(!stopped)frame=requestAnimationFrame(settle);};
        frame=requestAnimationFrame(settle);const timer=setTimeout(()=>{restore();stop();},500);
        return()=>{stop();cancelAnimationFrame(frame);clearTimeout(timer);for(const event of ['wheel','touchstart','pointerdown','keydown'])removeEventListener(event,stop);};
    },[id]);
    const go=(next:number|null,section?:string,query='')=>{
        if(id===null && next!==null){const target=document.querySelector<HTMLElement>(`[data-node-id="${next}"]`);const table=document.querySelector<HTMLElement>('.table-scroll');home.current={y:scrollY,node:next,offset:target?.getBoundingClientRect().top || 0,width:innerWidth,table:!!table,tableX:table?.scrollLeft||0,tableY:table?.scrollTop||0,tableOffset:target&&table?target.getBoundingClientRect().top-table.getBoundingClientRect().top:0};}
        const returning=readReturnContext(history.state);
        const destination=next===null?returning?.page??page:page;
        if(next===null&&returning)home.current.y=returning.scrollY;
        const routeState=next!==null?(id===null?saveReturnContext({page,scrollY}):history.state??{}):{};
        const anchor=section ?? (id!==null && next!==null?location.hash.slice(1):'');
        pending.current=next===null;
        history.pushState(routeState,'',next===null?homePath(destination):`/node/${next}${query}${anchor?'#'+anchor:''}`);
        if(next===null)setPage(destination);
        setId(next);if(next!==null)scrollTo(0,0);
    };
    const navigate=(next:HomePage)=>{if(next===page&&id===null)return;history.pushState({},'',homePath(next));setPage(next);setId(null);};
    return [id,go,page,navigate] as const;
}
function DetailSearch({nodes,onSelect}:{nodes:Node[];onSelect:(id:number)=>void}){
    const [query,setQuery]=useState(''),[expanded,setExpanded]=useState(false),[index,setIndex]=useState(0);
    const matches=searchNodes(nodes,query).slice(0,8);
    const choose=(id:number)=>{setExpanded(false);setQuery('');setIndex(0);onSelect(id)};
    const visible=expanded&&query.trim().length>0;
    return <div className="detail-node-search desktop-header-search" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setExpanded(false)}}>
      <div className="node-search-control"><Search size={16} aria-hidden="true"/><input type="search" value={query} onFocus={()=>setExpanded(true)} onChange={event=>{setQuery(event.target.value);setIndex(0);setExpanded(true)}} onKeyDown={event=>{
        if(event.key==='ArrowDown'){event.preventDefault();setIndex(value=>Math.min(value+1,matches.length-1))}
        else if(event.key==='ArrowUp'){event.preventDefault();setIndex(value=>Math.max(0,value-1))}
        else if(event.key==='Enter'&&matches.length){event.preventDefault();choose(matches[index]?.id??matches[0].id)}
        else if(event.key==='Escape')setExpanded(false)
      }} aria-label={tr('搜索节点')} aria-controls="detail-node-suggestions" aria-expanded={visible} aria-autocomplete="list" aria-activedescendant={visible&&matches.length?`detail-node-option-${matches[index]?.id??matches[0].id}`:undefined} placeholder={tr('搜索节点…')}/>
      {query&&<button type="button" className="node-search-clear" aria-label={tr('清除搜索')} onClick={()=>{setQuery('');setExpanded(false)}}><X size={15}/></button>}</div>
      {visible&&<div id="detail-node-suggestions" className="detail-node-suggestions" role="listbox" aria-label={tr('匹配节点')}>
        {matches.length?matches.map((node,i)=><button type="button" role="option" id={`detail-node-option-${node.id}`} aria-selected={i===index} key={node.id} onClick={()=>choose(node.id)}><span>{node.name}</span><small>{countryName(node.country)}</small></button>):<p role="status">{tr('没有符合条件的节点')}</p>}
      </div>}
    </div>;
}
export default function App({ siteDefaults = defaults }: {
    siteDefaults?: ThemePreferences;
}) {
    const language = useSyncExternalStore(subscribeLanguage, getLanguage);
    useEffect(() => { document.documentElement.lang = locale() }, [language]);
    const [me, setMe] = useState<Me | null>(null);
    const [meError, setMeError] = useState("");
    const { nodes, error, closed, connection, lastUpdated } = useNodes();
    const [open, go, homePageState, navigate] = useNodeRoute();
    const [mobileCards,setMobileCards]=useState(()=>matchMedia('(max-width:720px)').matches);
    useEffect(()=>{const media=matchMedia('(max-width:720px)');const update=()=>setMobileCards(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
    const [prefs, setPrefs, selectDisplay] = usePreferences(siteDefaults);
    const [desktop,setDesktop]=useDesktopPreferences();
    const [mobilePreferences,setMobilePreferences]=useMobilePreferences();
    const loadAlerts=useLoadAlerts(nodes,prefs.modules.busiest);
    useSyncExternalStore(subscribeProbes,probeRevision);
    const dark = useAppearance(prefs.appearance);
    const toggleTheme = () => setPrefs(prev => ({ ...prev, appearance: dark ? 'light' : 'dark' }));
    const background = useBackground(prefs);
    const [system, setSystem] = useState(() => readCollection().system);
    const [groupFilter, setGroupFilter] = useState('all');
    useEffect(() => { try { sessionStorage.setItem('monitor-next-collection-v1', JSON.stringify({ system })) } catch { /* Optional storage. */ } }, [system]);
    const [browseState, setBrowse] = useState<Browse>(() => {const old=readBrowse();return {...old,status:"all",query:"",sort:old.view === "table" ? old.sort : "default",direction:old.view === "table" ? old.direction : "asc"}});
    const browse = useMemo(()=>({...browseState, probe:prefs.probe}),[browseState,prefs.probe]);
    const [compactViewport, setCompactViewport] = useState(() => window.matchMedia('(max-width: 720px)').matches);
    useEffect(() => {
        const media = window.matchMedia('(max-width: 720px)');
        const update = () => setCompactViewport(media.matches);
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, []);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [showScrollTop, setShowScrollTop] = useState(false);
    useEffect(() => {
        const update = () => setShowScrollTop(open === null && window.scrollY > 520);
        update();
        addEventListener('scroll', update, { passive: true });
        return () => removeEventListener('scroll', update);
    }, [open]);
    const mapVisible = prefs.modules.map && !compactViewport;
    const mapExpanded=desktop.mapExpanded??true;
    const toggleMap=()=>setDesktop(current=>({...current,mapExpanded:!mapExpanded}));
    useEffect(()=>{
        if(open!==null)return;
        let stopped=false,idle:number|undefined;
        const timer=setTimeout(()=>{const run=()=>{if(!stopped)void loadDetail().catch(()=>{})};if('requestIdleCallback' in window)idle=requestIdleCallback(run,{timeout:3000});else run()},4000);
        return()=>{stopped=true;clearTimeout(timer);if(idle!==undefined)cancelIdleCallback(idle)};
    },[open]);
    const { status, region } = browse;
    const shownColumns=compactViewport?browse.mobileColumns:browse.columns;
    const patchBrowse = (patch: Partial<Browse>) => setBrowse(prev => ({ ...prev, ...patch }));
    const resetDesktopColumns=()=>{const next={columns:[...defaultBrowse.columns],tableLayout:defaultBrowse.tableLayout,columnsVersion:defaultBrowse.columnsVersion};patchBrowse(next);try{localStorage.setItem('monitor-next-table-columns-v1',JSON.stringify({...browse,...next}))}catch{/* Optional table preference. */}};
    const setQuery = (query: string) => patchBrowse({ query });
    const setStatus = (status: string) => patchBrowse({ status });
    const setRegion = useCallback((region:string)=>setBrowse(prev=>({...prev,region})),[]);
    const pingVersion = useSyncExternalStore(subscribePing, pingRevision);
    useEffect(() => { try {
        sessionStorage.setItem('monitor-next-browse-v1', JSON.stringify(browse));
    }
    catch { /* Optional storage. */ } }, [browse]);
    const sortBy = (key: SortKey) => patchBrowse({ sort: key, direction: browse.sort === key && browse.direction === 'asc' ? 'desc' : 'asc' });
    const nodeIds = (nodes || []).map(n => n.id).join(',');
    useEffect(() => {
        if (!['latency','loss'].includes(browse.sort) || open !== null)
            return;
        return watchPing(nodeIds.split(',').filter(Boolean).map(Number));
    }, [browse.sort, nodeIds, open]);
    void pingVersion;
    const loadMe = useCallback(() => {
        // `|| "..."` because an empty message reads as no error: api() falls back to
        // res.statusText, which HTTP/2 and HTTP/3 removed, so a bodiless 502 from a
        // proxy arrives as "". The check below would then take the loading branch and
        // the retry button would never render.
        return api<Me>("/me")
            .then((next) => { setMe(next); setMeError(""); })
            .catch((e: Error) => setMeError(e.message || tr("网络错误")));
    }, []);
    useEffect(() => {
        loadMe();
    }, [loadMe]);
    // The status page was closed while this tab was open. `me` holds whatever it
    // reported at load, so it is re-queried; the effect below then directs an
    // anonymous visitor to the panel rather than leaving them on a list that
    // stopped updating with only a red line to explain it.
    useEffect(() => {
        if (closed)
            void loadMe();
    }, [closed, loadMe]);
    useEffect(() => {
        if (me && !me.public_page && !me.authed)
            location.assign('/admin/');
    }, [me]);
    const sorted = [...(nodes ?? [])].sort((a, b) => a.sort - b.sort || a.id - b.id);
    const nodeGroups = [...new Set(sorted.map(n => typeof n.group === 'string' ? n.group : '').filter(Boolean))];
    const hasUngrouped = sorted.some(n => !n.group);
    const group = groupFilter === 'none' ? (hasUngrouped ? 'none' : 'all') : groupFilter.startsWith('=') && nodeGroups.includes(groupFilter.slice(1)) ? groupFilter : 'all';
    const groupPicker = nodeGroups.length > 0 ? <Select className="node-group-picker" aria-label={tr("节点分组")} value={group} onChange={event => setGroupFilter(event.target.value)}>
      <option value="all">{tr("全部分组")}</option>
      {nodeGroups.map(name => <option key={name} value={'='+name}>{name}</option>)}
      {hasUngrouped && <option value="none">{tr("未分组")}</option>}
    </Select> : null;
    const mapKey=JSON.stringify(sorted.filter(n=>(browse.status==='all'||(browse.status==='online'?n.online:!n.online))&&(system==='all'||systemKey(n.os)===system)).map(({id,name,country,online})=>({id,name,country,online})));
    const selected = sorted.find((n) => n.id === open);
    const filtered = browseNodes(sorted, browse.view === "cards" ? {...browse,sort:"default"} : browse).filter(n => (system === 'all' || systemKey(n.os) === system) && (group === 'all' || (n.group || '') === (group === 'none' ? '' : group.slice(1))));
    const showFilterFeedback = (status !== 'all' && !prefs.modules.online || !!browse.query || region !== 'all' || system !== 'all') && !(mapVisible && region !== 'all');
    const systems = [...new Set(sorted.map(n=>systemKey(n.os)))];
    const showSystemFilters = systems.length > 1 || system !== 'all';
    const showActiveFilters = showFilterFeedback || !!browse.query || system !== 'all' || (status !== 'all' && !prefs.modules.online);
    const pageKey=JSON.stringify([browse.query,browse.status,browse.region,browse.sort,browse.direction,browse.probe,system,group]);
    const [tablePage,setTablePage]=useState({key:pageKey,page:1});
    const page=Math.min(tablePage.key===pageKey?tablePage.page:1,Math.max(1,Math.ceil(filtered.length/20)));
    const viewSwitch = <div className="view-toolbar"><div className="view-switch"><button className={browse.view === 'cards' ? 'active' : ''} onClick={() => patchBrowse({view:'cards'})} aria-label={tr("卡片视图")} aria-pressed={browse.view === 'cards'}><LayoutGrid size={17}/>{tr("卡片")}</button><button className={browse.view === 'table' ? 'active' : ''} onClick={() => patchBrowse({view:'table'})} aria-label={tr("表格视图")} aria-pressed={browse.view === 'table'}><Table2 size={17}/>{tr("表格")}</button></div></div>;
    const searchField = (className = '') => <div className={`node-search-control ${className}`.trim()}>
      <Search size={16} aria-hidden="true"/>
      <input type="search" value={browse.query} onChange={event => setQuery(event.target.value)} onKeyDown={event=>{if(event.key==='Escape')setMobileSearchOpen(false)}} placeholder={tr("搜索名称、地区、操作系统…")} aria-label={tr("搜索节点")}/>
      {browse.query && <button type="button" className="node-search-clear" aria-label={tr("清除搜索")} title={tr("清除搜索")} onClick={() => setQuery('')}><X size={15}/></button>}
    </div>;
    // `/node/{id}` is a page people bookmark and share, so the tab needs the node's
    // name. The site name rather than a fixed string, since the hub lets an operator
    // rename the site.
    useEffect(() => {
        // Updating the browser title is intentional here, inside an effect.
        // oxlint-disable-next-line react/immutability
        document.title = [selected?.name, me?.site_name || "HEX"].filter(Boolean).join(" · ");
    }, [selected?.name, me?.site_name]);
    useEffect(() => {
        for (const name of ['apple-mobile-web-app-title', 'application-name']) {
            document.querySelector(`meta[name="${name}"]`)?.setAttribute('content', me?.site_name || 'HEX');
        }
    }, [me?.site_name]);
    // Only while there is nothing else to show. Once `me` has loaded, a later
    // failure belongs beside the page rather than over it.
    if (!me)
        return (<div className="grid min-h-svh place-items-center p-6 text-sm text-muted-foreground">
      {meError ? <div className="space-y-3 text-center"><p role="alert">{tr("加载失败：")}{meError}</p><Button onClick={loadMe}>{tr("重试")}</Button></div> : tr("加载中…")}
    </div>);
    // The status page is closed and nobody is signed in: redirect to the panel.
    if (!me.public_page && !me.authed)
        return null;
    return (<div className="next-theme min-h-svh" data-skin={prefs.skin} data-palette={prefs.palette} data-graph={prefs.graph} data-layout={prefs.layout} data-card-layout={prefs.cardLayout} data-glass={prefs.glass} data-background={background.ready} data-background-type={prefs.backgroundType} style={background.style}>
      {background.ready && <Background url={prefs.backgroundUrl}/>}
      {!compactViewport&&<header className="desktop-app-header sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          {/* The brand and explicit detail navigation share scroll restoration. */}
          <button className="brand" onClick={() => go(null)}>
            <span>{me.site_name || "HEX"}</span>
          </button>
          <div className="flex-1"/>
          {!compactViewport && (open===null?searchField("desktop-header-search"):<DetailSearch nodes={sorted} onSelect={id=>{const q=new URLSearchParams(location.search);q.delete('eventStart');q.delete('eventEnd');q.delete('routes');go(id,location.hash.slice(1),q.size?'?'+q:'')}}/>)}
          {compactViewport && <div className="mobile-header-search-shell"><button type="button" className="mobile-header-search-toggle" aria-label={tr("搜索节点")} title={tr("搜索节点")} aria-expanded={mobileSearchOpen} onClick={()=>setMobileSearchOpen(value=>!value)}><Search size={17}/></button></div>}
          <Button variant="ghost" size="icon" onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')} title="中文 / English" aria-label="Language / 语言"><Globe /></Button>
          {/* The panel is a separate app built into the hub, not part of this
            theme, so this is a navigation rather than a route. */}
          <Button variant="ghost" size="sm" asChild>
            <a href="/admin/">
              {me.authed ? <Wrench /> : <LogIn />} {me.authed ? tr("进入后台") : tr("登录")}
            </a>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} title={tr("切换主题")} aria-label={tr("切换明暗模式")}>
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>}
      {compactViewport && mobileSearchOpen && <MobileSearch count={filtered.length} onClear={()=>setQuery('')} onResults={()=>{setMobileSearchOpen(false);requestAnimationFrame(()=>{const results=document.getElementById('node-results');results?.focus({preventScroll:true});results?.scrollIntoView({block:'start'})})}} onClose={()=>setMobileSearchOpen(false)}>{searchField()}</MobileSearch>}

      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-4 sm:px-6">
        {(error || meError) && <p role="alert" className="error-banner">{tr("连接异常，正在重试。")}{error || meError}</p>}
        {compactViewport&&<MobileApp active={open===null} page={homePageState} onNavigate={navigate} nodes={nodes} prefs={prefs} onPrefs={setPrefs} mobile={mobilePreferences} onMobile={setMobilePreferences} siteName={me.site_name||'HEX'} authed={me.authed} connection={connection} lastUpdated={lastUpdated} loadAlerts={loadAlerts} onOpen={(id,section,probe)=>go(id,section,probe===undefined?'':`?routes=${probe}`)} onAlert={event=>go(event.nodeId,'',`?eventStart=${event.start}&eventEnd=${event.end??event.last}`)}/>}

        {open !== null && selected && <div className="detail-navigation">
          <Button className="detail-back" variant="ghost" aria-label={tr("返回总览")} title={tr("返回总览")} onClick={()=>go(null)}><ArrowLeft/><span>{tr("返回总览")}</span></Button>
        </div>}
        {open !== null ? (!nodes ? (<Skeleton className="h-96"/>) : selected ? (<Suspense fallback={<Skeleton className="h-96"/>}>
              <NodeDetail onBack={()=>go(null)} mobilePreferences={mobilePreferences} detailInfoMode={prefs.detailInfoMode} onDetailInfoMode={detailInfoMode=>selectDisplay({detailInfoMode})} key={selected.id} node={selected} probe={compactViewport?resolveProbe(selected.id,prefs.probe):prefs.probe} nodes={sorted} onSwitch={id=>{const q=new URLSearchParams(location.search);q.delete("eventStart");q.delete("eventEnd");q.delete("routes");go(id,location.hash.slice(1),q.size?"?"+q:"")}}/>
            </Suspense>) : (<p className="py-16 text-center text-sm text-muted-foreground">{tr("节点不存在或未公开。")}<button className="underline" onClick={() => go(null)}>{tr("返回列表")}</button>
            </p>)) : compactViewport ? null : !nodes ? (<>{mapVisible&&<MapPanel viewSwitch={viewSwitch} nodeSnapshot={mapKey} region={region} onRegion={setRegion} expanded={mapExpanded} onExpanded={toggleMap} pendingNodes/>}<div className="node-grid home-loading" aria-label={tr("正在加载节点")} aria-busy="true">
            {[0, 1, 2].map((i) => (<div key={i} className="loading-card" aria-hidden="true"><Skeleton className="loading-title"/><div className="loading-metrics">{[0,1,2,3].map(n=><Skeleton key={n}/>)}</div><Skeleton className="loading-speed"/><Skeleton className="loading-route"/></div>))}
          </div></>) : (<>
            <section className="overview-heading"><div className="page-heading"><h1>{tr("服务器总览")}</h1><span className={`live-label connection-${connection}`} role="status" title={[{connecting:tr("正在连接"),realtime:tr("实时连接"),polling:tr("轮询更新"),disconnected:tr("连接中断 \u00B7 数据可能已过期")}[connection],lastUpdated ? new Date(lastUpdated).toLocaleString(locale()) : tr("等待首次数据")].join(" · ")}><Radio size={14}/><span>{{ connecting: tr("正在连接"), realtime: tr("实时连接"), polling: tr("轮询更新"), disconnected: tr("连接中断 \u00B7 数据可能已过期") }[connection]}</span></span></div>
            <BillingReminders nodes={sorted} onOpen={id=>go(id)}/>
            <p className="update-time">{lastUpdated ? tr("最后更新：{0}", new Date(lastUpdated).toLocaleString(locale())) : tr("等待首次数据")}</p></section>
            <Summary status={status} onStatus={setStatus} onCollapse={summaryCollapsed=>setPrefs(prev=>({...prev,summaryCollapsed}))} nodes={sorted} prefs={prefs} loadAlerts={loadAlerts} onAlert={event=>go(event.nodeId,"",`?eventStart=${event.start}&eventEnd=${event.end??event.last}`)}/>
            <>{compactViewport&&<div className="mobile-node-toolbar"><div className="mobile-toolbar-main"><RegionPicker nodes={sorted} region={region} onChange={setRegion}/></div></div>}</>
            <section hidden={!showSystemFilters && !showActiveFilters} className="node-browser streamlined-browser" aria-label={tr("节点浏览")}>
            <div className="filters" hidden={!showSystemFilters}><div className="filter-categories"><div className="system-pills" role="group" aria-label={tr("系统快速筛选")}>{['all',...systems].map(key=><button key={key} aria-pressed={system===key} onClick={()=>setSystem(key)}>{key==='all'?tr("所有系统"):key==='other'?tr("其他 / 未知系统"):key}</button>)}</div>
</div>
</div>
            <div className="active-filters" hidden={!showActiveFilters}>
{status!=='all'&&!prefs.modules.online&&<button aria-label={tr("清除状态筛选")} onClick={()=>setStatus('all')}>{tr(status==='offline'?"离线":"在线")} ×</button>}
{showFilterFeedback&&<span className="filter-match-count">{tr("匹配 {0} 个节点",filtered.length)}</span>}
{system !== 'all' && <button aria-label={tr("清除系统筛选")} onClick={()=>setSystem('all')}>{system} ×</button>}
{browse.query && <button aria-label={tr("清除搜索筛选")} onClick={()=>setQuery('')}>{tr("搜索节点")}：{browse.query} ×</button>}
{showFilterFeedback && <button className="clear-all-filters" onClick={() => { setQuery(''); setStatus('all'); setRegion('all'); setSystem('all'); setGroupFilter('all'); }}>{tr("清除筛选")}</button>}
</div></section>


             {browse.view === 'table' && ['latency','loss'].includes(browse.sort) && <p className="sort-note">{tr("延迟和丢包按所选线路比较；无效或旧数据排在末尾。已读取")}{sorted.filter(n => getPing(n.id)?.data).length}/{sorted.length}{tr("个节点。")}{tr("各节点所选线路可能不同，延迟比较请注意探测目标。")}</p>}
            {mapVisible && <MapPanel viewSwitch={viewSwitch} nodeSnapshot={mapKey} region={region} onRegion={setRegion} expanded={mapExpanded} onExpanded={toggleMap}/>}

            <div id="node-results" tabIndex={-1}><div className={compactViewport ? "mobile-results-toolbar" : "desktop-results-toolbar"}><div className="results-heading">{!compactViewport&&<h2>{tr("节点")}</h2>}{groupPicker}{!compactViewport&&<span>{tr("匹配 {0} 个节点",filtered.length)}</span>}</div><div className="results-actions">{!compactViewport&&<DesktopRegionFilter nodes={sorted} region={region} onChange={setRegion}/>} {!compactViewport&&browse.view==='cards'&&<label className="desktop-card-density">{tr('卡片密度')}<Select aria-label={tr('卡片密度')} value={desktop.cardDensity} onChange={event=>setDesktop(current=>({...current,cardDensity:event.target.value as 'compact'|'detailed'}))}><option value="compact">{tr('紧凑')}</option><option value="detailed">{tr('详细')}</option></Select></label>}{viewSwitch}</div></div>{sorted.length === 0 ? (<div className="empty-state"><p>{tr("还没有节点")}</p>{me.authed ? <Button variant="outline" asChild><a href="/admin/">{tr("前往后台添加节点")}</a></Button> : <p>{tr("请联系管理员添加节点。")}</p>}</div>) : filtered.length === 0 ? (<div className="empty-state"><p>{tr("没有符合条件的节点")}</p><Button variant="outline" onClick={() => { setQuery(''); setStatus('all'); setRegion('all'); setSystem('all'); setGroupFilter('all'); }}>{tr("清除筛选")}</Button></div>) : browse.view === "table" ? (<NodeTable page={page} onPageChange={page=>setTablePage({key:pageKey,page})} nodes={filtered} browse={{...browse,columns:shownColumns}} onSort={sortBy} onSortChange={(sort,direction)=>patchBrowse({sort,direction})} onResetColumns={resetDesktopColumns} mobile={compactViewport} warn={prefs.latencyWarn} high={prefs.latencyHigh} onOpen={id => go(id)}/>) : (<div className="node-grid" data-columns={prefs.desktopColumns}>{filtered.map(n=><NodeCard key={n.id} node={n} mobile={mobileCards} density={desktop.cardDensity} prefs={prefs} info={mobileCards && prefs.mobileInfoMode==='custom' ? prefs.mobileCardInfo || prefs.cardInfo : prefs.cardInfo} probe={prefs.probe} onOpen={()=>go(n.id)} onOpenRoutes={route=>go(n.id,"latency",`?routes=${route.kind==="all"?"all":route.id}`)}/>)}</div>)}</div>
          </>)}
      </main>
      {!compactViewport && open === null && showScrollTop && <button type="button" className="back-to-top" aria-label={tr("返回顶部")} title={tr("返回顶部")} onClick={() => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })}><ArrowUp size={17}/></button>}
      <footer className="site-footer"><span>{themeManifest.name} · {themeManifest.version}</span><span>Powered by monitor-probe</span></footer>
    </div>);
}
