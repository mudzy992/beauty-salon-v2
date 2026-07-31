const pad2 = (n: number): string => String(n).padStart(2, '0')

/** Local YYYY-MM-DD (avoids UTC day-shift from toISOString). */
export const formatLocalDate = (d: Date): string => {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Current calendar month: 1st of month → today (local). */
export const getCurrentMonthRange = (): { fromDate: string; toDate: string } => {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    fromDate: formatLocalDate(from),
    toDate: formatLocalDate(now),
  }
}
