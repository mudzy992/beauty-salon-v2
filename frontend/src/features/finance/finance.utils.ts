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

export function getEndOfMonthDate(year: number, month: number): Date {
  return new Date(year, month, 0)
}

export function formatDateBs(date: Date): string {
  return date.toLocaleDateString('bs-BA')
}

