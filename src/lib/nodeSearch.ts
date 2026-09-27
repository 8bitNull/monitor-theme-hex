import type {Node} from './api'
import {countryName} from './regionNames'

export function searchNodes(nodes:Node[],query:string){
 const term=query.trim().toLocaleLowerCase()
 if(!term)return nodes
 return nodes.filter(node=>[node.name,node.country,countryName(node.country),node.group,node.os].filter(Boolean).join(' ').toLocaleLowerCase().includes(term))
}
