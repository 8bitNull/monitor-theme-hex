import manifest from '../../theme.json' with {type:'json'}
import {normalizePreferences, type Preferences} from './appearance.ts'

type Field = {
  key: string
  type: string
  default: unknown
  options?: {value: string}[]
  min?: number
  max?: number
}

const fields = (manifest.config as Field[]).filter(field => field.type !== 'title')
const url = `/api/themes/${manifest.short}/config`

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function fits(field: Field, value: unknown): boolean {
  switch (field.type) {
    case 'boolean': return typeof value === 'boolean'
    case 'number': return typeof value === 'number' && Number.isFinite(value) && value >= (field.min ?? -Infinity) && value <= (field.max ?? Infinity)
    case 'select': return !!field.options?.some(option => option.value === value)
    default: return typeof value === 'string'
  }
}

export function applySiteConfig(saved: unknown, base: Preferences): Preferences {
  const raw = object(saved)
  const patch: Record<string, unknown> = {}
  const modules: Record<string, unknown> = {}
  const cardInfo: Record<string, unknown> = {}
  const mobileCardInfo: Record<string, unknown> = {}
  for (const field of fields) {
    const value = raw[field.key]
    if (!fits(field, value)) continue
    if (field.key.startsWith('module_')) modules[field.key.slice(7)] = value
    else if (field.key.startsWith('card_info_')) cardInfo[field.key.slice(10)] = value
    else if (field.key.startsWith('mobile_card_info_')) mobileCardInfo[field.key.slice(17)] = value
    else patch[field.key] = field.key === 'latencyScale' || field.key === 'latencyWindow' ? Number(value) : value
  }
  if (Object.keys(modules).length) patch.modules = modules
  if (Object.keys(cardInfo).length) patch.cardInfo = cardInfo
  if (Object.keys(mobileCardInfo).length) patch.mobileCardInfo = {...(base.mobileCardInfo ?? base.cardInfo), ...mobileCardInfo}
  return normalizePreferences(patch, base)
}

export async function fetchSiteConfig(): Promise<unknown | null> {
  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(3000), cache: 'no-cache'})
    if (response.ok) return await response.json()
  } catch { /* An unavailable hub config does not block the public page. */ }
  return null
}

export async function loadSiteConfig(base: Preferences, config = fetchSiteConfig()): Promise<Preferences> {
  return applySiteConfig(await config, base)
}
