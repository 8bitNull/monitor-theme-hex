import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {placeMapMarkers} from './mapMarkers.ts'
const {points}=JSON.parse(readFileSync(new URL('../data/map-paths.json',import.meta.url),'utf8'))
const codes=['US','JP','HK','MO','SG','DE','FR','GB','NL','BE','CH','AT','IT','ES','PT','PL','CZ','DK','SE','NO','FI','IE','LU','LI','MC','NZ','ZA'].sort()
const width=670,height=238,padding=24
const xs=codes.map(c=>points[c][0]),ys=codes.map(c=>points[c][1])
const scale=Math.min((width-padding*2)/(Math.max(...xs)-Math.min(...xs)),(height-padding*2)/(Math.max(...ys)-Math.min(...ys)))
const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2
const input=codes.map(code=>({code,x:width/2+(points[code][0]-cx)*scale,y:height/2+(points[code][1]-cy)*scale}))
const markers=placeMapMarkers(input)
for(const [i,m] of markers.entries()){
 assert(m.x>=14&&m.x<=width-14&&m.y>=14&&m.y<=height-14,`${m.code} must fit`)
 assert.equal(m.anchorX,input[i].x);assert.equal(m.anchorY,input[i].y)
 assert(Math.hypot(m.x-m.anchorX,m.y-m.anchorY)===0,`${m.code} must remain at its geographic anchor`)
}
const isolated=[{x:100,y:80},{x:300,y:140},{x:-20,y:100}]
assert.deepEqual(placeMapMarkers(isolated).map(({x,y})=>({x,y})),isolated)
console.log('Dense region targets, geographic anchors and offscreen positions passed')

const crowded=placeMapMarkers(Array.from({length:40},()=>({x:200,y:120})))
assert(crowded.some((m,i)=>i>0&&m.x===200&&m.y===120),'Unresolved collisions retain geographic anchors')
