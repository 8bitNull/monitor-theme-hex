import {useEffect,useId,useRef,type ReactNode} from 'react'
import {X} from 'lucide-react'
import {tr} from '@/lib/i18n'

/** Render only while open. Keep the heading and actions outside the scrolling body. */
export function MobileSheet({id,title,onClose,children,footer,search}:{id?:string;title:ReactNode;onClose:()=>void;children:ReactNode;footer?:ReactNode;search?:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),headingId=useId()
 useEffect(()=>{const el=dialog.current!,trigger=document.activeElement as HTMLElement|null,overflow=document.body.style.overflow;el.showModal();document.body.style.overflow='hidden';return()=>{el.close();document.body.style.overflow=overflow;if(trigger?.isConnected)trigger.focus({preventScroll:true})}},[])
 return <dialog id={id} ref={dialog} className="ma-sheet ma-sheet-fixed" aria-labelledby={headingId} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientY<r.top||e.clientX<r.left||e.clientX>r.right)onClose()}}}>
  <div className="ma-sheet-heading"><h2 id={headingId}>{title}</h2><button autoFocus className="ma-icon" aria-label={tr('关闭')} onClick={onClose}><X size={20}/></button></div>
  {search&&<div className="ma-sheet-search">{search}</div>}
  <div className="ma-sheet-body">{children}</div>{footer&&<div className="ma-sheet-actions">{footer}</div>}
 </dialog>
}
