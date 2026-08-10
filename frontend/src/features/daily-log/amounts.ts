import type { DailyLogEntry } from './types'

/** Tip portion of the SERVICE entry. */
export const getTipAmount = (e: Pick<DailyLogEntry, 'tipAmount'>): number => {
  const n = Number(e.tipAmount ?? 0)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/** Settled OPEN debts linked to this SERVICE entry (via DEBT_PAYMENT children). */
export const getSettledDebtsSum = (
  e: Pick<DailyLogEntry, 'debtPaymentEntries'>,
): number => {
  const rows = e.debtPaymentEntries ?? []
  return rows.reduce((acc, row) => {
    const n = Number(row.actualPrice ?? 0)
    return acc + (Number.isFinite(n) ? Math.max(0, n) : 0)
  }, 0)
}

/** Collected for services only (tip included in actualPrice convention). */
export const getServicesCollected = (
  e: Pick<DailyLogEntry, 'actualPrice'>,
): number => {
  const n = Number(e.actualPrice ?? 0)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

/** Total collected = services + settled debts. */
export const getTotalAmount = (
  e: Pick<DailyLogEntry, 'actualPrice' | 'debtPaymentEntries'>,
): number => getServicesCollected(e) + getSettledDebtsSum(e)

/** Service revenue = services collected − tip (excludes settled debts). */
export const getServiceAmount = (
  e: Pick<DailyLogEntry, 'actualPrice' | 'tipAmount'>,
): number => Math.max(0, getServicesCollected(e) - getTipAmount(e))

export type EntryTotals = {
  total: number
  services: number
  tips: number
  debts: number
}

export const sumEntryTotals = (
  entries: Array<Pick<DailyLogEntry, 'actualPrice' | 'tipAmount' | 'debtPaymentEntries'>>,
): EntryTotals => {
  return entries.reduce<EntryTotals>(
    (acc, e) => ({
      total: acc.total + getTotalAmount(e),
      services: acc.services + getServiceAmount(e),
      tips: acc.tips + getTipAmount(e),
      debts: acc.debts + getSettledDebtsSum(e),
    }),
    { total: 0, services: 0, tips: 0, debts: 0 },
  )
}

export const getServicesLabel = (e: Pick<DailyLogEntry, 'items' | 'service'>): string => {
  const names =
    e.items && e.items.length > 0
      ? e.items.map((it) => it.service?.name).filter(Boolean)
      : e.service?.name
        ? [e.service.name]
        : []
  if (names.length === 0) return '-'
  if (names.length === 1) return names[0]!
  return `${names[0]} +${names.length - 1}`
}

export const getServicesLabelFull = (e: Pick<DailyLogEntry, 'items' | 'service'>): string => {
  const names =
    e.items && e.items.length > 0
      ? e.items.map((it) => it.service?.name).filter(Boolean)
      : e.service?.name
        ? [e.service.name]
        : []
  return names.length > 0 ? names.join(', ') : '-'
}
