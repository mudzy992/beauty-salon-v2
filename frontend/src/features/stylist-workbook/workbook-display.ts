import type { DailyLogEntry } from './types'

export const getSettledDebtsSum = (e: DailyLogEntry): number =>
  (e.debtPaymentEntries ?? []).reduce((acc, row) => {
    const n = Number(row.actualPrice ?? 0)
    return acc + (Number.isFinite(n) ? Math.max(0, n) : 0)
  }, 0)

export const getCollectedTotal = (e: DailyLogEntry): number =>
  Math.max(0, Number(e.actualPrice ?? 0)) + getSettledDebtsSum(e)

export const getServicesLabel = (e: DailyLogEntry, emptyFallback = 'Usluga'): string => {
  const names =
    e.items && e.items.length > 0
      ? e.items.map((it) => it.service?.name).filter(Boolean)
      : e.service?.name
        ? [e.service.name]
        : []
  if (names.length === 0) return emptyFallback
  if (names.length === 1) return names[0]!
  return `${names[0]} +${names.length - 1}`
}
