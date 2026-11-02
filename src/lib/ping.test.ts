import assert from 'node:assert/strict'
import { recentPingRows, summarizePing, loadPing, getPing } from './ping.ts'
const data = { ping: [{ task_id: 1, ts: 3, latency: null, loss: 100 }, { task_id: 1, ts: 1, latency: 100 }, { task_id: 1, ts: 2, latency: 120, loss: 50 }, { task_id: 2, ts: 1, latency: 40 }], probes: { '1': 'Tokyo' }, loss: { '1': 4.2 } }
const result = summarizePing(data)
assert.equal(result[0].loss, 4.2) // Not (0 + 50 + 100) / 3.
assert.equal(result[0].latest.latency, null)
assert.equal(result[0].jitter, 20)
assert.equal(result[0].name, 'Tokyo')
assert.equal(result[1].loss, 0)
assert.equal(result[1].jitter, null)
assert.equal(summarizePing({ ping: data.ping })[0].loss, null)
assert.deepEqual(summarizePing({ ping: [] }), [])
assert.throws(() => summarizePing({} as never))
const windowRows=[0,3600,64800,82800,86400].map((ts,i)=>({task_id:1,ts,latency:i}))
assert.equal(recentPingRows(windowRows,1).length,2)
assert.equal(recentPingRows(windowRows,6).length,3)
assert.equal(recentPingRows(windowRows,24).length,5)
let running = 0, maxRunning = 0, calls = 0
globalThis.fetch = (async () => {
  running++; calls++; maxRunning = Math.max(running, maxRunning)
  await new Promise(resolve => setTimeout(resolve, 10))
  running--
  return new Response(JSON.stringify(data))
}) as typeof fetch
await Promise.all(Array.from({ length: 8 }, (_, i) => loadPing(i)))
assert.equal(maxRunning, 2)
await loadPing(1)
assert.equal(calls, 8)
console.log('ping aggregation, timeout, concurrency and cache checks passed')
// Force refresh ignores completed cache but still shares requests already queued/in flight.
let options: RequestInit | undefined
let url = ''
globalThis.fetch = (async (input, init) => {
  calls++; url=String(input); options=init
  await new Promise(resolve=>setTimeout(resolve,10))
  return new Response(JSON.stringify({...data,ping:[{task_id:1,ts:60,latency:321}]}))
}) as typeof fetch
await Promise.all([loadPing(1,true),loadPing(1,true)])
assert.equal(calls,9)
assert.equal(options?.cache,'no-store')
assert.match(url,/points=1440/)
assert.equal(summarizePing(await loadPing(1))[0].latest.latency,321)
assert.equal(calls,9)
console.log('manual refresh, in-flight sharing, minute-resolution request and HTTP cache bypass passed')

// Request cadence is independent of the server's sample timestamps/resolution.
const realNow=Date.now
let clock=realNow(),reads=0,fail=false
Date.now=()=>clock
try {
  globalThis.fetch=(async()=>{
    reads++
    return fail?new Response('',{status:503}):new Response(JSON.stringify(data))
  }) as typeof fetch
  await loadPing(3000)
  const sample=getPing(3000)?.data
  clock+=4999
  await loadPing(3000)
  assert.equal(reads,1,'share a successful result for five seconds')
  clock++
  await loadPing(3000)
  assert.equal(reads,2,'read again when a five-second backend result can arrive')
  assert.deepEqual(getPing(3000)?.data,sample,'a successful read must not rewrite sample timestamps')
  clock+=5000
  fail=true
  await assert.rejects(loadPing(3000))
  assert.equal(reads,3)
  assert.deepEqual(getPing(3000)?.data,sample,'keep the previous data on failure')
  clock+=59999
  await assert.rejects(loadPing(3000))
  assert.equal(reads,3,'other watchers must share the one-minute failure backoff')
  clock++
  await assert.rejects(loadPing(3000))
  assert.equal(reads,4,'retry when the failure backoff expires')
  fail=false
  await loadPing(3000,true)
  assert.equal(reads,5,'manual retry bypasses failure backoff')
  assert.equal(getPing(3000)?.failed,false)
} finally {
  Date.now=realNow
}
console.log('five-second successful reads, shared failure backoff and truthful sample timestamps passed')
