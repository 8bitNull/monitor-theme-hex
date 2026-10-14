import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ThreeWorldMap} from '../../src/components/ThreeWorldMap'
import type {WorldMapNode,WorldMapConnection} from '../../src/lib/worldMapModel'
import './style.css'

const cities:WorldMapNode[]=[
 {id:'tokyo',name:'东京',label:'Tokyo',longitude:139.69,latitude:35.68,online:true,ping:12,loss:0,tx:1_500_000,rx:7_000_000},
 {id:'singapore',name:'新加坡',label:'Singapore',longitude:103.82,latitude:1.35,online:true,ping:42,loss:0,tx:3_000_000,rx:12_000_000},
 {id:'hongkong',name:'香港',label:'Hong Kong',longitude:114.17,latitude:22.32,online:true,ping:28,loss:.2,tx:4_000_000,rx:9_000_000},
 {id:'frankfurt',name:'法兰克福',label:'Frankfurt',longitude:8.68,latitude:50.11,online:true,ping:148,loss:0,tx:2_000_000,rx:3_000_000},
 {id:'london',name:'伦敦',label:'London',longitude:-.13,latitude:51.51,online:true,ping:176,loss:.1,tx:500_000,rx:1_000_000},
 {id:'sanjose',name:'圣何塞',label:'San Jose',longitude:-121.89,latitude:37.34,online:true,ping:136,loss:0,tx:12_000_000,rx:20_000_000},
]
const links:WorldMapConnection[]=[
 {id:'jp-hk',from:'tokyo',to:'hongkong',ping:28,loss:.2},
 {id:'hk-sg',from:'hongkong',to:'singapore',ping:42,loss:0},
 {id:'sg-de',from:'singapore',to:'frankfurt',ping:148,loss:0},
 {id:'de-gb',from:'frankfurt',to:'london',ping:16,loss:.1},
 {id:'gb-us',from:'london',to:'sanjose',ping:136,loss:0},
 {id:'us-jp',from:'sanjose',to:'tokyo',ping:116,loss:0},
]
function Demo(){
 const [theme,setTheme]=useState<'dark'|'light'>('dark'),[mounted,setMounted]=useState(true),[connections,setConnections]=useState(true),[missing,setMissing]=useState(false),[selected,setSelected]=useState<string>()
 const [ping,setPing]=useState(42)
 const nodes=cities.map(node=>({...node,ping:missing?null:node.id==='singapore'?ping:node.ping,loss:missing?null:node.loss}))
 const edges=links.map(link=>({...link,ping:missing?null:link.id==='hk-sg'?ping:link.ping}))
 return <main data-theme={theme}>
  <header><a href="#" aria-label="HEX">H<span>E</span>X<span className="brand-dot"/></a><span className="header-caption">NETWORK OBSERVABILITY</span><button onClick={()=>setTheme(theme==='dark'?'light':'dark')}>切换主题</button></header>
  <div className="intro"><span className="eyebrow">GLOBAL INFRASTRUCTURE</span><h1>让网络状态，一眼可见。</h1><p>平面蜂窝地图 · 实时链路脉冲 · 延迟驱动的粒子流</p></div>
  <section className="map-card"><div className="map-card-header"><div><span className="status-dot"/>全球核心节点 <small>6 REGIONS</small></div><span className="map-legend"><i/>在线 <b>↑</b>上传 <b className="download">↓</b>下载</span></div>
   {mounted?<ThreeWorldMap nodes={nodes} connections={connections?edges:[]} theme={theme} selected={selected} onSelect={setSelected} style={{height:'min(48vw,440px)'}}/>:<div className="empty">地图已卸载，GPU 资源已释放。</div>}
   <div className="map-card-footer"><span>悬停查看 Ping 与丢包 · 鼠标移动感受轻微视差</span><span>SIMULATED DATA / 演示数据</span></div>
  </section>
  <div className="demo-controls"><label>香港 → 新加坡 Ping <input type="range" min="0" max="400" step="1" value={ping} onChange={event=>setPing(Number(event.target.value))}/><output>{ping} ms</output></label><button onClick={()=>setConnections(!connections)}>{connections?'隐藏连接':'显示连接'}</button><button onClick={()=>setMissing(!missing)}>{missing?'恢复探测数据':'缺失探测数据'}</button><button onClick={()=>setMounted(!mounted)}>{mounted?'卸载地图':'挂载地图'}</button></div>
  <div className="metrics">{nodes.map(node=><div key={node.id}><span className="city-code">{({tokyo:'JP',singapore:'SG',hongkong:'HK',frankfurt:'DE',london:'GB',sanjose:'US'})[node.id]}</span><strong>{node.label}</strong><span className="city-latency">{node.ping===null?'—':`${node.ping} ms`}</span><div className="spark"><i style={{width:`${20+(node.ping??0)/4}%`}}/></div></div>)}</div>
  <p className="note">演示使用模拟城市与连接。首页使用服务器真实地区和探测数据；精确坐标及连接需由业务方传入。</p>
 </main>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Demo/></React.StrictMode>)
