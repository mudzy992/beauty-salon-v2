const DAY_LABELS = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub']

export type SalonHoursRow = {
  dayOfWeek: number
  isWorkingDay: boolean
  openTime?: string
  closeTime?: string
}

export function formatSalonWorkingHours(rows: SalonHoursRow[] | undefined): string {
  if (!rows?.length) return ''
  const sorted = [...rows].sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  return sorted
    .map((r) => {
      const label = DAY_LABELS[r.dayOfWeek] ?? String(r.dayOfWeek)
      if (!r.isWorkingDay) return `${label}: Zatvoreno`
      return `${label}: ${r.openTime ?? ''}–${r.closeTime ?? ''}`
    })
    .join('\n')
}
