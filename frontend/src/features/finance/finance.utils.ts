export const MONTHS = [
  '',
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'August',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
] as const

export const CURRENCY = 'KM'

export const toNumber = (value: number | string | null | undefined): number => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export const formatMoney = (value: number | string | null | undefined): string =>
  `${toNumber(value).toLocaleString('bs-BA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${CURRENCY}`

export const getEndOfMonthDate = (year: number, month: number): Date =>
  new Date(year, month, 0)

export const formatDateBs = (date: Date): string =>
  date.toLocaleDateString('bs-BA')

export const formatIsoDateBs = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : formatDateBs(date)
}

export const formatPeriod = (year: number, month: number): string =>
  `${MONTHS[month] ?? month} ${year}`

export const toDateInputValue = (date: Date): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Prvi dan mjeseca, ili danas ako je knjiga za tekući mjesec. */
export const getDefaultEntryDate = (year: number, month: number): string => {
  const now = new Date()
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month
  return toDateInputValue(isCurrent ? now : new Date(year, month - 1, 1))
}

export const isFuturePeriod = (year: number, month: number): boolean => {
  const now = new Date()
  if (year !== now.getFullYear()) return year > now.getFullYear()
  return month > now.getMonth() + 1
}

export const isPastPeriod = (year: number, month: number): boolean => {
  const now = new Date()
  if (year !== now.getFullYear()) return year < now.getFullYear()
  return month < now.getMonth() + 1
}

export const getPersonName = (
  person:
    | { username?: string; firstName?: string | null; lastName?: string | null }
    | null
    | undefined,
): string => {
  if (!person) return '—'
  const full = `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
  return full || person.username || '—'
}
