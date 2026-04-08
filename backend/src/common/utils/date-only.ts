export const toLocalDateOnlyString = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const parseDateOnlyString = (value: string): Date => {
  const raw = (value ?? '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (!match) {
    throw new Error('Invalid date-only format. Expected YYYY-MM-DD.')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}
