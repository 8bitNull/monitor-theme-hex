import {useLayoutEffect,useRef,useState} from 'react'
import {tr} from '@/lib/i18n'
import {RemarkTags} from './RemarkTags'

/** Header remarks share parsing and disclosure, with separate phone styling. */
export function DetailRemarks({text,mobile=false}:{text:string;mobile?:boolean}){
 const tags=text.split(/[;；,，、\r\n]+/).map(value=>value.trim()).filter(Boolean)
 const content=useRef<HTMLDivElement>(null)
 const [expanded,setExpanded]=useState(false),[overflow,setOverflow]=useState(false)
 useLayoutEffect(()=>{
  const el=content.current
  if(!el)return
  const measure=()=>setOverflow(el.scrollHeight>parseFloat(getComputedStyle(el).getPropertyValue('--remarks-collapsed-height'))+1)
  measure();const observer=new ResizeObserver(measure);observer.observe(el)
  return()=>observer.disconnect()
 },[text])
 if(!tags.length)return null
 return <div className={`detail-header-remarks overview-remarks${mobile?' ma-remarks':''}`} aria-label={tr('备注')}>
  <span className="detail-remarks-label">{tr('备注')}</span>
  <div ref={content} className="detail-remarks-content ma-remarks-content" data-expanded={expanded}><RemarkTags texts={tags}/></div>
  {overflow&&<button type="button" className="detail-remarks-toggle" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{tr(expanded?'收起备注':'展开备注')}</button>}
 </div>
}
