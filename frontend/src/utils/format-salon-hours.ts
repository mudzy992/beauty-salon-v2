export type SalonHoursRow = {
  dayOfWeek: number
  isWorkingDay: boolean
  openTime?: string
  closeTime?: string
}

export function formatSalonWorkingHours(
  rows: SalonHoursRow[] | undefined,
  locale = 'bs-BA',
  closedLabel = 'Zatvoreno',
): string {
  if (!rows?.length) return ''
  const weekdayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const sorted = [...rows].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  return sorted
    .map((row) => {
      const dayDate = new Date(Date.UTC(2023, 0, row.dayOfWeek + 1))
      const validWeekday = Number.isInteger(row.dayOfWeek) && row.dayOfWeek >= 0 && row.dayOfWeek <= 6
      const label = validWeekday ? weekdayFormatter.format(dayDate) : String(row.dayOfWeek)
      if (!row.isWorkingDay) return `${label}: ${closedLabel}`
      return `${label}: ${row.openTime ?? ''}–${row.closeTime ?? ''}`
    })
    .join('\n')
}
