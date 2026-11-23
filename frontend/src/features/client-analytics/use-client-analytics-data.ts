import { useEffect, useState } from 'react'
import api from '../../api/client'
import type { ClientAnalyticsData, ClientDebtRow } from './client-analytics-types'

type Params = { selectedUserId: string | null; appliedFrom: string; appliedTo: string }
export function useClientAnalyticsData({ selectedUserId, appliedFrom, appliedTo }: Params) {
  const [analytics, setAnalytics] = useState<ClientAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState(appliedFrom)
  const [dateTo, setDateTo] = useState(appliedTo)

  const [clientDebts, setClientDebts] = useState<ClientDebtRow[]>([])
  const [debtsLoading, setDebtsLoading] = useState(false)

  const [loadError, setLoadError] = useState(false)
  const [debtsError, setDebtsError] = useState(false)
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    if (!selectedUserId) return
    let current = true
    setDateFrom(appliedFrom)
    setDateTo(appliedTo)
    setAnalytics(null)
    setClientDebts([])
    setLoadError(false)
    setDebtsError(false)
    setLoading(true)
    setDebtsLoading(true)
    const params = { ...(appliedFrom ? { fromDate: appliedFrom } : {}), ...(appliedTo ? { toDate: appliedTo } : {}) }
    api.get<ClientAnalyticsData>(`/api/users/${encodeURIComponent(selectedUserId)}/analytics`, { params })
      .then(({ data }) => {
        if (!data || data.user?.id !== selectedUserId || !data.stats || !data.penalty ||
            !Array.isArray(data.topServices) || !Array.isArray(data.reservations) ||
            !Array.isArray(data.reviews) || !Array.isArray(data.manualEntries)) {
          throw new Error('Invalid client analytics response')
        }
        if (current) setAnalytics(data)
      })
      .catch(() => { if (current) setLoadError(true) })
      .finally(() => { if (current) setLoading(false) })
    api.get<ClientDebtRow[]>('/api/client-debts', { params: { clientId: selectedUserId } })
      .then(({ data }) => {
        if (!Array.isArray(data)) throw new Error('Invalid client debt response')
        if (current) setClientDebts(data)
      })
      .catch(() => { if (current) setDebtsError(true) })
      .finally(() => { if (current) setDebtsLoading(false) })
    return () => { current = false }
  }, [selectedUserId, appliedFrom, appliedTo, retryVersion])

  return { analytics, loading, dateFrom, setDateFrom, dateTo, setDateTo, clientDebts, debtsLoading, loadError, debtsError, setRetryVersion }
}
