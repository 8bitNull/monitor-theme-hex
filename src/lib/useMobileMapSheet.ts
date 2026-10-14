import {useEffect,useLayoutEffect,useRef,useState,type RefObject,type PointerEvent,type KeyboardEvent} from 'react'
import {mobileMapSheetHeights,snapMobileMapSheet,type MobileMapSheetState} from './mobileMap'
const states:MobileMapSheetState[]=['collapsed','half','expanded']
const key='hex-mobile-map-sheet-v1'
function initial():MobileMapSheetState{
 try{const saved=sessionStorage.getItem(key);if(states.includes(saved as MobileMapSheetState))return saved as MobileMapSheetState}catch{/* Optional persistence. */}
 return innerHeight<500?'collapsed':'half'
}
/** The sheet owns vertical gestures; the atlas retains its independent pan/zoom camera. */
export function useMobileMapSheet(root:RefObject<HTMLElement|null>){
 const [state,setState]=useState(initial),[size,setSize]=useState({height:innerHeight,top:76,bottom:76})
 const [dragHeight,setDragHeight]=useState<number|null>(null),drag=useRef<{id:number;y:number;height:number}|null>(null),moved=useRef(false)
 const heights=mobileMapSheetHeights(size.height,size.top,size.bottom)
 const height=dragHeight===null?heights[state]:Math.max(heights.collapsed,Math.min(heights.expanded,dragHeight))
 useLayoutEffect(()=>{
  const element=root.current;if(!element)return
  const header=element.querySelector('.mm-page-header'),nav=element.querySelector('.mm-nav')
  const update=()=>{
   const r=element.getBoundingClientRect(),top=(header?.getBoundingClientRect().bottom??r.top+64)-r.top+12,bottom=nav?.getBoundingClientRect().height??76
   setSize(old=>old.height===r.height&&old.top===top&&old.bottom===bottom?old:{height:r.height,top,bottom})
  }
  update();const observer=new ResizeObserver(update);observer.observe(element);if(header)observer.observe(header);if(nav)observer.observe(nav)
  return()=>observer.disconnect()
 },[root])
 useEffect(()=>{try{sessionStorage.setItem(key,state)}catch{/* Optional persistence. */}},[state])
 const settle=(e:PointerEvent)=>{
  const current=drag.current;if(!current||current.id!==e.pointerId)return
  const next=current.height+current.y-e.clientY
  drag.current=null;setDragHeight(null);setState(snapMobileMapSheet(next,heights))
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)
 }
 return {state,height,bottom:height+size.bottom,collapsedBottom:heights.collapsed+size.bottom,dragging:dragHeight!==null,setState,
  handle:{
   onPointerDown(e:PointerEvent){if(e.button!==0)return;moved.current=false;drag.current={id:e.pointerId,y:e.clientY,height};e.currentTarget.setPointerCapture(e.pointerId)},
   onPointerMove(e:PointerEvent){const d=drag.current;if(!d||d.id!==e.pointerId)return;if(Math.abs(e.clientY-d.y)<5&&!moved.current)return;moved.current=true;setDragHeight(d.height+d.y-e.clientY)},
   onPointerUp:settle,
   onPointerCancel(){drag.current=null;setDragHeight(null);moved.current=true},
   onLostPointerCapture(){drag.current=null;setDragHeight(null)},
   onClick(){if(moved.current){moved.current=false;return}setState(s=>s==='expanded'?'half':'expanded')},
   onKeyDown(e:KeyboardEvent){const index=states.indexOf(state);if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();setState(e.key==='Home'?'collapsed':e.key==='End'?'expanded':states[Math.max(0,Math.min(2,index+(e.key==='ArrowUp'?1:-1)))])},
  },
 }
}
