import assert from 'node:assert/strict'
import {summarizeResource} from './resourceSummary.ts'
const rows=[{ts:3000,cpu:null},{ts:1000,cpu:0},{ts:2000,cpu:20},{ts:2000,cpu:40},{ts:NaN,cpu:90}]
assert.deepEqual(summarizeResource(rows,'cpu'),{latest:null,latestAt:3000,mean:20,peak:40,count:2})
assert.deepEqual(summarizeResource([{ts:1000,cpu:NaN},{ts:2000,cpu:-1},{ts:3000,cpu:101}],'cpu'),{latest:null,latestAt:3000,mean:null,peak:null,count:0})
assert.deepEqual(summarizeResource([],'cpu'),{latest:null,latestAt:null,mean:null,peak:null,count:0})
assert.deepEqual(summarizeResource([{ts:1000,mem_used:0},{ts:2000,mem_used:1024}],'mem_used'),{latest:1024,latestAt:2000,mean:512,peak:1024,count:2})
assert.deepEqual(summarizeResource([{ts:1000,net_tx:0,net_rx:400},{ts:2000,net_tx:200,net_rx:800}],'net_tx'),{latest:200,latestAt:2000,mean:100,peak:200,count:2})
console.log('resource sample summaries passed')
