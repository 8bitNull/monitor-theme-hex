import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import type {HexMapFrame,HexMapRenderer} from '../lib/mapHexRenderer'
import type {MapTheme} from '../lib/worldMapModel'

export function useMapMotion(){
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)
 useEffect(()=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(query.matches)
  query.addEventListener('change',change);return()=>query.removeEventListener('change',change)
 },[])
 return !reduced
}
export function useMapTheme(theme?:MapTheme){
 const [detected,setDetected]=useState<MapTheme>(()=>document.documentElement.classList.contains('dark')?'dark':'light')
 useEffect(()=>{
  const update=()=>setDetected(document.documentElement.classList.contains('dark')?'dark':'light')
  const observer=new MutationObserver(update);observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']})
  return()=>observer.disconnect()
 },[])
 return theme??detected
}
/** Lazy-load Three.js only for visible animated maps. SVG stays usable on every failure. */
export function ThreeMapCanvas({frame,motion,onStatus}:{frame:HexMapFrame;motion:boolean;onStatus:(ready:boolean)=>void}){
 const canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<HexMapRenderer|null>(null)
 const latest=useRef(frame),status=useRef(onStatus),[failed,setFailed]=useState(false)
 useLayoutEffect(()=>{latest.current=frame;status.current=onStatus;renderer.current?.update(frame)},[frame,onStatus])
 useEffect(()=>{
  status.current(false)
  if(!motion||failed)return
  const element=canvas.current!
  let active=true,started=false
  const observer=new IntersectionObserver(entries=>{
   if(started||!entries[0].isIntersecting)return
   started=true;observer.disconnect()
   void import('../lib/mapHexRenderer').then(module=>{
    if(!active)return
    try{
     renderer.current=module.createHexMapRenderer(element,()=>{if(active){setFailed(true);status.current(false)}})
     renderer.current.update(latest.current);status.current(true)
    }catch{if(active)setFailed(true)}
   }).catch(()=>{if(active)setFailed(true)})
  })
  observer.observe(element)
  return()=>{active=false;observer.disconnect();renderer.current?.dispose();renderer.current=null;status.current(false)}
 },[motion,failed])
 return !motion||failed?null:<canvas ref={canvas} className="map-traffic-canvas hex-map-canvas" aria-hidden="true"/>
}
