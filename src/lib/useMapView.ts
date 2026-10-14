import {useCallback,useEffect,useRef,useState} from 'react'
export type MapView={x:number;y:number;k:number}
type Update=MapView|((v:MapView)=>MapView)
/** One view drives both SVG hit targets and WebGL throughout the 260ms transition. */
export function useMapView(initial:()=>MapView,motion:boolean){
 const [view,commit]=useState(initial),current=useRef(view),target=useRef(view),frame=useRef(0)
 const stop=useCallback(()=>{cancelAnimationFrame(frame.current);frame.current=0;target.current=current.current},[])
 const set=useCallback((next:Update,animate=false)=>{
  const destination=typeof next==='function'?next(target.current):next
  stop();target.current=destination
  const from=current.current,start=performance.now()
  const draw=(time:number)=>{
   const t=animate&&motion?Math.min(1,(time-start)/260):1,ease=1-(1-t)**3
   current.current=t===1?destination:{x:from.x+(destination.x-from.x)*ease,y:from.y+(destination.y-from.y)*ease,k:from.k+(destination.k-from.k)*ease}
   commit(current.current)
   frame.current=t<1?requestAnimationFrame(draw):0
  }
  frame.current=requestAnimationFrame(draw)
 },[motion,stop])
 useEffect(()=>{if(!motion)set(target.current)},[motion,set])
 useEffect(()=>stop,[stop])
 return {view,set,stop}
}
