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

/** Homepage frame in pixels. Keep the public zoom control relative to this frame. */
export function fitHomeMap(points:{point:number[]}[],width:number,height:number,zoom=1.3){
 const left=28,right=Math.max(left+1,width-28),top=112,bottom=Math.max(top+1,height-56)
 const xs=points.map(p=>p.point[0]),ys=points.map(p=>p.point[1])
 const minX=points.length?Math.min(...xs):28,maxX=points.length?Math.max(...xs):972
 const minY=points.length?Math.min(...ys):28,maxY=points.length?Math.max(...ys):332
 const scale=Math.max(.001,Math.min(width*.86/944,(right-left)/Math.max(1,maxX-minX),(bottom-top)/Math.max(1,maxY-minY)))
 const desiredX=width/2-500*scale
 const x=Math.max(left-minX*scale,Math.min(desiredX,right-maxX*scale))
 const y=(top+bottom)/2-(minY+maxY)/2*scale
 // Invert the default zoom about the viewport centre; reset uses the same frame.
 return {k:scale/zoom,x:(x-width/2*(1-zoom))/zoom,y:(y-height/2*(1-zoom))/zoom}
}
