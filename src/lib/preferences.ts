import { useEffect, useState, useMemo, useCallback, type SetStateAction } from 'react'
import { normalizePreferences, type Preferences, type DisplayPatch } from './appearance'
export { palettes } from './appearance'
export type { Preferences } from './appearance'
const personalKeys = ['appearance', 'probe'] as const
export type DesktopPreferences = {mapExpanded?:boolean;cardDensity:'compact'|'detailed'}
const desktopKey='hex-desktop-v1'
export function useDesktopPreferences(){
 const [desktop,setDesktop]=useState<DesktopPreferences>(()=>{
  try {const saved=JSON.parse(localStorage.getItem(desktopKey)||'{}');return {cardDensity:saved.cardDensity==='detailed'?'detailed':'compact'}}
  catch {return {cardDensity:'compact'}}
 })
 useEffect(()=>{try{localStorage.setItem(desktopKey,JSON.stringify(desktop))}catch{/* Optional personal preference. */}},[desktop])
 return [desktop,setDesktop] as const
}

export function usePreferences(siteDefaults: Preferences) {
  const [overrides, setOverrides] = useState<Record<string,unknown>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('monitor-next') || '{}')
      const next = normalizePreferences(saved, siteDefaults)
      const personal: Record<string,unknown> = {}
      // Version 1 could copy the site's route from browse state as a personal choice.
      for (const key of personalKeys) if (!(key==='probe'&&saved?._storageVersion===1) && Object.hasOwn(saved || {},key) && saved[key] === next[key]) personal[key] = next[key]
      if (!Object.hasOwn(saved || {},'appearance')) {
        const mode = localStorage.getItem('monitor-next-mode')
        if (mode === 'dark' || mode === 'light') personal.appearance = mode
      }
      return personal
    } catch { return {} }
  })
  const prefs=useMemo(()=>normalizePreferences(overrides,siteDefaults),[overrides,siteDefaults])
  const setPrefs=useCallback((next:SetStateAction<Preferences>)=>setOverrides(current=>{
    const resolved=typeof next==='function'?next(normalizePreferences(current,siteDefaults)):next
    return Object.fromEntries(personalKeys.filter(key=>Object.hasOwn(current,key) || resolved[key] !== siteDefaults[key]).map(key=>[key,resolved[key]]))
  }),[siteDefaults])
  useEffect(() => { try { localStorage.setItem('monitor-next', JSON.stringify({_storageVersion:2,schemaVersion:3,designVersion:1,...overrides})) } catch { /* Storage may be disabled. */ } }, [overrides])
  const selectDisplay=useCallback((patch:DisplayPatch)=>setOverrides(current=>patch.detailInfoMode ? {...current,detailInfoMode:patch.detailInfoMode} : current),[])
  return [prefs, setPrefs, selectDisplay] as const
}
export function useAppearance(mode: Preferences['appearance']) {
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const dark = mode === 'system' ? systemDark : mode === 'dark'
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); document.documentElement.style.colorScheme = dark ? 'dark' : 'light' }, [dark])
  return dark
}
