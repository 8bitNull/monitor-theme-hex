import assert from 'node:assert/strict'
import {summarizeMapRegions,nextAbnormalRegion} from './mapLayers.ts'
import {mapProbeQuality,type MapProbeQuality} from './mapProbeQuality.ts'
import type {MapTrafficNode} from './mapTraffic.ts'
const now=1800000000000
const q=(latency:number|null,loss=0,stale=false)=>mapProbeQuality({updatedAt:now,data:{ping:[{task_id:1,ts:now/1000-(stale?150:0),latency,loss}],probes:{1:'Current'},loss:{1:42}}},'1',150,300,now)
const nodes:MapTrafficNode[]=[{id:1,name:'HK-a',country:'HK',online:true,tx:0,rx:0},{id:2,name:'HK-b',country:'HK',online:true},{id:3,name:'JP',country:'JP',online:true,tx:10,rx:20},{id:4,name:'MO',country:'MO',online:true},{id:5,name:'DE',country:'DE',online:false,tx:99,rx:99},{id:6,name:'US',country:'US',online:true},{id:7,name:'FR',country:'FR',online:true},{id:8,name:'GB',country:'GB',online:true}]
const quality=new Map<number,MapProbeQuality>([[1,q(20)],[2,q(null)],[3,q(350)],[4,q(200)],[5,q(400)],[6,q(30,0,true)],[7,q(30,4)],[8,q(400)]])
const result=summarizeMapRegions(nodes,quality),get=(code:string)=>result.find(r=>r.code===code)!
assert.deepEqual([get('HK').total,get('HK').online,get('HK').abnormal,get('HK').probeKnown,get('HK').probeState,get('HK').tx,get('HK').rx,get('HK').trafficSamples],[2,2,1,2,'timeout',0,0,1])
assert.deepEqual([get('DE').abnormal,get('DE').probeKnown,get('DE').probeState,get('DE').tx],[0,0,'unknown',null])
assert.deepEqual([get('US').probeKnown,get('US').probeState,get('US').rx],[0,'unknown',null])
assert.equal(Object.hasOwn(get('HK'),'countryPing'),false)
const anchors={HK:[184,263],JP:[300,240],MO:[185,265],FR:[400,200]}
assert.equal(nextAbnormalRegion(result,'all',anchors),'HK')
assert.equal(nextAbnormalRegion(result,'HK',anchors),'JP')
assert.equal(nextAbnormalRegion(result,'JP',anchors),'FR')
assert.equal(nextAbnormalRegion(result,'FR',anchors),'MO')
assert.equal(nextAbnormalRegion(result,'MO',anchors),'HK')
assert.equal(nextAbnormalRegion(result,'GB',anchors),'HK')
assert.equal(nextAbnormalRegion(result,'all',{HK:[NaN,2],JP:[],FR:null}),null)
assert.equal(nextAbnormalRegion(summarizeMapRegions([nodes[0]],quality),'all',anchors),null)
for(const [want,ids] of [['timeout',[2,3,7,4,1]],['high',[3,7,4,1]],['loss',[7,4,1]],['slow',[4,1]],['healthy',[1]]] as const){assert.equal(summarizeMapRegions(nodes.filter(n=>ids.includes(n.id as never)).map(n=>({...n,country:'HK'})),quality)[0].probeState,want)}
const ties=summarizeMapRegions([{...nodes[2],country:'FR'},{...nodes[7],country:'DE'},{...nodes[7],id:9,country:'DE'}],new Map([...quality,[9,q(350)]]))
assert.equal(nextAbnormalRegion(ties,'all',{FR:[1,2],DE:[3,4]}),'DE')
console.log('map layers: real summaries, current quality, missing/zero traffic and deterministic mapped abnormal cycles passed')
