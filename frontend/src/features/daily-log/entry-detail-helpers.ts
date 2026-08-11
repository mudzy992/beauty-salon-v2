import type { DailyLogEntry } from './types'

export const formatDetailKm = (v: number): string => `${v.toFixed(2)} KM`

export const clientLabel = (entry: DailyLogEntry): string => {
  if (!entry.client) return '—'
  return (
    [entry.client.firstName, entry.client.lastName].filter(Boolean).join(' ') ||
    entry.client.user?.username ||
    '—'
  )
}

export type DetailServiceRow = { key: string; name: string; price: number }

export const serviceRows = (entry: DailyLogEntry): DetailServiceRow[] => {
  if (entry.items && entry.items.length > 0) {
    return entry.items.map((it) => ({
      key: it.id || it.serviceId,
      name: it.service?.name ?? 'Usluga',
      price: Number(it.unitPrice ?? it.service?.price ?? 0),
    }))
  }
  if (entry.service) {
    return [
      {
        key: entry.service.id,
        name: entry.service.name,
        price: Number(entry.service.price ?? entry.actualPrice ?? 0),
      },
    ]
  }
  return []
}

export const statusLabel = (entry: DailyLogEntry): string => {
  if (entry.deletedAt) return 'Obrisan'
  return entry.status === 'COMPLETED' ? 'Kompletiran' : 'Na čekanju'
}

export const statusVariant = (
  entry: DailyLogEntry,
): 'secondary' | 'success' | 'warning' => {
  if (entry.deletedAt) return 'secondary'
  return entry.status === 'COMPLETED' ? 'success' : 'warning'
}
