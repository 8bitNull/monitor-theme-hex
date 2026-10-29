import type {Preferences} from '@/lib/appearance'
import type {Node} from '@/lib/api'
import {liveMetrics} from '@/lib/freshness'
import {tr} from '@/lib/i18n'
import {bytes,osName} from '@/lib/format'
import {useEffect,useRef,useState} from 'react'
import type {ComponentType,ReactNode} from 'react'
import {Copy,Check,Cpu,Monitor,Network} from 'lucide-react'

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
function HardwareFacts({node,mobile}:{node:Node;mobile:boolean}){
 const m=liveMetrics(node)
 return <FactSection label={tr('硬件配置')} Icon={Cpu}><dl className="detail-facts hardware-facts">
  <Fact label="CPU" value={node.cpu_name?`${node.cpu_name} × ${node.cpu_cores}`:tr('{0} 核',node.cpu_cores)}/>
  {mobile?<Fact label={tr('内存 / 硬盘')} value={`${bytes(node.mem_total)} / ${bytes(node.disk_total)}`}/>:<><Fact label={tr('内存')} value={bytes(node.mem_total)}/><Fact label={tr('硬盘')} value={bytes(node.disk_total)}/></>}
  <Fact label={tr('交换空间')} value={m?`${bytes(m.swap_used)} / ${bytes(m.swap_total)}`:'—'}/>
 </dl></FactSection>
}
function SystemFacts({node,mobile}:{node:Node;mobile:boolean}){
 return <FactSection label={tr('系统环境')} Icon={Monitor}><dl className="detail-facts">
  {!mobile&&<Fact label="Agent" value={node.agent_version}/>}
  {mobile?<><Fact label={tr('系统')} value={[osName(node.os),node.kernel].filter(Boolean).join(' · ')}/><Fact label={tr('架构 / 虚拟化')} value={[node.arch,node.virt!=='none'?node.virt:''].filter(Boolean).join(' · ')}/><Fact label="Agent" value={node.agent_version}/><Fact label={tr('节点分组')} value={node.group||tr('未分组')}/></>:<><Fact label={tr('操作系统')} value={osName(node.os)}/><Fact label={tr('内核')} value={node.kernel}/><Fact label={tr('架构')} value={node.arch}/><Fact label={tr('虚拟化')} value={node.virt}/></>}
 </dl></FactSection>
}
function AddressFacts({node}:{node:Node}){
 if(!node.ipv4?.trim()&&!node.ipv6?.trim())return null
  return <FactSection label={tr('网络地址')} Icon={Network}><dl className="detail-facts address-facts"><Fact copy label="IPv4" value={node.ipv4?.trim()}/><Fact copy label="IPv6" value={node.ipv6?.trim()}/></dl></FactSection>
}
export function DetailFacts({node,mobile=false}:{node:Node;mode:Preferences['detailInfoMode'];compact:boolean;mobile?:boolean;onMode:(mode:Preferences['detailInfoMode'])=>void}){
 return <div className="detail-information">
  {!mobile&&<h2 className="detail-section-title">{tr('节点资料')}</h2>}
  <div id="detail-fact-groups" className="detail-fact-groups">
    <HardwareFacts node={node} mobile={mobile}/><SystemFacts node={node} mobile={mobile}/><AddressFacts node={node}/>
  </div>
 </div>
}
