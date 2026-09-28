import {groupRegions} from '@/lib/groups'
import {countryName} from '@/lib/regionNames'
import {Select} from './ui/select'
import {tr} from '@/lib/i18n'

type RegionNode={country:string;online:boolean}
export function DesktopRegionFilter({nodes,region,onChange}:{nodes:RegionNode[];region:string;onChange:(region:string)=>void}){
 const regions=groupRegions(nodes)
 return <label className="desktop-region-filter"><span>{tr('地区')}</span><Select aria-label={tr('地区')} value={region} onChange={event=>onChange(event.target.value)}>
  <option value="all">{tr('所有地区')}</option>
  {region!=='all'&&!regions.some(r=>r.code===region)&&<option value={region}>{countryName(region)} · 0</option>}
  {regions.map(r=><option key={r.code} value={r.code}>{countryName(r.code)} · {r.total}</option>)}
 </Select></label>
}
