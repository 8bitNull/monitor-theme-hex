import assert from 'node:assert/strict'
import type {Node} from './api.ts'
import {mapTrafficSnapshot,aggregateMapTraffic,trafficPower} from './mapTraffic.ts'

const current={id:1,name:'Tokyo',country:'JP',online:true,last_seen:Date.now()/1000,metrics:{cpu:20,net_tx:1_000_000,net_rx:2_000_000}} as Node
const snapshots=mapTrafficSnapshot([
 current,
 {...current,id:2,country:' jp ',metrics:{...current.metrics!,net_tx:3_000_000,net_rx:4_000_000}},
 {...current,id:3,online:false},
 {...current,id:4,last_seen:Date.now()/1000-120},
 {...current,id:5,metrics:null},
 {...current,id:6,country:'US',metrics:{...current.metrics!,net_tx:0,net_rx:0}},
])
assert.equal(snapshots[3].tx,null)
assert.equal(snapshots[4].rx,null)
const grouped=aggregateMapTraffic(snapshots)
assert.deepEqual(grouped.get('JP'),{tx:4_000_000,rx:6_000_000,samples:2})
assert.deepEqual(grouped.get('US'),{tx:0,rx:0,samples:1})
assert.deepEqual(aggregateMapTraffic([{...snapshots[0],tx:Infinity,rx:-1}]).get('JP'),{tx:0,rx:0,samples:0})
assert.equal(trafficPower(0),0)
assert.equal(trafficPower(-100),0)
assert.equal(trafficPower(Infinity),0)
assert(trafficPower(100_000)<trafficPower(10_000_000))
assert.equal(trafficPower(1e15),1)
console.log('Country traffic excludes stale and offline reports, distinguishes missing from zero, and bounds effect strength')
