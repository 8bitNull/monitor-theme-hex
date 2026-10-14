import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import type {FlowRegion,TrafficRenderer} from '@/lib/mapTrafficRenderer'

export function MapTrafficEffects({regions,selected,width,height}:{regions:FlowRegion[];selected:string;width:number;height:number}){
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)
 const [failed,setFailed]=useState(false)
 const canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<TrafficRenderer|null>(null)
 const latest=useRef({regions,selected,width,height})
 const update=useRef(()=>{})
 useEffect(()=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(query.matches)
  query.addEventListener('change',change);return()=>query.removeEventListener('change',change)
 },[])
 useEffect(()=>{
  if(reduced||failed)return
  const element=canvas.current!
  const theme=element.closest('.next-theme')!
  let active=true
  update.current=()=>{
   const style=getComputedStyle(theme)
   renderer.current?.update({...latest.current,upload:style.getPropertyValue('--tone').trim(),download:style.getPropertyValue('--ok').trim()})
  }
  const observer=new MutationObserver(()=>update.current())
  observer.observe(theme,{attributes:true,attributeFilter:['data-palette','data-skin','style']})
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['class','style']})
  void import('@/lib/mapTrafficRenderer').then(module=>{
   if(!active)return
   try{renderer.current=module.createMapTrafficRenderer(element,()=>{if(active)setFailed(true)});update.current()}catch{setFailed(true)}
  }).catch(()=>{if(active)setFailed(true)})
  return()=>{active=false;observer.disconnect();renderer.current?.dispose();renderer.current=null}
 },[reduced,failed])
 useLayoutEffect(()=>{latest.current={regions,selected,width,height};update.current()},[regions,selected,width,height])
 return reduced||failed?null:<canvas ref={canvas} className="map-traffic-canvas" aria-hidden="true"/>
}
