/** Frame the fleet in pixels; prefer a substantial world with polar margins cropped.
 * Shrink only when necessary to keep every geographic anchor clear of the legend. */
export function fitOverview(points:{point:number[]}[],width:number,height:number){
 const padding=28,bottom=52
 const xs=points.map(p=>p.point[0]),ys=points.map(p=>p.point[1])
 const left=points.length?Math.min(...xs):0,right=points.length?Math.max(...xs):1000
 const top=points.length?Math.min(...ys):0,low=points.length?Math.max(...ys):480
 const k=Math.min(width/1000*.9,Math.max(1,width-padding*2)/Math.max(1,right-left),Math.max(1,height-padding-bottom)/Math.max(1,low-top))
 return {k,x:width/2-(left+right)/2*k,y:(padding+height-bottom)/2-(top+low)/2*k}
}
