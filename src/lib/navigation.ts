export type HomePage='nodes'|'overview'|'settings'

export function homePage(url:URL=new URL(location.href)):HomePage{
 const value=url.searchParams.get('page')
 return value==='overview'||value==='settings'?value:'nodes'
}

export function homePath(page:HomePage){return `/?page=${page}`}

type ReturnContext={page:HomePage;scrollY:number}
const returnKey='hex-return-context'

export function saveReturnContext(context:ReturnContext){
 try{sessionStorage.setItem(returnKey,JSON.stringify(context))}catch{/* History still owns the page. */}
 return {hexReturnPage:context.page,hexReturnScroll:context.scrollY}
}

export function readReturnContext(state:unknown):ReturnContext|null{
 if(!state||typeof state!=='object')return null
 const value=state as {hexReturnPage?:unknown;hexReturnScroll?:unknown}
 if(['nodes','overview','settings'].includes(String(value.hexReturnPage)))return {page:value.hexReturnPage as HomePage,scrollY:Number.isFinite(value.hexReturnScroll)?Number(value.hexReturnScroll):0}
 return null
}
