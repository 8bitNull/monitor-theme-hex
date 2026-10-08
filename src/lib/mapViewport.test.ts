import assert from 'node:assert/strict'
import {fitOverview} from './mapViewport.ts'

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
