import assert from 'node:assert/strict'
import {projectMap,fitMapWorld,latencySpeed,resolveMapConnections,placeMapLabels,placeMapBadges,placeMapTooltip,connectionPath,type WorldMapNode} from './worldMapModel.ts'

assert.deepEqual(projectMap(0,0),[500,210])
assert(projectMap(-180,0)![0]<projectMap(180,0)![0])
assert(projectMap(0,80)![1]<projectMap(0,-50)![1])
assert.equal(projectMap(181,0),null)
assert.equal(projectMap(0,91),null)
assert.equal(projectMap(NaN,0),null)
const fitted=fitMapWorld(690,215)
assert(fitted.x>=10&&fitted.y>=10)
assert(fitted.x+1000*fitted.k<=680)
assert(fitted.y+360*fitted.k<=205)
assert(latencySpeed(10)>latencySpeed(250))
assert(latencySpeed(0)>0)
assert.equal(latencySpeed(null),0)
assert.equal(latencySpeed(-1),0)
assert.equal(latencySpeed(Infinity),0)
const nodes:WorldMapNode[]=[
 {id:'tokyo',name:'Tokyo',longitude:139.69,latitude:35.68,online:true,ping:10,loss:0},
 {id:'sf',name:'San Jose',longitude:-121.89,latitude:37.34,online:true,ping:150,loss:null},
 {id:'offline',name:'Offline',longitude:0,latitude:0,online:false},
 {id:'bad',name:'Invalid',longitude:NaN,latitude:0,online:true},
]
assert.deepEqual(resolveMapConnections(nodes,[]),[])
const connections=resolveMapConnections(nodes,[
 {id:'pacific',from:'tokyo',to:'sf',ping:150},
 {id:'missing',from:'tokyo',to:'none',ping:10},
 {id:'offline',from:'tokyo',to:'offline',ping:10},
 {id:'invalid',from:'tokyo',to:'bad',ping:10},
 {id:'self',from:'tokyo',to:'tokyo',ping:10},
])
assert.equal(connections.length,1)
assert.equal(connections[0].id,'pacific')
// The Pacific path must not cross the entire Eurasian continent.
assert(Math.abs(connections[0].end[0]-connections[0].start[0])<300)
const pacificPath=connectionPath(connections[0])
assert.equal(pacificPath.match(/M/g)?.length,2)
const pole=projectMap(0,-90)!
const poleFit=fitMapWorld(1000,360,22,{top:0,bottom:pole[1]+18})
assert(pole[1]*poleFit.k+poleFit.y<=338)
assert.equal(resolveMapConnections(nodes,[{id:'unknown',from:'tokyo',to:'sf',ping:null}])[0].speed,0)
const labels=placeMapLabels([{id:'gb',x:300,y:100,name:'London'},{id:'de',x:323,y:103,name:'Frankfurt'}],600,200)
assert.equal(labels.get('gb'),24)
assert.equal(labels.get('de'),-17)
// Dense region badges must stay independently clickable without moving geographic anchors.
const anchors=[{id:'hk',x:400,y:120,label:'香港',total:2},{id:'mo',x:399,y:121,label:'澳门',total:1},{id:'jp',x:438,y:101,label:'日本',total:2}]
const badges=placeMapBadges(anchors,600,215)
for(const anchor of anchors){
 const badge=badges.get(anchor.id)!
 assert(badge,`${anchor.id} must have a readable badge`)
 assert(badge.x-badge.width/2>=8&&badge.x+badge.width/2<=592)
 assert(badge.y>=18&&badge.y<=197)
}
for(const [i,a] of [...badges.values()].entries())for(const b of [...badges.values()].slice(i+1)){
 if(a&&b)assert(Math.abs(a.x-b.x)>=(a.width+b.width)/2+4||Math.abs(a.y-b.y)>=24,'badges must not overlap')
}
assert.deepEqual(anchors,[{id:'hk',x:400,y:120,label:'香港',total:2},{id:'mo',x:399,y:121,label:'澳门',total:1},{id:'jp',x:438,y:101,label:'日本',total:2}])
const edge=placeMapBadges([{id:'edge',x:5,y:5,label:'长地区名称',total:123}],300,180).get('edge')!
assert(edge&&edge.x-edge.width/2>=8&&edge.y>=18,'badges near edges must remain visible')
assert.equal(placeMapBadges([{id:'offscreen',x:-80,y:80,label:'美国',total:8}],600,215).get('offscreen'),null,'offscreen countries must not gain misleading edge labels')
console.log('Flat projection, whole-world framing, latency speeds and explicit valid short connections verified')

// Overlay controls must not conceal labels, including after panning near a corner.
const obstruction={x:20,y:20,width:140,height:32}
const safeBadge=placeMapBadges([{id:'corner',x:90,y:68,label:'日本',total:2}],320,220,[obstruction]).get('corner')!
assert(safeBadge,'a nearby unobstructed label position should be used')
assert(safeBadge.y-10>=58||safeBadge.x-safeBadge.width/2>=166||safeBadge.x+safeBadge.width/2<=14,'badge must clear the floating title')
assert.equal(placeMapBadges([{id:'covered',x:40,y:40,label:'香港',total:1}],100,100,[{x:0,y:0,width:100,height:100}]).get('covered'),null)

// DOMRect dimensions are inherited accessors in browsers, not enumerable fields.
const tipSize=Object.create({width:160,height:130}) as {width:number;height:number}
const safeTip=placeMapTooltip({x:285,y:75},tipSize,{width:500,height:320},[{x:230,y:16,width:250,height:36},{x:200,y:270,width:280,height:34}])
assert(safeTip.x>=8&&safeTip.x+160<=492&&safeTip.y>=8&&safeTip.y+130<=312,'tooltip must remain inside the canvas')
assert(safeTip.y>=58&&safeTip.y+130<=264,'tooltip must avoid both floating toolbars')
