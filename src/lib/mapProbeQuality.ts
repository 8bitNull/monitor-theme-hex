import {summarizePing,type PingSnapshot} from './ping.ts'
import {isRecentPingSample} from './pingRecency.ts'

export type MapProbeQuality={state:'unknown'|'healthy'|'slow'|'high'|'timeout'|'loss';name?:string;latency:number|null;sampleLoss:number|null;historyLoss:number|null}
/** Current quality uses only a fresh selected bucket, never the 24h loss aggregate. */
export function mapProbeQuality(snapshot:PingSnapshot|undefined,probe:string,warn:number,high:number,now=Date.now()):MapProbeQuality{
 const stats=snapshot?.data?summarizePing(snapshot.data):[]
 const selected=probe==='auto'?stats[0]:stats.find(s=>String(s.id)===probe)
 const unknown:MapProbeQuality={state:'unknown',name:selected?.name,latency:null,sampleLoss:null,historyLoss:snapshot?.failed?null:selected?.loss??null}
 if(snapshot?.failed||!selected||!Number.isFinite(snapshot?.updatedAt)||now-snapshot!.updatedAt!>=120000||now-snapshot!.updatedAt!<0||!isRecentPingSample(selected.latest.ts,now))return unknown
 const {latency,loss}=selected.latest
 const sampleLoss=typeof loss==='number'&&Number.isFinite(loss)&&loss>=0&&loss<=100?loss:null
 return {...unknown,latency,sampleLoss,state:latency===null?'timeout':latency>=high?'high':sampleLoss!==null&&sampleLoss>0?'loss':latency>=warn?'slow':'healthy'}
}
