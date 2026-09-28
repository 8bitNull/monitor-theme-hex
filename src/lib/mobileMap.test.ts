import assert from 'node:assert/strict'
import {homePage,readReturnContext} from './navigation.ts'
assert.equal(homePage(new URL('https://example.test/?page=map')),'map')
assert.deepEqual(readReturnContext({hexReturnPage:'map',hexReturnScroll:90}),{page:'map',scrollY:90})
console.log('Mobile map navigation passed')
import {validMapState,fitMobileMap,zoomMobileMap} from './mobileMap.ts'
assert.deepEqual(validMapState({region:'bad',camera:{x:0,y:0,k:99}}),{region:'all',camera:null})
assert.equal(validMapState({camera:{x:Infinity,y:0,k:1}}).camera,null)
assert.equal(validMapState({region:'unknown',camera:{x:500,y:240,k:2}}).region,'unknown')
const c={x:500,y:240,k:1}
const z=zoomMobileMap(c,2,50,20,400)
assert.equal(c.x+50/.4,z.x+50/.8)
assert.equal(c.y+20/.4,z.y+20/.8)
assert.equal(fitMobileMap([[100,100]],390,250).k,8)
assert.equal(zoomMobileMap(c,100,0,0,400).k,8)
console.log('Mobile camera validation, framing and anchored zoom passed')

const framing=await import('./mobileMap.ts')
assert.equal(typeof framing.immersiveMobileMap,'function','immersive camera must be available')
const cluster=[[841,156],[796,203],[776,267],[524,115],[259,151]]
const close=framing.immersiveMobileMap(cluster,390,600)
assert.ok(close.k>2&&close.k<=8)
assert.ok(close.x>750&&close.x<850,'default camera prefers the densest geographic group')
assert.deepEqual(framing.immersiveMobileMap([...cluster].reverse(),390,600),close,'API ordering must not change initial framing')
for(const [w,h] of [[320,450],[667,120],[0,0]]){
 const empty=framing.immersiveMobileMap([],w,h)
 assert.ok([empty.x,empty.y,empty.k].every(Number.isFinite))
}
const labels=framing.placeMobileMapLabels([{code:'HK',x:200,y:180,width:50},{code:'MO',x:202,y:181,width:50},{code:'JP',x:310,y:110,width:60}],320,70,300)
for(const l of labels){assert.ok(l.x>=12&&l.x+l.width<=308);assert.ok(l.y>=70&&l.y+28<=300)}
for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
 const a=labels[i],b=labels[j];assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+28<=b.y||b.y+28<=a.y)
}
assert.ok(labels.length>0)
console.log('Immersive framing and geographic label bounds/collisions passed')
