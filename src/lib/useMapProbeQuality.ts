import {useEffect,useMemo,useState,useSyncExternalStore,type RefObject} from 'react'
import {getPing,pingRevision,subscribePing,subscribeNodePing,watchPing} from './ping'
import {probeRevision,resolveProbe,subscribeProbes} from './nodeProbes'
import {mapProbeQuality} from './mapProbeQuality'
import type {MapTrafficNode} from './mapTraffic'

/** Share the card cache and its two-request limit; poll while the active map is visible or its probe filter needs live samples. */
export function useMapProbeQuality(nodes:MapTrafficNode[],panel:RefObject<HTMLElement|null>,probe:string,warn:number,high:number,active=true,filterActive=false){
 const revision=useSyncExternalStore(subscribePing,pingRevision)
 const selection=useSyncExternalStore(subscribeProbes,probeRevision)
 const [now,setNow]=useState(Date.now),[visible,setVisible]=useState(false)
 const ids=JSON.stringify(nodes.filter(n=>n.online).map(n=>n.id))
 useEffect(()=>{
  if(!active){setVisible(false);return}
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting))
  if(panel.current)observer.observe(panel.current)
  return()=>observer.disconnect()
 },[panel,active])
 useEffect(()=>{
  if(!active||(!visible&&!filterActive))return
  const observed=JSON.parse(ids) as number[],unsub=observed.map(id=>subscribeNodePing(id,()=>{}))
  const stop=watchPing(observed),tick=()=>setNow(Date.now())
  const timer=setInterval(()=>{if(!document.hidden)tick()},15000)
  document.addEventListener('visibilitychange',tick)
  return()=>{stop();unsub.forEach(f=>f());clearInterval(timer);document.removeEventListener('visibilitychange',tick)}
 },[ids,visible,active,filterActive])
 // These revisions invalidate external mutable snapshots and per-node selections.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 return useMemo(()=>new Map(nodes.map(n=>[n.id,mapProbeQuality(getPing(n.id),resolveProbe(n.id,probe),warn,high,Math.max(now,Date.now()))])),[nodes,probe,warn,high,revision,selection,now])
}
