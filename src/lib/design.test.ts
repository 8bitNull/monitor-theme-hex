import assert from 'node:assert/strict'
import fs from 'node:fs'
import {performance} from 'node:perf_hooks'
import {fileURLToPath} from 'node:url'
import {probeCatalog,summarizePing,windowLoss,subscribeNodePing,loadPing,getPing} from './ping.ts'

const tokensCss = fs.readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf-8')

// Required tokens
for (const token of ['--cyber-glow', '--cyber-border-gradient', '--glass-bg', '--glass-blur', '--mesh-gradient', '--font-mono']) {
  assert.ok(tokensCss.includes(token), `tokens.css must define ${token}`)
}

// Deep space ambient base color & radial gradient
assert.ok(tokensCss.includes('#0a0d14'), 'Dark mode must use obsidian black (#0a0d14)')
assert.ok(tokensCss.includes('radial-gradient'), 'tokens.css must include radial-gradient ambient lighting')

// Body ambient mesh
assert.match(tokensCss, /body\s*\{[^}]*background-image:\s*var\(--mesh-gradient\)/, 'body must use var(--mesh-gradient)')

// Cyber palettes (6 colors with light/primary and dark/glow variants)
const cyberPalettes = [
  { name: 'default / cyber cyan', primary: '#06b6d4', glow: '#00f2fe' },
  { name: 'midnight / cyber violet', primary: '#8b5cf6', glow: '#a78bfa' },
  { name: 'forest / matrix emerald', primary: '#10b981', glow: '#34d399' },
  { name: 'sunset / solar amber', primary: '#f59e0b', glow: '#fbbf24' },
  { name: 'ocean / deep space blue', primary: '#3b82f6', glow: '#60a5fa' },
  { name: 'rose / neon pink', primary: '#ec4899', glow: '#f472b6' },
]

for (const p of cyberPalettes) {
  assert.ok(tokensCss.includes(p.primary), `tokens.css must include primary color ${p.primary} for ${p.name}`)
  assert.ok(tokensCss.includes(p.glow), `tokens.css must include glow color ${p.glow} for ${p.name}`)
}

// Precision monospace typography stack
assert.ok(tokensCss.includes("ui-monospace, 'Geist Mono', 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace"), 'tokens.css must define modern monospace font stack')

// Reduced transparency support
assert.ok(tokensCss.includes('prefers-reduced-transparency'), 'tokens.css must respect prefers-reduced-transparency')

console.log('design tokens and deep space ambient lighting assertions passed')

const data={ping:[{task_id:1,ts:1,latency:10}],probes:{'1':'A','2':'Empty','-1':'invalid'}}
assert.deepEqual(probeCatalog(data).map(p=>p.id),[1,2])
assert.equal(windowLoss(data,1),null)
assert.equal(windowLoss({...data,loss:{}},1),0)
assert.equal(summarizePing(data),summarizePing(data))
assert.equal(probeCatalog(data),probeCatalog(data))
let first=0,second=0
const stop1=subscribeNodePing(700,()=>first++),stop2=subscribeNodePing(701,()=>second++)
globalThis.fetch=(async()=>new Response(JSON.stringify(data))) as typeof fetch
await loadPing(700)
assert.equal(first,1);assert.equal(second,0)
stop1();stop2()
for(let id=1000;id<1205;id++)await loadPing(id)
assert.equal(getPing(700),undefined)
assert.equal(getPing(1000),undefined)
assert.ok(getPing(1204)?.data)
for(const count of [20,100,500]) {
 const snapshots=Array.from({length:count},()=>({ping:Array.from({length:1440},(_,i)=>({task_id:1,ts:i,latency:i%200}))}))
 const start=performance.now();snapshots.forEach(summarizePing);const cold=performance.now()-start
 const warm=performance.now();for(let i=0;i<10;i++)snapshots.forEach(summarizePing)
 console.log(JSON.stringify({nodes:count,samplesPerNode:1440,coldMs:+cold.toFixed(2),tenCachedPassesMs:+(performance.now()-warm).toFixed(2)}))
}
console.log('catalog, unknown loss, identity cache, scoped subscription and bounded retention passed')
