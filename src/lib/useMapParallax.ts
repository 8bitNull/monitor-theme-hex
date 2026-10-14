import {useEffect,type RefObject} from 'react'

/** Transform the canvas and its SVG hit targets together to keep pointer/tooltip alignment. */
export function useMapParallax(stage:RefObject<HTMLElement|null>,scene:RefObject<HTMLElement|null>,enabled:boolean){
 useEffect(()=>{
  const host=stage.current,layer=scene.current
  if(!host||!layer)return
  // This is an owned DOM effect, not a mutation of React state or props.
  // oxlint-disable-next-line react/immutability
  if(!enabled){layer.style.transform='';return}
  let x=0,y=0,targetX=0,targetY=0,request=0,stopped=false
  const tick=()=>{
   request=0;if(stopped)return
   x+=(targetX-x)*.15;y+=(targetY-y)*.15
   layer.style.transform=`translate3d(${x*3}px,${y*2}px,0) rotateX(${-y*.6}deg) rotateY(${x*.8}deg)`
   if(Math.abs(targetX-x)+Math.abs(targetY-y)>.002)request=requestAnimationFrame(tick)
  }
  const schedule=()=>{if(!request&&!document.hidden)request=requestAnimationFrame(tick)}
  const move=(event:PointerEvent)=>{
   if(event.pointerType!=='mouse')return
   // Keep a node and its tooltip still while the user reads or clicks it.
   if(event.buttons!==0||(event.target instanceof Element&&event.target.closest('.map-cluster,.hex-map-node,.map-canvas-controls,.map-tools,[data-map-overlay]'))){
    cancelAnimationFrame(request);request=0;targetX=x;targetY=y;return
   }
   const r=host.getBoundingClientRect();targetX=Math.max(-1,Math.min(1,2*(event.clientX-r.left)/r.width-1));targetY=Math.max(-1,Math.min(1,2*(event.clientY-r.top)/r.height-1));schedule()
  }
  const leave=()=>{targetX=targetY=0;schedule()}
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(request);request=0}else leave()}
  host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',visibility)
  return()=>{stopped=true;cancelAnimationFrame(request);layer.style.transform='';host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility)}
 },[stage,scene,enabled])
}
