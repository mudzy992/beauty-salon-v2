export interface DayStartEnd {
  start: Date
  end: Date
}

export const getDayStartEnd = (date: Date): DayStartEnd => {
  const base = new Date(date)
  const start = new Date(base)
  start.setHours(0, 0, 0, 0)
  const end = new Date(base)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

export const iterateMonthsInclusive = (
  fromDate: Date,
  toDate: Date,
): Array<{ year: number; month: number }> => {
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
  const to = new Date(toDate.getFullYear(), toDate.getMonth(), 1)
  const months: Array<{ year: number; month: number }> = []
  const cursor = new Date(from)
  while (cursor <= to) {
    months.push({ year: cursor.getFullYear(), month: cursor.getMonth() + 1 })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}
