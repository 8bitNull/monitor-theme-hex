import {readFileSync,writeFileSync} from 'node:fs'
import {geoProjection,geoPath,geoCentroid,geoBounds,geoContains} from 'd3-geo'
import {feature,merge} from 'topojson-client'
import {featureCode} from './map-regions.mjs'
const root=new URL('../',import.meta.url)
const world=JSON.parse(readFileSync(new URL('src/data/world.json',root)))
const countries=feature(world,world.objects.countries).features.filter(f=>f.properties?.name!=='Antarctica')
const projection=geoProjection((lambda,phi)=>[lambda,phi*774/944]).scale(944/(2*Math.PI)).translate([500,210]).precision(.4)
const path=geoPath(projection).digits(1)
// Remove subpixel coastal vertices before shipping fallback paths to the browser.
function simplify(points,tolerance=.35){
 if(points.length<5)return points
 const list=[...points,points[0]],keep=new Set([0,list.length-1]),stack=[[0,list.length-1]]
 while(stack.length){
  const [start,end]=stack.pop(),a=list[start],b=list[end],dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy
  let max=tolerance*tolerance,index=-1
  for(let i=start+1;i<end;i++){const p=list[i],t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0,d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>max){max=d;index=i}}
  if(index!==-1){keep.add(index);stack.push([start,index],[index,end])}
 }
 const result=[...keep].sort((a,b)=>a-b).slice(0,-1).map(i=>list[i]);return result.length>=3?result:points
}
function compact(d){return d.replace(/M([^Z]+)Z/g,(_,ring)=>{const numbers=ring.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number),points=[];for(let i=0;i<numbers.length;i+=2)points.push([numbers[i],numbers[i+1]]);return 'M'+simplify(points).map(p=>p.join(',')).join('L')+'Z'})}
const shapes=countries.map(f=>({code:featureCode(f),name:f.properties.name,d:compact(path(f)||'')}))
const locations={}
for(const f of countries){const code=featureCode(f);if(code&&!locations[code])locations[code]=geoCentroid(f)}
Object.assign(locations,{
 US:[-98,39],RU:[95,60],FR:[2.2,46.6],HK:[114.17,22.32],MO:[113.55,22.2],SG:[103.82,1.35],
 BQ:[-68.26,12.18],BV:[3.35,-54.42],CC:[96.87,-12.16],CX:[105.63,-10.45],GF:[-53.13,3.93],
 GI:[-5.35,36.14],GP:[-61.55,16.25],MQ:[-61.02,14.64],RE:[55.54,-21.12],SJ:[18,78],
 TK:[-171.85,-9.2],TV:[179.2,-8.52],UM:[-177.37,28.21],YT:[45.17,-12.83],
})
const points=Object.fromEntries(Object.entries(locations).map(([code,ll])=>[code,projection(ll).map(n=>+n.toFixed(2))]))
const bounded=countries.map(f=>({f,code:featureCode(f),bounds:geoBounds(f)}))
// Flat-top hex lattice. Sample actual polygons at each center, including lakes and islands.
const radius=2.15,hexes=[]
for(let col=0,x=28;x<=972;col++,x+=radius*1.5){
 for(let y=12+(col%2)*Math.sqrt(3)*radius/2;y<=350;y+=Math.sqrt(3)*radius){
  const ll=[(x-500)*360/944,(210-y)*360/774]
  for(const {f,code,bounds:[[west,south],[east,north]]} of bounded){
   if(ll[1]<south||ll[1]>north||(west<=east?(ll[0]<west||ll[0]>east):(ll[0]<west&&ll[0]>east)))continue
   if(geoContains(f,ll)){hexes.push([+x.toFixed(2),+y.toFixed(2),code]);break}
  }
 }
}
const land=merge(world,world.objects.countries.geometries.filter(g=>g.properties.name!=='Antarctica'))
// Straight, faint geographic reference lines: no spherical globe grid.
const graticule=[...[-120,-60,0,60,120].map(lon=>`M${projection([lon,80]).join(',')}L${projection([lon,-55]).join(',')}`),
 ...[-30,0,30,60].map(lat=>`M${projection([-175,lat]).join(',')}L${projection([175,lat]).join(',')}`)].join('')
// Small eager country anchors; the full rendering geometry stays in the lazy map chunk.
writeFileSync(new URL('src/data/map-flat-points.json',root),JSON.stringify(points)+'\n')
writeFileSync(new URL('src/data/map-flat.json',root),JSON.stringify({shapes,points,locations,hexes,radius,land:compact(path(land)),graticule})+'\n')
if(hexes.length<2000)throw new Error('Land sampling unexpectedly sparse')
console.log(`Hex map: ${hexes.length} geographic land instances, ${shapes.length} country outlines`)
