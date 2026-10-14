import {useLayoutEffect,useState,type RefObject} from 'react'
import type {MapRect} from './worldMapModel'

/** Read real overlay sizes, including translated labels and region feedback. */
export function useMapOverlayBounds(panel:RefObject<HTMLElement|null>,full:boolean,revision:string,toolsHost?:HTMLElement|null){
 const [bounds,setBounds]=useState<MapRect[]>([])
 useLayoutEffect(()=>{
  const surface=panel.current,frame=surface?.closest('.map-frame')
  if(!surface||!frame)return
  const overlays=[...(full?surface:frame).querySelectorAll<HTMLElement>('[data-map-overlay]')]
  const measure=()=>{
   const base=surface.getBoundingClientRect()
   const next=overlays.map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0).map(r=>({x:r.left-base.left,y:r.top-base.top,width:r.width,height:r.height}))
   setBounds(old=>JSON.stringify(old)===JSON.stringify(next)?old:next)
  }
  measure()
  const observer=new ResizeObserver(measure)
  observer.observe(surface);overlays.forEach(el=>observer.observe(el))
  return()=>observer.disconnect()
 },[panel,full,revision,toolsHost])
 return bounds
}
