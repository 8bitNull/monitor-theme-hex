import {tr} from '@/lib/i18n'

/** Explicit phrase separators form tags; spaces inside a phrase stay intact. */
export function MobileRemarks({text}:{text:string}){
 const lines=text.split(/[;；,，、\r\n]+/).map(line=>line.trim()).filter(Boolean)
 if(!lines.length)return null
 return <div className="ma-remarks"><h2>{tr('备注')}</h2><div className="ma-remarks-content">{lines.map((line,index)=><span className="ma-remark-tag" key={index}>{line}</span>)}</div></div>
}
