export function mobileMapLabel(name:string,suffix:string,selected:boolean,maxWidth=190):{text:string;width:number}{
 const widthOf=(text:string)=>22+Array.from(text).reduce((sum,c)=>sum+(c.codePointAt(0)!>255?12:7),0)
 const budget=selected?maxWidth:Math.min(150,maxWidth)
 const tail=selected?` · ${suffix}`:''
 const chars=Array.from(name)
 let text=chars.join('')+tail
 while(chars.length>1&&widthOf(text)>budget){chars.pop();text=chars.join('')+'…'+tail}
 return {text,width:widthOf(text)}
}
