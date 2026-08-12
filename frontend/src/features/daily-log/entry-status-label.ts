import type { DailyLogEntry } from './types'

export const getDailyLogStatusLabel = (entry: DailyLogEntry): string => {
  if (entry.deletedAt) return 'Obrisan'
  if (entry.status === 'COMPLETED') return 'Kompletiran'
  if (entry.reservation?.status === 'IN_PROGRESS') {
    return 'Na čekanju (termin u toku)'
  }
  return 'Na čekanju'
}

export const getDailyLogStatusVariant = (
  entry: DailyLogEntry,
): 'secondary' | 'success' | 'warning' => {
  if (entry.deletedAt) return 'secondary'
  if (entry.status === 'COMPLETED') return 'success'
  if (entry.reservation?.status === 'IN_PROGRESS') return 'warning'
  return 'warning'
}
