import type {Node} from './api.ts'
import {daysUntil} from './format.ts'
import {trafficUsage} from './traffic.ts'

// Shared with mobile: account facts remain useful even while a node is offline.
export function expiring(node:Node){
 const days=daysUntil(node.expires_at)
 return days!==null&&days<=7
}
export function quotaWarning(node:Node){
 return node.traffic_limit>0&&trafficUsage(node).value/node.traffic_limit>=.9
}
