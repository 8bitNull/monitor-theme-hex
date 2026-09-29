import assert from 'node:assert/strict'
import {resourceTrend} from './resourceTrend.ts'
const row=(ts:number,cpu:number|null,mem_used:number|null=cpu)=>({ts,cpu,mem_used})
// Zeroes draw a real flat line. Empty, invalid and singleton series do not invent one.
assert.equal(resourceTrend([],'cpu').path,'')
assert.equal(resourceTrend([row(1000,0)],'cpu').path,'')
assert.equal(resourceTrend([row(1000,0),row(2000,0)],'cpu').path,'M0.00,38.00 L300.00,38.00')
assert.equal(resourceTrend([row(1000,NaN),row(2000,-1)],'cpu').path,'')
const missing=resourceTrend([row(1000,10),row(2000,20),row(3000,null),row(4000,30),row(5000,40)],'cpu')
assert.equal((missing.path.match(/M/g)||[]).length,2)
assert.equal((resourceTrend([row(1000,10),row(2000,20),row(8000000,30),row(8001000,40)],'cpu').path.match(/M/g)||[]).length,2)
assert.equal(resourceTrend([row(2000,100),row(1000,0),row(2000,50)],'cpu').path,'M0.00,38.00 L300.00,21.00')
const memory=resourceTrend([row(1000,0,1024),row(2000,0,2048)],'mem_used')
assert.equal(memory.top,2048)
assert.equal(memory.path,'M0.00,21.00 L300.00,4.00')
assert.equal(resourceTrend([row(1000,NaN,100),row(2000,NaN,200)],'mem_used').path.includes('L'),true)
const diskRows=[
 {ts:1000,cpu:0,mem_used:0,disk_used:1024},
 {ts:2000,cpu:0,mem_used:0,disk_used:2048},
 {ts:3000,cpu:0,mem_used:0,disk_used:null},
 {ts:4000,cpu:0,mem_used:0,disk_used:4096},
 {ts:5000,cpu:0,mem_used:0,disk_used:8192},
]
const disk=resourceTrend(diskRows,'disk_used')
assert.equal(disk.top,8192)
assert.equal((disk.path.match(/M/g)||[]).length,2)
assert.equal(resourceTrend([{ts:1000,cpu:0,mem_used:0}], 'disk_used').path,'')
assert.equal(resourceTrend(diskRows.map(r=>({...r,disk_used:0})),'disk_used').path.includes('L'),true)
console.log('resource previews preserve zeroes, missing samples, time gaps, order and memory units')
