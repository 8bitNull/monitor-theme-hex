export type ColumnGroup='identity'|'resources'|'network'|'quality'|'billing'|'notes'
const groups:Record<string,ColumnGroup>={
 name:'identity',status:'identity',country:'identity',system:'identity',
 uptime:'identity',lastSeen:'identity',
 cpu:'resources',memory:'resources',disk:'resources',load:'resources',
 swap:'resources',processes:'resources',
 speed:'network',upload:'network',download:'network',connections:'network',todayTraffic:'network',
 latency:'quality',loss:'quality',probe:'quality',
 traffic:'billing',expiry:'billing',billing:'billing',remark:'notes',
}
export function tableGroupAttributes(keys:readonly string[],index:number):{
 'data-column-group':ColumnGroup;'data-group-start':boolean;
}{
 const group=groups[keys[index]]??'identity'
 const previous=index>0?(groups[keys[index-1]]??'identity'):group
 return {'data-column-group':group,'data-group-start':index>0&&group!==previous}
}
