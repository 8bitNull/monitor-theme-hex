import assert from 'node:assert/strict'
import {fitOverview,fitHomeMap} from './mapViewport.ts'

const points=[{point:[259,151]},{point:[537,123]},{point:[505,148]},{point:[802,219]},{point:[874,163]}]
const view=fitOverview(points,680,215)
// A geographically sparse fleet must still show a substantial world, not extreme zoom.
assert(Math.abs(view.k-.612)<1e-9)
for(const {point:[x,y]} of points){
 assert(x*view.k+view.x>=28 && x*view.k+view.x<=652)
 assert(y*view.k+view.y>=28 && y*view.k+view.y<=163)
}
for(const width of [280,680]){
 const spread=[{point:[5,30]},{point:[995,470]}]
 const v=fitOverview(spread,width,215)
 for(const {point:[x,y]} of spread){assert(x*v.k+v.x>=28-1e-8&&x*v.k+v.x<=width-28+1e-8);assert(y*v.k+v.y>=28-1e-8&&y*v.k+v.y<=163+1e-8)}
}
assert(Number.isFinite(fitOverview([],680,215).x))
assert(Number.isFinite(fitOverview([{point:[500,200]}],680,215).k))
console.log('Map overview fills the viewport and keeps sparse, global and single-region fleets within safe bounds')

// The homepage default zoom must keep geographic targets clear of its tools/legend.
for(const [width,height] of [[699,300],[320,300],[1000,420]]){
 for(const fleet of [points,[],[{point:[500,200]}],[{point:[5,30]},{point:[995,470]}]]){
  const frame=fitHomeMap(fleet,width,height)
  const k=frame.k*1.3,x=frame.x*1.3+width/2*(1-1.3),y=frame.y*1.3+height/2*(1-1.3)
  assert([k,x,y].every(Number.isFinite))
  for(const {point:[px,py]} of fleet){
   assert(px*k+x>=28-1e-8&&px*k+x<=width-28+1e-8)
   assert(py*k+y>=112-1e-8&&py*k+y<=height-56+1e-8)
  }
 }
}
const home=fitHomeMap([],699,420)
assert(Math.abs(home.k*1.3*944/699-.86)<1e-9)
console.log('Homepage framing fills the world and preserves control clearance across fleet extents')
