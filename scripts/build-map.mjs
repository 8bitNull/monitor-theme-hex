import {readFileSync,writeFileSync} from 'node:fs'
import {geoNaturalEarth1,geoPath,geoCentroid,geoGraticule10} from 'd3-geo'
import {feature} from 'topojson-client'
import {gzipSync} from 'node:zlib'
import {featureCode,regionCodes} from './map-regions.mjs'
// Project once at build time. A 0.25px tolerance is at most 1.5px at maximum zoom.
const world=JSON.parse(readFileSync(new URL('../src/data/world.json',import.meta.url)))
const countries=feature(world,world.objects.countries).features.filter(f=>f.properties?.name!=='Antarctica')
const projection=geoNaturalEarth1().fitExtent([[28,28],[972,452]],{type:'FeatureCollection',features:countries})
const path=geoPath(projection).digits(1)
function simplify(points,tolerance=.25){
 if(points.length<5)return points
 const list=[...points,points[0]],keep=new Set([0,list.length-1]),stack=[[0,list.length-1]]
 while(stack.length){const [start,end]=stack.pop(),a=list[start],b=list[end],dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy;let max=tolerance*tolerance,index=-1
 for(let i=start+1;i<end;i++){const p=list[i],t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0,d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>max){max=d;index=i}}
 if(index!==-1){keep.add(index);stack.push([start,index],[index,end])}}
 const result=[...keep].sort((a,b)=>a-b).slice(0,-1).map(i=>list[i]);return result.length>=3?result:points
}
function compact(d){return d.replace(/M([^Z]+)Z/g,(_,ring)=>{const numbers=ring.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number),points=[];for(let i=0;i<numbers.length;i+=2)points.push([numbers[i],numbers[i+1]]);return 'M'+simplify(points).map(p=>p.join(',')).join('L')+'Z'})}
const shapes=countries.map(f=>({code:featureCode(f),name:f.properties.name,d:compact(path(f)||'')}))
const points={};for(const f of countries){const code=featureCode(f);if(code&&!points[code]){const p=projection(geoCentroid(f));points[code]=p.map(n=>+n.toFixed(2))}}
// Representative region locations, including territories without separate polygons.
// These locate country groups, not individual servers.
for(const [code,ll] of Object.entries({
 US:[-98,39],RU:[95,60],FR:[2.2,46.6],HK:[114.17,22.32],MO:[113.55,22.2],SG:[103.82,1.35],
 BQ:[-68.26,12.18],BV:[3.35,-54.42],CC:[96.87,-12.16],CX:[105.63,-10.45],
 GF:[-53.13,3.93],GI:[-5.35,36.14],GP:[-61.55,16.25],MQ:[-61.02,14.64],
 RE:[55.54,-21.12],SJ:[18,78],TK:[-171.85,-9.2],TV:[179.2,-8.52],UM:[-177.37,28.21],YT:[45.17,-12.83]
}))points[code]=projection(ll).map(n=>+n.toFixed(2))
// Antarctica is intentionally outside this map. Every other ISO region must render.
for(const code of Object.values(regionCodes).filter(code=>code!=='AQ')){
 if(!points[code]||points[code].length!==2||!points[code].every(Number.isFinite))throw new Error(`Missing map location: ${code}`)
}
const json=JSON.stringify({shapes,points,graticule:path(geoGraticule10())});writeFileSync(new URL('../src/data/map-paths.json',import.meta.url),json+'\n');console.log(`Map: ${shapes.length} shapes, ${Buffer.byteLength(json)} bytes, gzip ${gzipSync(json).length} bytes`)
