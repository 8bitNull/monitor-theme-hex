import assert from 'node:assert/strict'
import { browseNodes, defaultBrowse, normalizeBrowse, tableColumns, tablePreset, sortValue, tableColumnLabels } from './browse.ts'
import type { Node } from './api.ts'
const create = (id: number, cpu: number | null): Node => ({ id, sort: id, name: `Node ${id}`, country: 'JP', os: 'Debian', arch: 'x86', online: cpu !== null, metrics: cpu === null ? null : { cpu }, expires_at: id === 1 ? '2027-01-01' : null } as Node)
const nodes = [create(3, null), create(2, 20), create(1, 80)]
assert.deepEqual(browseNodes(nodes, defaultBrowse).map(n => n.id), [1,2,3])
assert.deepEqual(browseNodes(nodes, { ...defaultBrowse, sort: 'cpu', direction: 'asc' }).map(n => n.id), [2,1,3])
assert.deepEqual(browseNodes(nodes, { ...defaultBrowse, sort: 'cpu', direction: 'desc' }).map(n => n.id), [1,2,3])
assert.equal(browseNodes(nodes, { ...defaultBrowse, query: '日本' }).length, 3)
assert.deepEqual(browseNodes(nodes, { ...defaultBrowse, sort: 'expiry', direction: 'desc' }).map(n => n.id), [1,2,3])
assert.deepEqual(browseNodes([create(2,20),create(1,20)], { ...defaultBrowse, sort:'cpu' }).map(n=>n.id), [1,2])
const {setLanguage}=await import('./i18n.ts')
const localeNodes=[{...create(1,20),name:'Aster'},{...create(2,20),name:'阿尔法'}]
setLanguage('en')
assert.deepEqual(browseNodes(localeNodes,{...defaultBrowse,sort:'name'}).map(n=>n.id),[1,2])
setLanguage('zh')
assert.deepEqual(browseNodes(localeNodes,{...defaultBrowse,sort:'name'}).map(n=>n.id),[2,1])
console.log('sorting, null-last, default order, ties and region search passed')

assert.deepEqual(tableColumns(defaultBrowse.columns,true,false),['name','cpu','memory','disk','speed','latency','loss','probe','traffic','expiry'])
assert.deepEqual(tableColumns(['download','latency'],true,true),['name','speed','latency'])
assert.deepEqual(tableColumns([],false,false),['name','status'])
assert.equal(normalizeBrowse({}).tableLayout,'grouped')
for(const version of [2,3,4]) {
 const old=normalizeBrowse({columnsVersion:version,columns:['cpu','upload'],mobileColumns:[]})
 assert.deepEqual(old.columns,['cpu','upload']);assert.deepEqual(old.mobileColumns,[])
 assert.equal(old.tableLayout,'separate');assert.equal(old.mobileTableLayout,'separate')
}
assert.deepEqual(normalizeBrowse({columns:['cpu']}).columns,['cpu','traffic'])
assert.deepEqual(normalizeBrowse({columnsVersion:3,columns:['download','alien']}).columns,['download'])
assert.equal(normalizeBrowse({columns:[],tableLayout:'grouped'}).tableLayout,'grouped')
assert.deepEqual(tablePreset('network',true),{mobileColumns:['upload','download','latency'],mobileTableLayout:'grouped'})
assert.deepEqual(Object.keys(tablePreset('billing',false)),['columns','tableLayout'])
assert.equal(normalizeBrowse(null).columnsVersion,5)
const {loadPing}=await import('./ping.ts')
globalThis.fetch=(async(input)=>{const id=Number(String(input).match(/nodes\/(\d+)/)![1]);return new Response(JSON.stringify({ping:[{task_id:1,ts:Date.now()/1000-(id===94?8000:0),latency:id===91?null:80}],loss:id===93?undefined:{1:id===91?10:0}}))}) as typeof fetch
await Promise.all([91,92,93,94].map(id=>loadPing(id)))
const qualityNodes=[91,92,93,94].map(id=>create(id,20))
assert.deepEqual(browseNodes(qualityNodes,{...defaultBrowse,sort:'loss',direction:'desc'}).map(n=>n.id),[91,92,93,94])
assert.deepEqual(browseNodes(qualityNodes,{...defaultBrowse,sort:'loss',direction:'asc'}).map(n=>n.id),[92,91,93,94])
assert.equal(sortValue({...qualityNodes[0],online:false},'loss','auto'),10)
assert.equal(sortValue(qualityNodes[0],'latency','auto'),null)
console.log('table grouping, independent presets, legacy columns, missing loss, stale and offline sorting passed')

assert.deepEqual(normalizeBrowse({}).mobileColumns,['cpu','latency'])
assert.deepEqual(normalizeBrowse({columnsVersion:4,mobileColumns:['memory','traffic']}).mobileColumns,['memory','traffic'])
assert.deepEqual(normalizeBrowse({mobileColumns:[]}).mobileColumns,[])

assert.deepEqual(normalizeBrowse({columnsVersion:4,columns:['latency'],mobileColumns:['cpu','latency']}).columns,['latency','loss','probe'])
assert.deepEqual(normalizeBrowse({columnsVersion:5,columns:['probe','connections','alien'],mobileColumns:['loss']}).columns,['probe','connections'])
assert.deepEqual(normalizeBrowse({columnsVersion:5,mobileColumns:['loss']}).mobileColumns,['loss'])

const {english}=await import('./en.ts')
for(const label of Object.values(tableColumnLabels))if(/[\u4e00-\u9fff]/.test(label))assert.ok(Object.hasOwn(english,label),`Missing column translation: ${label}`)

// Pending is an online availability state, independent of offline status.
const statusNow=Date.now()
const fleet=[
 {...create(1,20),last_seen:statusNow/1000},
 {...create(2,null),last_seen:statusNow/1000},
 {...create(3,20),last_seen:(statusNow-120000)/1000,country:'US'},
 {...create(4,null),online:true,last_seen:statusNow/1000},
 {...create(5,20),last_seen:statusNow/1000,received_at:statusNow-16000},
]
assert.deepEqual(browseNodes(fleet,{...defaultBrowse,status:'pending'}).map(n=>n.id),[3,4,5])
assert.deepEqual(browseNodes(fleet,{...defaultBrowse,status:'offline'}).map(n=>n.id),[2])
assert.deepEqual(browseNodes(fleet,{...defaultBrowse,status:'online'}).map(n=>n.id),[1,3,4,5])
assert.deepEqual(browseNodes(fleet,{...defaultBrowse,status:'pending',region:'JP',query:'Node 4'}).map(n=>n.id),[4])
assert.equal(normalizeBrowse({status:'pending'}).status,'pending')
assert.equal(normalizeBrowse({status:'unknown'}).status,'all')
fleet[3]={...fleet[3],metrics:fleet[0].metrics}
assert.deepEqual(browseNodes(fleet,{...defaultBrowse,status:'pending'}).map(n=>n.id),[3,5])
console.log('pending, offline, online, conjunctive filters and recovery passed')
