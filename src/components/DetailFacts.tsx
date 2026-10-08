import type {Preferences} from '@/lib/appearance'
import type {Node} from '@/lib/api'
import {liveMetrics} from '@/lib/freshness'
import {tr} from '@/lib/i18n'
import {bytes,osName} from '@/lib/format'
import {useEffect,useRef,useState} from 'react'
import type {ComponentType,ReactNode} from 'react'
import {Copy,Check,Cpu,Network} from 'lucide-react'

function Fact({ label, value, warning=false,copy=false }: {
    label: string;
    warning?:boolean;
    copy?:boolean;
    value?: string | number | null;
}) {
    const [notice,setNotice]=useState('');
    const request=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
    useEffect(()=>()=>{request.current++;clearTimeout(timer.current)},[value]);
    const copyValue=async()=>{const id=++request.current;clearTimeout(timer.current);setNotice('');try{await navigator.clipboard.writeText(String(value));if(id!==request.current)return;setNotice(tr('已复制'));timer.current=setTimeout(()=>setNotice(''),2000)}catch{if(id===request.current)setNotice(tr('复制失败，请手动选择文本'))}};
    if (value === null || value === undefined || value === "")
        return null;
    const stackOnMobile=String(value).length>26;
    return (<div className={`min-w-0${String(value).length>32?" fact-long":""}${stackOnMobile?' mobile-fact-stacked':''}`}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`detail-fact text-sm ${warning?"detail-expiry-warning":""}`}><span className="fact-value">{value}</span>{copy&&<span className="copy-control"><button className="copy-fact" aria-label={tr("复制：{0}",label)} title={tr("复制：{0}",label)} onClick={copyValue}>{notice===tr("已复制")?<Check size={14}/>:<Copy size={14}/>}</button>{notice&&<small role="status" className="copy-notice">{notice}</small>}</span>}</dd>
    </div>);
}
function FactSection({label,Icon,children}:{label:string;Icon:ComponentType<{size?:number}>;children:ReactNode}){
    return <section aria-label={label}><div className="detail-fact-disclosure"><div className="fact-section-heading"><h3><Icon size={15}/>{label}</h3></div><div className="detail-fact-section-body">{children}</div></div></section>;
}
export function DetailFacts({node,mobile=false}:{node:Node;mode:Preferences['detailInfoMode'];compact:boolean;mobile?:boolean;onMode:(mode:Preferences['detailInfoMode'])=>void}){
 const m=liveMetrics(node)
 const hardware=[
   {key:'agent',label:'Agent',value:node.agent_version},
   {key:'system',label:tr('系统'),value:[osName(node.os),node.kernel].filter(Boolean).join(' · ')},
   {key:'cpu',label:'CPU',value:node.cpu_name?`${node.cpu_name} × ${node.cpu_cores}`:tr('{0} 核',node.cpu_cores)},
   {key:'capacity',label:tr('内存 / 硬盘'),value:`${bytes(node.mem_total)} / ${bytes(node.disk_total)}`},
   {key:'arch',label:tr('架构 / 虚拟化'),value:[node.arch,node.virt!=='none'?node.virt:''].filter(Boolean).join(' · ')},
   {key:'swap',label:tr('交换空间'),value:m?`${bytes(m.swap_used)} / ${bytes(m.swap_total)}`:'—'},
 ]
 const orderedHardware=mobile?['cpu','capacity','system','arch','swap','agent'].map(key=>hardware.find(item=>item.key===key)!):hardware
 return <div className="detail-information"><div id="detail-fact-groups" className="detail-fact-groups">
   <FactSection label={tr("硬件与系统")} Icon={Cpu}>
     <dl className="detail-facts">
       {orderedHardware.map(item=><Fact key={item.key} label={item.label} value={item.value}/>)}
     </dl>
   </FactSection>
   <FactSection label={tr("网络与流量")} Icon={Network}>

     <dl className="detail-facts">
       <Fact copy label="IPv4" value={node.ipv4}/><Fact copy label="IPv6" value={node.ipv6}/><Fact label={tr("流量重置")} value={Number.isInteger(node.traffic_reset_day) && node.traffic_reset_day >= 1 && node.traffic_reset_day <= 31 ? tr("每月 {0} 日",node.traffic_reset_day) : tr("未知")}/>
       <Fact label={tr("累计流量")} value={`↑ ${bytes(node.total_tx)} · ↓ ${bytes(node.total_rx)}`}/>
       <Fact label={tr("今日流量")} value={`↑ ${bytes(node.day_tx)} · ↓ ${bytes(node.day_rx)}`}/>
     </dl>
   </FactSection>
 </div></div>;
}
