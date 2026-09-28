import {Children,isValidElement,useState,useCallback,type ComponentProps,type ReactNode} from 'react'
import {Select as Primitive} from 'radix-ui'
import {Check,ChevronDown,ChevronUp,Search} from 'lucide-react'
import {MobileSheet} from './mobile-sheet'
import {tr} from '@/lib/i18n'
type Props=Omit<ComponentProps<'button'>,'value'|'onChange'|'children'|'defaultValue'> & {sheet?:boolean;value?:string|number;onChange?:(event:{target:{value:string}})=>void;children:ReactNode;displayValue?:ReactNode}
type Option={value:string;label:ReactNode;disabled:boolean}
function optionsOf(children:ReactNode):Option[]{return Children.toArray(children).flatMap(child=>{if(!isValidElement<{value?:string|number;children?:ReactNode;disabled?:boolean}>(child))return [];return child.type==='option'?[{value:String(child.props.value??''),label:child.props.children,disabled:!!child.props.disabled}]:optionsOf(child.props.children)})}
const empty='__select_placeholder__'
function SheetSelect({value='',onChange,children,displayValue,className,...props}:Omit<Props,'sheet'>){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('')
 const options=optionsOf(children),current=String(value),selected=options.find(o=>o.value===current)
 const text=(value:ReactNode):string=>typeof value==='string'||typeof value==='number'?String(value):Array.isArray(value)?value.map(text).join(' '):isValidElement<{children?:ReactNode}>(value)?text(value.props.children):''
 const shown=options.filter(o=>text(o.label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
 return <><button {...props} className={className} data-slot="select" data-value={current} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setQuery('');setOpen(true)}}><span className="select-value">{displayValue??selected?.label??current}</span><ChevronDown size={16}/></button>{open&&<MobileSheet title={props['aria-label']??tr('查看线路')} onClose={()=>setOpen(false)} search={<label className="ma-route-search"><Search size={17}/><input type="search" aria-label={tr('搜索线路')} placeholder={tr('搜索线路')} value={query} onChange={e=>setQuery(e.target.value)}/></label>}>{shown.map(o=><button className="ma-row" key={o.value} disabled={o.disabled} aria-pressed={current===o.value} onClick={()=>{onChange?.({target:{value:o.value}});setOpen(false)}}><span>{o.label}</span>{current===o.value&&<Check size={17}/>}</button>)}{shown.length===0&&<p className="ma-empty">{tr('无该线路记录')}</p>}<p className="ma-footnote">{tr('节点独立选择优先于全局线路；其余线路可在详情查看。')}</p></MobileSheet>}</>
}
export function Select({sheet=false,value='',onChange,children,displayValue,className,...props}:Props){
 const [container,setContainer]=useState<Element|null>(null)
 const anchor=useCallback((el:HTMLButtonElement|null)=>{if(el)setContainer(el.closest('dialog, :fullscreen')??el.closest('.next-theme'))},[])
 const [pointerFocus,setPointerFocus]=useState(false)
 const options=optionsOf(children),current=String(value),selected=options.find(o=>o.value===current)
 if(sheet)return <SheetSelect {...props} value={value} onChange={onChange} displayValue={displayValue} className={className}>{children}</SheetSelect>
 // Escape clipped/glass cards while retaining the owning native dialog and theme variables.
 return <Primitive.Root value={current||empty} onValueChange={v=>onChange?.({target:{value:v===empty?'':v}})} disabled={props.disabled}>
  <Primitive.Trigger {...props} ref={anchor} className={className} data-slot="select" data-value={current} data-pointer-focus={pointerFocus} onPointerDown={e=>{setPointerFocus(true);props.onPointerDown?.(e)}} onBlur={e=>{setPointerFocus(false);props.onBlur?.(e)}} onKeyDown={e=>{setPointerFocus(false);props.onKeyDown?.(e)}} type="button"><span className="select-value">{displayValue??selected?.label??current}</span><Primitive.Icon className="select-chevron"><ChevronDown size={14}/></Primitive.Icon></Primitive.Trigger>
  <Primitive.Portal container={container}><Primitive.Content onPointerDownCapture={()=>setPointerFocus(true)} onKeyDownCapture={()=>setPointerFocus(false)} className="select-menu" position="popper" sideOffset={5} collisionPadding={12} align="start"><Primitive.ScrollUpButton className="select-scroll"><ChevronUp size={14}/></Primitive.ScrollUpButton><Primitive.Viewport className="select-options">{options.filter(o=>o.value!=='' || !o.disabled).map(o=><Primitive.Item className="select-option" key={o.value} value={o.value||empty} disabled={o.disabled} data-value={o.value}><Primitive.ItemText>{o.label}</Primitive.ItemText><Primitive.ItemIndicator className="select-check"><Check size={14}/></Primitive.ItemIndicator></Primitive.Item>)}</Primitive.Viewport><Primitive.ScrollDownButton className="select-scroll"><ChevronDown size={14}/></Primitive.ScrollDownButton></Primitive.Content></Primitive.Portal>
 </Primitive.Root>
}
