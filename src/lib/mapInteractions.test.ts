import {readFileSync,existsSync} from 'node:fs'
import assert from 'node:assert/strict'
import {clusterMapRegions,matchesMapStatus} from './mapInteractions.ts'
import {mapProbeQuality} from './mapProbeQuality.ts'
import type {PingSnapshot} from './ping.ts'
const anchors=[{code:'HK',x:184,y:263},{code:'MO',x:182,y:263},{code:'JP',x:246,y:227}]
const groups=clusterMapRegions(anchors,48)
assert.equal(groups.length,2)
const dense=groups.find(g=>g.members.length===2)!
assert.deepEqual(dense.members,anchors.slice(0,2))
assert.equal(dense.x,183);assert.equal(dense.y,263)
assert.equal(clusterMapRegions([...anchors].reverse(),48).find(g=>g.members.length===2)!.id,dense.id)
assert.equal(clusterMapRegions([{code:'A',x:0,y:0},{code:'B',x:30,y:0},{code:'C',x:60,y:0}],32).length,1)
assert.equal(clusterMapRegions([...anchors,{code:'bad',x:NaN,y:0}],48).length,2)
const online={id:1,name:'HK',country:'HK',online:true,attention:false,tx:null,rx:null}
assert.equal(matchesMapStatus(online,'probe',{state:'healthy',latency:40,sampleLoss:0,historyLoss:42}),false)
for(const state of ['high','timeout','loss','slow'] as const){
 const q={state,latency:state==='timeout'?null:350,sampleLoss:4,historyLoss:42}
 assert.equal(matchesMapStatus(online,'probe',q),true)
 assert.equal(matchesMapStatus({...online,online:false},'probe',q),false)
}
assert.equal(matchesMapStatus(online,'probe',undefined),false)
const now=1800000000000
const sample=(ts=now/1000):PingSnapshot=>({updatedAt:now,failed:false,data:{ping:[{task_id:1,ts,latency:350,loss:0}],probes:{'1':'Gateway'},loss:{'1':100}}})
for(const snapshot of [undefined,sample(now/1000-120),{...sample(),updatedAt:now-120000},{...sample(),failed:true}])assert.equal(matchesMapStatus(online,'probe',mapProbeQuality(snapshot,'auto',150,300,now)),false)
assert.equal(matchesMapStatus(online,'online',undefined),true)
assert.equal(matchesMapStatus(online,'offline',undefined),false)
assert.equal(matchesMapStatus(online,'attention',undefined),false)
assert.equal(matchesMapStatus({...online,attention:true},'attention',undefined),true)
assert.equal(matchesMapStatus({...online,online:false},'attention',undefined),true)
assert.equal(matchesMapStatus({...online,online:false},'all',undefined),true)
const map=JSON.parse(readFileSync(new URL('../data/map-flat.json',import.meta.url),'utf8'))
const pointsFile=new URL('../data/map-flat-points.json',import.meta.url)
const points=existsSync(pointsFile)?JSON.parse(readFileSync(pointsFile,'utf8')):{}
assert.deepEqual(points,map.points,'eager location eligibility uses the same generated anchors as the lazy canvas')
assert.ok(Buffer.byteLength(JSON.stringify(points))<10000)
console.log('map interactions: real anchors, connected stable groups and current health filters passed')
