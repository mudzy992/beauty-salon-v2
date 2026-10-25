import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import {
  addDateOnlyDays,
  getDateOnlyWeekday,
  getSalonDateOnly,
} from '../../../../../shared/business-date.mjs'
import { fetchDailyLogEntries } from '../api/stylist-workbook.api'
import type { DailyLogEntry } from '../types'

export type WorkbookSection = { title: string; data: DailyLogEntry[] }

export const useWorkbookEntries = (params: {
  stylistProfileId: string | null
  fromDate: string
  toDate: string
}) => {
  const query = useQuery({
    queryKey: ['dailyLog', 'list', params.stylistProfileId, params.fromDate, params.toDate],
    queryFn: async () => {
      if (!params.stylistProfileId) return []
      return fetchDailyLogEntries({
        stylistProfileId: params.stylistProfileId,
        fromDate: params.fromDate,
        toDate: params.toDate,
      })
    },
    enabled: !!params.stylistProfileId,
  })

  const sections = useMemo<WorkbookSection[]>(() => {
    const entries = query.data ?? []
    const today = getSalonDateOnly()
    const weekday = getDateOnlyWeekday(today)
    const thisWeekStart = addDateOnlyDays(today, weekday === 0 ? -6 : 1 - weekday)
    const thisWeekEnd = addDateOnlyDays(thisWeekStart, 6)
    const lastWeekStart = addDateOnlyDays(thisWeekStart, -7)
    const lastWeekEnd = addDateOnlyDays(thisWeekStart, -1)

    const buckets: Record<'today' | 'thisWeek' | 'lastWeek' | 'other', DailyLogEntry[]> = {
      today: [],
      thisWeek: [],
      lastWeek: [],
      other: [],
    }

    for (const entry of entries) {
      const dateOnly = String(entry.date ?? '').slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
        buckets.other.push(entry)
      } else if (dateOnly === today) {
        buckets.today.push(entry)
      } else if (dateOnly >= thisWeekStart && dateOnly <= thisWeekEnd) {
        buckets.thisWeek.push(entry)
      } else if (dateOnly >= lastWeekStart && dateOnly <= lastWeekEnd) {
        buckets.lastWeek.push(entry)
      } else {
        buckets.other.push(entry)
      }
    }

    const sortInGroup = (a: DailyLogEntry, b: DailyLogEntry) => {
      const aPending = a.status !== 'COMPLETED'
      const bPending = b.status !== 'COMPLETED'
      if (aPending !== bPending) return aPending ? -1 : 1
      if (a.date === b.date) return 0
      return a.date > b.date ? -1 : 1
    }

    ;(Object.keys(buckets) as Array<keyof typeof buckets>).forEach((key) =>
      buckets[key].sort(sortInGroup),
    )

    const result: WorkbookSection[] = []
    if (buckets.today.length) result.push({ title: 'Danas', data: buckets.today })
    if (buckets.thisWeek.length) result.push({ title: 'Ova sedmica', data: buckets.thisWeek })
    if (buckets.lastWeek.length) result.push({ title: 'Prošla sedmica', data: buckets.lastWeek })
    if (buckets.other.length) result.push({ title: 'Ostalo', data: buckets.other })
    return result
  }, [query.data])

  return {
    entries: query.data ?? [],
    sections,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}
