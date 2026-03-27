import api from './api'

export type PublicSettingItem = {
  key: string
  value: string
}

let cached: { items: PublicSettingItem[]; fetchedAt: number } | null = null
const CACHE_TTL_MS = 60_000

export async function fetchPublicSettings(): Promise<PublicSettingItem[]> {
  const now = Date.now()
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.items
  const { data } = await api.get<unknown>('/api/settings/public')
  const items = Array.isArray(data)
    ? (data.filter((x) => {
        if (!x || typeof x !== 'object') return false
        const item = x as Record<string, unknown>
        return typeof item.key === 'string' && typeof item.value === 'string'
      }) as PublicSettingItem[])
    : []
  cached = { items, fetchedAt: now }
  return items
}

export function clearPublicSettingsCache() {
  cached = null
}

