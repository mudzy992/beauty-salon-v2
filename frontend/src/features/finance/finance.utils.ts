import {
  formatDateOnlyLocale,
  formatInstantDateLocale,
  getDateOnlyFromLocalCalendarDate,
  getDateTimePartsInTimeZone,
  getSalonDateOnly,
} from '../../../../shared/business-date.mjs'

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

export const getEndOfMonthDate = (year: number, month: number): Date => {
  const date = new Date(0)
  date.setUTCFullYear(year, month, 0)
  date.setUTCHours(12, 0, 0, 0)
  return date
}

export const formatDateBs = (date: Date): string =>
  formatInstantDateLocale(date, 'bs-BA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

export const formatDateOnlyBs = (value: string | null | undefined): string => {
  if (!value) return '—'
  const dateOnly = value.slice(0, 10)
  try {
    return formatDateOnlyLocale(dateOnly, 'bs-BA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return '—'
  }
}

export const formatInstantDateBs = (
  value: Date | string | null | undefined,
): string => {
  if (!value) return '—'
  try {
    return formatInstantDateLocale(value, 'bs-BA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return '—'
  }
}

/** Backwards-compatible alias for callers that display a timestamp. */
export const formatIsoDateBs = formatInstantDateBs

export const formatPeriod = (year: number, month: number): string =>
  `${MONTHS[month] ?? month} ${year}`

export const toDateInputValue = (date: Date): string =>
  getDateOnlyFromLocalCalendarDate(date)

/** Prvi dan mjeseca, ili salonov današnji datum ako je knjiga tekuća. */
export const getDefaultEntryDate = (year: number, month: number): string => {
  const now = new Date()
  const salonParts = getDateTimePartsInTimeZone(now)
  if (salonParts.year === year && salonParts.month === month) {
    return getSalonDateOnly(now)
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`
}

export const isFuturePeriod = (year: number, month: number): boolean => {
  const now = getDateTimePartsInTimeZone(new Date())
  if (year !== now.year) return year > now.year
  return month > now.month
}

export const isPastPeriod = (year: number, month: number): boolean => {
  const now = getDateTimePartsInTimeZone(new Date())
  if (year !== now.year) return year < now.year
  return month < now.month
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
