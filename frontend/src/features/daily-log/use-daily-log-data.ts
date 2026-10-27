import { useCallback, useEffect, useState } from 'react'
import api from '../../api/client'
import { fetchAllPublicServices, fetchAllPublicStylists } from '../../api/catalog'
import { useReservationSocketRefresh } from '../reservations/use-reservation-socket-refresh'
import { useSocketEvent } from '../../context/SocketContext'
import type { ClientOption, DailyLogEntry, ServiceOption, StylistOption } from './types'
import { getCurrentMonthRange } from './date-range'
import { resetDailyLogFilters } from './entry-filters'

export const useDailyLogData = () => {
  const initial = getCurrentMonthRange()
  const [entries, setEntries] = useState<DailyLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(initial.fromDate)
  const [toDate, setToDate] = useState(initial.toDate)
  const [stylistFilter, setStylistFilter] = useState('')
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [stylists, setStylists] = useState<StylistOption[]>([])
  const [services, setServices] = useState<ServiceOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])

  const loadData = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (stylistFilter) params.stylistProfileId = stylistFilter
    if (includeDeleted) params.includeDeleted = '1'
    api
      .get<DailyLogEntry[]>('/api/daily-log', { params })
      .then((r) => setEntries(Array.isArray(r.data) ? r.data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [fromDate, toDate, stylistFilter, includeDeleted])

  useEffect(() => {
    loadData()
  }, [loadData])

  useReservationSocketRefresh(loadData)
  useSocketEvent('daily-log:updated', loadData)

  useEffect(() => {
    fetchAllPublicStylists<StylistOption>()
      .then(setStylists)
      .catch(() => {})
    fetchAllPublicServices<ServiceOption>({ activeOnly: true })
      .then(setServices)
      .catch(() => {})
    api
      .get<ClientOption[]>('/api/users/for-daily-log')
      .then((r) => setClients(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
  }, [])

  const handleResetFilters = () => {
    const next = resetDailyLogFilters()
    setFromDate(next.fromDate)
    setToDate(next.toDate)
    setStylistFilter(next.stylistFilter)
    setIncludeDeleted(next.includeDeleted)
  }

  return {
    entries,
    loading,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    stylistFilter,
    setStylistFilter,
    includeDeleted,
    setIncludeDeleted,
    stylists,
    services,
    clients,
    loadData,
    handleResetFilters,
  }
}
