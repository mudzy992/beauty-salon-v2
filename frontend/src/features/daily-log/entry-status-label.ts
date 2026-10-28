import type { DailyLogEntry } from './types'

export type DailyLogStatusKey =
  | 'dailyLog.table.statuses.deleted'
  | 'dailyLog.table.statuses.completed'
  | 'dailyLog.table.statuses.inProgress'
  | 'dailyLog.table.statuses.pending'

export const getDailyLogStatusKey = (
  entry: DailyLogEntry,
): DailyLogStatusKey => {
  if (entry.deletedAt) return 'dailyLog.table.statuses.deleted'
  if (entry.status === 'COMPLETED') return 'dailyLog.table.statuses.completed'
  if (entry.reservation?.status === 'IN_PROGRESS') {
    return 'dailyLog.table.statuses.inProgress'
  }
  return 'dailyLog.table.statuses.pending'
}

export const getDailyLogStatusVariant = (
  entry: DailyLogEntry,
): 'secondary' | 'success' | 'warning' => {
  if (entry.deletedAt) return 'secondary'
  if (entry.status === 'COMPLETED') return 'success'
  if (entry.reservation?.status === 'IN_PROGRESS') return 'warning'
  return 'warning'
}
