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

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    const { year, month, firstDay, lastDay } = currentMonthBounds()
    Promise.all([
      api.get('/api/users').catch(() => ({ data: [] })),
      api.get('/api/stylists', { params: { page: 0, pageSize: 1 } }).catch(() => ({ data: [] })),
      api.get('/api/services', { params: { page: 0, pageSize: 1 } }).catch(() => ({ data: [] })),
      api
        .get('/api/reservations', { params: { fromDate: firstDay, toDate: lastDay } })
        .catch(() => ({ data: [] })),
      api.get('/api/reservations', { params: { status: 'PENDING' } }).catch(() => ({ data: [] })),
      api.get(`/api/income-books/month/${year}/${month}`).catch(() => ({ data: null })),
      api
        .get<{ expenses?: { totalAmount: string | number }[] }>(
          `/api/expense-books/month/${year}/${month}`,
        )
        .catch(() => ({ data: null })),
      api.get('/api/reviews/admin', { params: { approved: 'false' } }).catch(() => ({ data: [] })),
      api.get('/api/blog/admin').catch(() => ({ data: [] })),
    ])
      .then(
        ([
          usersRes,
          stylistsRes,
          servicesRes,
          resThisMonth,
          pendingRes,
          incomeRes,
          expenseBookRes,
          reviewsRes,
          blogRes,
        ]) => {
          const allReservations = asArray<RecentReservation>(resThisMonth.data)
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
            usersCount: asArray(usersRes.data).length,
            stylistsCount: catalogCount(stylistsRes.data),
            servicesCount: catalogCount(servicesRes.data),
            reservationsThisMonth: allReservations.length,
            pendingReservations: asArray(pendingRes.data).length,
            completedReservations: allReservations.filter((r) => r.status === 'COMPLETED')
              .length,
            servicesRevenueThisMonth: Number(incomeBook?.totalRevenue || 0),
            tipsThisMonth: Number(incomeBook?.totalTips || 0),
            expensesThisMonth: monthExpenses,
            pendingReviews: asArray(reviewsRes.data).length,
            blogPostsCount: asArray(blogRes.data).length,
          })

          setRecentReservations(
            [...allReservations]
              .sort(
                (a, b) =>
                  new Date(b.createdAt ?? b.reservationDate).getTime() -
                  new Date(a.createdAt ?? a.reservationDate).getTime(),
              )
              .slice(0, 8),
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

  return { stats, recentReservations, loading }
}
