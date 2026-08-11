import type {
  IncomeBook,
  IncomeEntry,
  IncomeEntryFilters,
  IncomeEntryRow,
  SortDirection,
} from '../finance.types'
import { getPersonName, toNumber } from '../finance.utils'

export const EMPTY_INCOME_FILTERS: IncomeEntryFilters = {
  search: '',
  kind: 'ALL',
  stylistName: '',
  minAmount: '',
  maxAmount: '',
}

export type IncomeSortField = 'date' | 'amount' | 'tipAmount' | 'serviceName'

export const resolveIncomeServiceNames = (
  dailyLogEntry: IncomeEntry['dailyLogEntry'] | undefined,
): string[] => {
  const fromItems =
    dailyLogEntry?.items
      ?.map((it) => it.service?.name)
      .filter((name): name is string => Boolean(name)) ?? []
  if (fromItems.length > 0) return fromItems
  if (dailyLogEntry?.service?.name) return [dailyLogEntry.service.name]
  return []
}

export const resolveIncomeServiceLabel = (
  dailyLogEntry: IncomeEntry['dailyLogEntry'] | undefined,
): string => {
  const names = resolveIncomeServiceNames(dailyLogEntry)
  return names.length > 0 ? names.join(', ') : '—'
}

/** Spaja automatske i ručne stavke u jedinstven red tabele. */
export const toIncomeEntryRows = (book: IncomeBook | undefined): IncomeEntryRow[] => {
  if (!book) return []

  const autoRows: IncomeEntryRow[] = (book.entries ?? []).map((entry) => ({
    id: entry.id,
    kind: 'AUTO',
    date: entry.date,
    serviceName: resolveIncomeServiceLabel(entry.dailyLogEntry),
    stylistName: getPersonName(entry.dailyLogEntry?.stylistProfile?.user),
    clientName: getPersonName(entry.dailyLogEntry?.client as never),
    amount: toNumber(entry.amount),
    tipAmount: toNumber(entry.tipAmount),
    notes: entry.dailyLogEntry?.notes ?? null,
    autoEntry: entry,
  }))

  const manualRows: IncomeEntryRow[] = (book.manualEntries ?? []).map((entry) => ({
    id: entry.id,
    kind: 'MANUAL',
    date: entry.date,
    serviceName: entry.service?.name ?? '—',
    stylistName: getPersonName(entry.stylistProfile?.user),
    clientName: getPersonName(entry.client),
    amount: toNumber(entry.amount),
    tipAmount: toNumber(entry.tipAmount),
    notes: entry.notes,
    manualEntry: entry,
  }))

  return [...autoRows, ...manualRows]
}

const matchesSearch = (row: IncomeEntryRow, term: string): boolean =>
  [row.serviceName, row.stylistName, row.clientName, row.notes ?? '']
    .join(' ')
    .toLowerCase()
    .includes(term)

export const filterIncomeRows = (
  rows: IncomeEntryRow[],
  filters: IncomeEntryFilters,
): IncomeEntryRow[] => {
  const term = filters.search.trim().toLowerCase()
  const stylistTerm = filters.stylistName.trim().toLowerCase()
  const min = filters.minAmount === '' ? null : Number(filters.minAmount)
  const max = filters.maxAmount === '' ? null : Number(filters.maxAmount)

  return rows.filter((row) => {
    if (filters.kind !== 'ALL' && row.kind !== filters.kind) return false
    if (term && !matchesSearch(row, term)) return false
    if (stylistTerm && !row.stylistName.toLowerCase().includes(stylistTerm)) {
      return false
    }
    const total = row.amount + row.tipAmount
    if (min !== null && Number.isFinite(min) && total < min) return false
    if (max !== null && Number.isFinite(max) && total > max) return false
    return true
  })
}

export const sortIncomeRows = (
  rows: IncomeEntryRow[],
  field: IncomeSortField,
  direction: SortDirection,
): IncomeEntryRow[] => {
  const factor = direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (field === 'amount' || field === 'tipAmount') {
      return (a[field] - b[field]) * factor
    }
    return String(a[field]).localeCompare(String(b[field]), 'bs') * factor
  })
}

export const summarizeIncomeRows = (rows: IncomeEntryRow[]) => {
  const revenue = rows.reduce((sum, row) => sum + row.amount, 0)
  const tips = rows.reduce((sum, row) => sum + row.tipAmount, 0)
  return { revenue, tips, total: revenue + tips, count: rows.length }
}
