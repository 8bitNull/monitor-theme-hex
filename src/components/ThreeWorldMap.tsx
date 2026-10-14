import {useEffect,useId,useLayoutEffect,useMemo,useRef,useState,type CSSProperties} from 'react'
import {land,graticule} from '../data/map-flat.json'
import {fitMapWorld,projectMap,resolveMapConnections,placeMapLabels,connectionPath,type WorldMapNode,type WorldMapConnection,type MapTheme} from '../lib/worldMapModel'
import {useMapParallax} from '../lib/useMapParallax'
import {ThreeMapCanvas,useMapMotion,useMapTheme} from './ThreeMapCanvas'
import '../styles/hex-world-map.css'

export type ThreeWorldMapProps={
 nodes:WorldMapNode[];connections?:WorldMapConnection[];theme?:MapTheme
 selected?:string;onSelect?:(id:string)=>void;className?:string;style?:CSSProperties;ariaLabel?:string
}
const emptyConnections:WorldMapConnection[]=[]
const metric=(value:number|null|undefined,max=Infinity)=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=max?value:null

/** A complete flat world map. Its parent controls dimensions; all effects use real input data. */
export function ThreeWorldMap({nodes,connections=emptyConnections,theme,selected,onSelect,className='',style,ariaLabel='World network map'}:ThreeWorldMapProps){
 const host=useRef<HTMLDivElement>(null),scene=useRef<HTMLDivElement>(null),tooltip=useRef<HTMLDivElement>(null)
 const [size,setSize]=useState({width:1000,height:360}),[ready,setReady]=useState(false)
 const [hovered,setHovered]=useState<string|null>(null),[focused,setFocused]=useState<string|null>(null)
 const [tipPosition,setTipPosition]=useState({x:8,y:8}),tooltipId=useId()
 const motion=useMapMotion(),palette=useMapTheme(theme)
 useMapParallax(host,scene,motion)
 useEffect(()=>{
  const element=host.current!
  const update=()=>{const {width,height}=element.getBoundingClientRect();if(width&&height)setSize(old=>old.width===width&&old.height===height?old:{width,height})}
  update();const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect()
 },[])
 const geographic=useMemo(()=>nodes.flatMap(node=>{const point=projectMap(node.longitude,node.latitude);return point?[{...node,x:point[0],y:point[1]}]:[]}),[nodes])
 const view=useMemo(()=>fitMapWorld(size.width,size.height,22,{top:Math.min(0,...geographic.map(p=>p.y-18)),bottom:Math.max(360,...geographic.map(p=>p.y+18))}),[size,geographic])
 const points=useMemo(()=>geographic.map(node=>({...node,x:node.x*view.k+view.x,y:node.y*view.k+view.y})),[geographic,view])
 const resolved=useMemo(()=>resolveMapConnections(nodes,connections),[nodes,connections])
 const labels=useMemo(()=>placeMapLabels(points,size.width,size.height),[points,size])
 const active=points.find(node=>node.id===(hovered??focused))
 const frame=useMemo(()=>({width:size.width,height:size.height,view,nodes:points,connections:resolved,selected,theme:palette}),[size,view,points,resolved,selected,palette])
 useLayoutEffect(()=>{
  if(!active||!tooltip.current)return
  const {width,height}=tooltip.current.getBoundingClientRect()
  setTipPosition({x:Math.max(8,Math.min(size.width-width-8,active.x-width/2)),y:Math.max(8,Math.min(size.height-height-8,active.y-height-16))})
 },[active,size])
 return <div ref={host} className={`three-world-map ${className}`} style={style} data-theme={palette} data-webgl={ready}>
  <div ref={scene} className="map-parallax-scene">
   <ThreeMapCanvas frame={frame} motion={motion} onStatus={setReady}/>
   <svg viewBox={`0 0 ${size.width} ${size.height}`} role="group" aria-label={ariaLabel} onKeyDown={event=>{if(event.key==='Escape'){setHovered(null);setFocused(null)}}}>
    <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`} className="hex-map-fallback" aria-hidden="true"><path d={land}/><path className="hex-grid-lines" d={graticule}/></g>
    {/* SVG routes provide a static, non-animated fallback, with identical geographic wrapping. */}
    {!ready&&resolved.map(connection=><path key={connection.id} className="map-static-connection" data-connection={connection.id} transform={`translate(${view.x} ${view.y}) scale(${view.k})`} d={connectionPath(connection)} aria-hidden="true"/>)}
    {resolved.map(connection=><g key={connection.id} className="map-connection" data-from={connection.from} data-to={connection.to} aria-hidden="true"/>)}
    {points.map(node=><g key={node.id} transform={`translate(${node.x} ${node.y})`} className="hex-map-node" data-online={node.online} data-attention={node.attention} role="button" tabIndex={0} aria-label={node.name} aria-pressed={selected===node.id} aria-describedby={active?.id===node.id?tooltipId:undefined}
     onMouseEnter={()=>setHovered(node.id)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setFocused(node.id)} onBlur={()=>setFocused(null)} onClick={()=>onSelect?.(node.id)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect?.(node.id)}}}>
     <circle className="hex-node-hit" r={18}/><circle className="hex-node-ring" r={7}/><circle className="hex-node-core" r={2.7}/>{labels.get(node.id)!==null&&<text y={labels.get(node.id)!} textAnchor="middle">{node.label??node.name}</text>}
    </g>)}
   </svg>
   {active&&<div ref={tooltip} id={tooltipId} role="tooltip" className="hex-node-tooltip" style={{left:tipPosition.x,top:tipPosition.y}}><strong>{active.name}</strong><span><i className="hex-status-dot" data-online={active.online}/>{active.online?'Online':'Offline'}</span><dl><div><dt>Ping</dt><dd>{metric(active.ping)!==null?`${active.ping} ms`:'—'}</dd></div><div><dt>Packet loss</dt><dd>{metric(active.loss,100)!==null?`${active.loss}%`:'—'}</dd></div></dl></div>}
  </div>
 </div>
}
