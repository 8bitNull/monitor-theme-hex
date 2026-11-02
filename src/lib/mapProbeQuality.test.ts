import assert from 'node:assert/strict'
import {mapProbeQuality} from './mapProbeQuality.ts'
import type {PingSnapshot} from './ping.ts'

const now=1800000000000
const sample=(latency:number|null,loss?:number,ts=now/1000):PingSnapshot=>({updatedAt:now,failed:false,data:{ping:[{task_id:1,ts,latency,loss}],probes:{'1':'Gateway'},loss:{'1':100}}})
const quality=(snapshot?:PingSnapshot,probe='auto')=>mapProbeQuality(snapshot,probe,150,300,now)
assert.equal(quality(sample(0)).state,'healthy')
assert.equal(quality(sample(149)).state,'healthy')
assert.equal(quality(sample(150)).state,'slow')
assert.equal(quality(sample(300)).state,'high')
assert.equal(quality(sample(null)).state,'timeout')
assert.equal(quality(sample(30,4)).state,'loss')
assert.equal(quality(sample(30,0)).state,'healthy')
assert.equal(quality(sample(30,NaN)).state,'healthy')
assert.equal(quality(sample(30,101)).sampleLoss,null)
assert.equal(quality(sample(30)).historyLoss,100) // Historical loss is never a current fault.
assert.equal(quality(sample(30,0,now/1000-120)).state,'unknown')
assert.equal(quality({...sample(30),updatedAt:now-120000}).state,'unknown')
assert.equal(quality({...sample(30),failed:true}).state,'unknown')
assert.equal(quality(undefined).state,'unknown')
assert.equal(quality({updatedAt:now,data:{ping:[]}}).state,'unknown')
assert.equal(quality(sample(30),'2').state,'unknown')
assert.equal(quality(sample(30),'1').name,'Gateway')
assert.equal(mapProbeQuality(sample(100),'auto',80,160,now).state,'slow')
const routes:PingSnapshot={updatedAt:now,data:{ping:[
 {task_id:1,ts:now/1000-600,latency:20},
 {task_id:2,ts:now/1000-30,latency:null},
 {task_id:3,ts:now/1000,latency:30},
],probes:{1:'Retired route',2:'Current timeout',3:'Current success'}}}
assert.equal(quality(routes).name,'Current timeout')
assert.equal(quality(routes).state,'timeout')
assert.equal(quality(routes,'1').name,'Retired route')
assert.equal(quality(routes,'1').state,'unknown')
assert.equal(quality(routes,'4').name,undefined)
const oldRoutes:PingSnapshot={updatedAt:now,data:{ping:[
 {task_id:1,ts:now/1000-600,latency:20},
 {task_id:2,ts:now/1000-300,latency:30},
]}}
assert.equal(quality(oldRoutes).name,'探测 2')
assert.equal(quality(oldRoutes).state,'unknown')
assert.equal(quality({...routes,data:{ping:[{task_id:1,ts:now/1000+600,latency:20},{task_id:2,ts:now/1000,latency:40}]}}).latency,40)
console.log('map probe quality: freshness, thresholds, missing routes, automatic route fallback and current/history loss passed')
