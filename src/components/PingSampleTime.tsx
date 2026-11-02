import {relativeTime} from '@/lib/format'
import {locale,tr} from '@/lib/i18n'

export function PingSampleTime({ts}:{ts:number}){
 const date=new Date(ts*1000)
 if(!Number.isFinite(date.getTime()))return null
 return <time dateTime={date.toISOString()} title={tr('采样：{0}',date.toLocaleString(locale()))}>{tr('最近采样：{0}',relativeTime(ts))} · {date.toLocaleString(locale())}</time>
}
