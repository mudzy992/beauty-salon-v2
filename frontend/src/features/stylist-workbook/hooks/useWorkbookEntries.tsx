import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  endOfWeek,
  isSameDay,
  isWithinInterval,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'

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
    const today = new Date()
    const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 })
    const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 })
    const lastWeekDate = subWeeks(today, 1)
    const lastWeekStart = startOfWeek(lastWeekDate, { weekStartsOn: 1 })
    const lastWeekEnd = endOfWeek(lastWeekDate, { weekStartsOn: 1 })

    const buckets: Record<'today' | 'thisWeek' | 'lastWeek' | 'other', DailyLogEntry[]> = {
      today: [],
      thisWeek: [],
      lastWeek: [],
      other: [],
    }

    for (const e of entries) {
      const d = parseISO(e.date)
      if (isSameDay(d, today)) buckets.today.push(e)
      else if (isWithinInterval(d, { start: thisWeekStart, end: thisWeekEnd })) buckets.thisWeek.push(e)
      else if (isWithinInterval(d, { start: lastWeekStart, end: lastWeekEnd })) buckets.lastWeek.push(e)
      else buckets.other.push(e)
    }

    const sortInGroup = (a: DailyLogEntry, b: DailyLogEntry) => {
      const aPending = a.status !== 'COMPLETED'
      const bPending = b.status !== 'COMPLETED'
      if (aPending !== bPending) return aPending ? -1 : 1
      const ad = a.date
      const bd = b.date
      if (ad === bd) return 0
      return ad > bd ? -1 : 1
    }

    ;(Object.keys(buckets) as Array<keyof typeof buckets>).forEach((k) => buckets[k].sort(sortInGroup))

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

