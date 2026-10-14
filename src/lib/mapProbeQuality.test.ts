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
console.log('map probe quality: freshness, thresholds, missing routes and current/history loss passed')
