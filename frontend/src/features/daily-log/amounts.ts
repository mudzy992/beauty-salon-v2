import type { DailyLogEntry } from './types'

/** Total collected (tip included). */
export const getTotalAmount = (e: Pick<DailyLogEntry, 'actualPrice'>): number => {
  const n = Number(e.actualPrice ?? 0)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/** Tip portion. */
export const getTipAmount = (e: Pick<DailyLogEntry, 'tipAmount'>): number => {
  const n = Number(e.tipAmount ?? 0)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/** Service revenue = total collected − tip. */
export const getServiceAmount = (
  e: Pick<DailyLogEntry, 'actualPrice' | 'tipAmount'>,
): number => {
  return Math.max(0, getTotalAmount(e) - getTipAmount(e))
}

export type EntryTotals = {
  total: number
  services: number
  tips: number
}

export const sumEntryTotals = (
  entries: Array<Pick<DailyLogEntry, 'actualPrice' | 'tipAmount'>>,
): EntryTotals => {
  return entries.reduce<EntryTotals>(
    (acc, e) => ({
      total: acc.total + getTotalAmount(e),
      services: acc.services + getServiceAmount(e),
      tips: acc.tips + getTipAmount(e),
    }),
    { total: 0, services: 0, tips: 0 },
  )
}
