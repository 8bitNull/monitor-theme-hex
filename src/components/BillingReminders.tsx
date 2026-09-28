import {useEffect,useId,useRef,useState} from 'react'
import {Bell,ChevronRight,X} from 'lucide-react'
import type {Node} from '@/lib/api'
import {expiring,quotaWarning} from '@/lib/billingReminders'
import {daysUntil} from '@/lib/format'
import {trafficUsage} from '@/lib/traffic'
import {tr} from '@/lib/i18n'
import '@/styles/billing-reminders.css'

function ReminderDialog({nodes,onClose,onOpen}:{nodes:Node[];onClose:()=>void;onOpen:(id:number)=>void}){
 const dialog=useRef<HTMLDialogElement>(null),titleId=useId(),noteId=useId()
 useEffect(()=>{
  const el=dialog.current!,trigger=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow
  el.showModal();document.body.style.overflow='hidden'
  return()=>{el.close();document.body.style.overflow=overflow;if(trigger?.isConnected)trigger.focus({preventScroll:true})}
 },[])
 return <dialog ref={dialog} className="billing-reminder-dialog" aria-labelledby={titleId} aria-describedby={noteId} onCancel={onClose} onClick={event=>{
  if(event.target!==event.currentTarget)return
  const rect=event.currentTarget.getBoundingClientRect()
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose()
 }}>
  <div className="billing-reminder-heading"><h2 id={titleId}>{tr('到期与用量')}</h2><button type="button" autoFocus aria-label={tr('关闭')} onClick={onClose}><X size={18}/></button></div>
  <p id={noteId} className="billing-reminder-note">{tr('已到期或 7 天内到期，或流量已使用至少 90%。')}</p>
  <div className="billing-reminder-list">
   {nodes.length===0?<p className="billing-reminder-empty" role="status">{tr('暂无到期或流量提醒')}</p>:nodes.map(node=>{
    const days=daysUntil(node.expires_at)
    return <button type="button" className="billing-reminder-node" key={node.id} onClick={()=>{onClose();onOpen(node.id)}}>
     <span><strong>{node.name}</strong><span className="billing-reminder-reasons">
      {expiring(node)&&<span data-expired={days!==null&&days<0}>{days!==null&&days<0?tr('已到期'):days===0?tr('今日到期'):tr('剩余 {0} 天',days!)}</span>}
      {quotaWarning(node)&&<span>{tr('流量已用 {0}%',Math.round(trafficUsage(node).value/node.traffic_limit*100))}</span>}
     </span></span><ChevronRight size={16} aria-hidden="true"/>
    </button>
   })}
  </div>
 </dialog>
}

/** Global account reminders, independent of the current node search or card fields. */
export function BillingReminders({nodes,onOpen}:{nodes:Node[];onOpen:(id:number)=>void}){
 const [open,setOpen]=useState(false)
 const reminders=nodes.filter(node=>expiring(node)||quotaWarning(node))
 if(!reminders.length&&!open)return null
 return <div className="billing-reminders">
  {reminders.length>0&&<button type="button" className="billing-reminder-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={tr('到期与用量 · {0} 个节点需要关注',reminders.length)} onClick={()=>setOpen(true)}><Bell size={15} aria-hidden="true"/><span>{tr('到期与用量')}</span><b>{reminders.length}</b></button>}
  {open&&<ReminderDialog nodes={reminders} onClose={()=>setOpen(false)} onOpen={onOpen}/>}
 </div>
}
