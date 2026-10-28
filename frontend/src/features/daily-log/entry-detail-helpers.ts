import { formatLocalizedAmount } from '../../i18n/locale-utils.mjs'
import type { DailyLogStatusKey } from './entry-status-label'
import type { DailyLogEntry } from './types'

export const formatDetailKm = (value: number, language: string): string =>
  formatLocalizedAmount(value, language)

export const clientLabel = (entry: DailyLogEntry): string => {
  if (!entry.client) return '—'
  return (
    [entry.client.firstName, entry.client.lastName].filter(Boolean).join(' ') ||
    entry.client.user?.username ||
    '—'
  )
}

export type DetailServiceRow = { key: string; name: string; price: number }

export const serviceRows = (
  entry: DailyLogEntry,
  missingServiceLabel: string,
): DetailServiceRow[] => {
  if (entry.items && entry.items.length > 0) {
    return entry.items.map((item) => ({
      key: item.id || item.serviceId,
      name: item.service?.name ?? missingServiceLabel,
      price: Number(item.unitPrice ?? item.service?.price ?? 0),
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

export const getDailyLogDetailStatusKey = (
  entry: DailyLogEntry,
): DailyLogStatusKey => {
  if (entry.deletedAt) return 'dailyLog.table.statuses.deleted'
  return entry.status === 'COMPLETED'
    ? 'dailyLog.table.statuses.completed'
    : 'dailyLog.table.statuses.pending'
}
