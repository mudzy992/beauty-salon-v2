import { useCallback, useEffect, useState } from 'react'
import api from '../../api/client'
import { useSocketEvent } from '../../context/SocketContext'
import type { DashboardStats, RecentReservation } from './types'
import { getCalendarMonthRange, getDateTimePartsInTimeZone } from '../../../../shared/business-date.mjs'

const currentMonthBounds = () => {
  const now = new Date()
  const { year, month } = getDateTimePartsInTimeZone(now)
  const { fromDate: firstDay, toDate: lastDay } = getCalendarMonthRange(now)
  return { year, month, firstDay, lastDay }
}

const asArray = <T,>(data: unknown): T[] => (Array.isArray(data) ? data : [])

const catalogCount = (data: unknown) => {
  if (Array.isArray(data)) return data.length
  if (data && typeof data === 'object' && 'total' in data && typeof data.total === 'number') {
    return data.total
  }
  return 0
}

export const DASHBOARD_SOURCES = {
  usersCount: 'usersCount',
  stylists: 'stylists',
  services: 'services',
  reservationSummary: 'reservationSummary',
  incomeBook: 'incomeBook',
  expenseBook: 'expenseBook',
  reviews: 'reviews',
  blogPosts: 'blogPosts',
} as const

export const DASHBOARD_SOURCE_COUNT = Object.keys(DASHBOARD_SOURCES).length

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([])
  const [loading, setLoading] = useState(true)
  // D9: svih 8 poziva pada NEZAVISNO (svaki ima svoj .catch). Bez ovog stanja
  // potpuni pad backenda renderuje nule koje izgledaju kao stvarni podaci.
  const [failedSources, setFailedSources] = useState<string[]>([])

  const loadData = useCallback(() => {
    setLoading(true)
    const failed: string[] = []
    const { year, month, firstDay, lastDay } = currentMonthBounds()
    Promise.all([
      api
        .get<{ total?: number }>('/api/users/dashboard-count')
        .catch(() => {
          failed.push(DASHBOARD_SOURCES.usersCount)
          return { data: { total: 0 } }
        }),
      api.get('/api/stylists', { params: { page: 0, pageSize: 1 } }).catch(() => {
        failed.push(DASHBOARD_SOURCES.stylists)
        return { data: [] }
      }),
      api.get('/api/services', { params: { page: 0, pageSize: 1 } }).catch(() => {
        failed.push(DASHBOARD_SOURCES.services)
        return { data: [] }
      }),
      api
        .get<{
          reservationsThisMonth?: number
          completedReservations?: number
          pendingReservations?: number
          recentReservations?: RecentReservation[]
        }>('/api/reservations/dashboard-summary', {
          params: { fromDate: firstDay, toDate: lastDay },
        })
        .catch(() => {
          failed.push(DASHBOARD_SOURCES.reservationSummary)
          return { data: null }
        }),
      api.get(`/api/income-books/month/${year}/${month}`).catch(() => {
        failed.push(DASHBOARD_SOURCES.incomeBook)
        return { data: null }
      }),
      api
        .get<{ expenses?: { totalAmount: string | number }[] }>(
          `/api/expense-books/month/${year}/${month}`,
        )
        .catch(() => {
          failed.push(DASHBOARD_SOURCES.expenseBook)
          return { data: null }
        }),
      api.get('/api/reviews/admin', { params: { approved: 'false' } }).catch(() => {
        failed.push(DASHBOARD_SOURCES.reviews)
        return { data: [] }
      }),
      api.get('/api/blog/admin').catch(() => {
        failed.push(DASHBOARD_SOURCES.blogPosts)
        return { data: [] }
      }),
    ])
      .then(
        ([
          usersCountRes,
          stylistsRes,
          servicesRes,
          reservationSummaryRes,
          incomeRes,
          expenseBookRes,
          reviewsRes,
          blogRes,
        ]) => {
          setFailedSources(failed)
          const reservationSummary = reservationSummaryRes.data
          const summaryCount = (value: unknown) =>
            typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
              ? value
              : 0
          const bookExpenses = asArray<{ totalAmount: string | number }>(
            expenseBookRes.data?.expenses,
          )
          const monthExpenses = bookExpenses.reduce(
            (sum, e) => sum + Number(e.totalAmount ?? 0),
            0,
          )
          const incomeBook = incomeRes.data as {
            totalRevenue?: number | string
            totalTips?: number | string
          } | null

          setStats({
            usersCount: Number.isFinite(usersCountRes.data?.total)
              ? Number(usersCountRes.data.total)
              : 0,
            stylistsCount: catalogCount(stylistsRes.data),
            servicesCount: catalogCount(servicesRes.data),
            reservationsThisMonth: summaryCount(reservationSummary?.reservationsThisMonth),
            pendingReservations: summaryCount(reservationSummary?.pendingReservations),
            completedReservations: summaryCount(reservationSummary?.completedReservations),
            servicesRevenueThisMonth: Number(incomeBook?.totalRevenue || 0),
            tipsThisMonth: Number(incomeBook?.totalTips || 0),
            expensesThisMonth: monthExpenses,
            pendingReviews: asArray(reviewsRes.data).length,
            blogPostsCount: asArray(blogRes.data).length,
          })

          setRecentReservations(
            asArray<RecentReservation>(reservationSummary?.recentReservations).slice(0, 8),
          )
        },
      )
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useSocketEvent('reservation:created', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:updated', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:confirmed', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:cancelled', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:stylist_response', useCallback(() => loadData(), [loadData]))

  return {
    stats,
    recentReservations,
    loading,
    failedSources,
    // D9: tek kad padnu SVI izvori nule su bezvrijedne; djelimični pad
    // zadrzava ispravne brojeve i samo ih oznaci bannerom.
    loadError: failedSources.length >= DASHBOARD_SOURCE_COUNT,
    reload: loadData,
  }
}
