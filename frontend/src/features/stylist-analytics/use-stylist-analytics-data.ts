import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../../api/client'
import type { StylistAnalyticsData } from './stylist-analytics-types'

type Params = { stylistId: string | null; appliedFrom: string; appliedTo: string }
export function useStylistAnalyticsData({ stylistId, appliedFrom, appliedTo }: Params) {
  const [data, setData] = useState<StylistAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState(appliedFrom)
  const [dateTo, setDateTo] = useState(appliedTo)

  const [error, setError] = useState(false)
  const sequence = useRef(0)
  const lastParams = useRef<Record<string, string>>({})
  const load = useCallback((params: Record<string, string>) => {
    if (!stylistId) return
    const request = ++sequence.current
    lastParams.current = params
    setLoading(true)
    setError(false)
    setData(null)
    api
      .get<StylistAnalyticsData>(`/api/stylists/${encodeURIComponent(stylistId)}/analytics`, { params })
      .then((res) => {
        if (request !== sequence.current) return
        const value = res.data
        if (!value?.stylist || value.stylist.id !== stylistId || typeof value.stylist.name !== 'string' ||
            !Array.isArray(value.topServices) || !Array.isArray(value.recentEntries) ||
            ![value.completedCount, value.revenue, value.tips].every(Number.isFinite) ||
            !value.topServices.every(row => typeof row.serviceName === 'string' && [row.count, row.revenue].every(Number.isFinite)) ||
            !value.recentEntries.every(row => typeof row.id === 'string' && typeof row.date === 'string' && Number.isFinite(Number(row.actualPrice)))) {
          throw new Error('Invalid stylist analytics response')
        }
        setData(value)
      })
      .catch(() => { if (request === sequence.current) setError(true) })
      .finally(() => { if (request === sequence.current) setLoading(false) })
  }, [stylistId])

  useEffect(() => {
    setDateFrom(appliedFrom)
    setDateTo(appliedTo)
    setData(null)
    setError(false)
    if (stylistId) {
      const params: Record<string, string> = {}
      if (appliedFrom) params.fromDate = appliedFrom
      if (appliedTo) params.toDate = appliedTo
      load(params)
    } else setLoading(false)
    return () => { sequence.current += 1 }
  }, [stylistId, appliedFrom, appliedTo, load])

  return { data, loading, dateFrom, setDateFrom, dateTo, setDateTo, error, load, lastParams }
}
