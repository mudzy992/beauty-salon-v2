import { useCallback, useEffect, useState } from 'react'
import api from '../../api/client'
import { useSocketEvent } from '../../context/SocketContext'
import type { DashboardStats, RecentReservation } from './types'

const currentMonthBounds = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`
  return { year, month, firstDay, lastDay }
}

const asArray = <T,>(data: unknown): T[] => (Array.isArray(data) ? data : [])

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    const { year, month, firstDay, lastDay } = currentMonthBounds()
    Promise.all([
      api.get('/api/users').catch(() => ({ data: [] })),
      api.get('/api/stylists').catch(() => ({ data: [] })),
      api.get('/api/services').catch(() => ({ data: [] })),
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
      api.get('/api/reviews', { params: { approved: 'false' } }).catch(() => ({ data: [] })),
      api.get('/api/blog').catch(() => ({ data: [] })),
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
            stylistsCount: asArray(stylistsRes.data).length,
            servicesCount: asArray(servicesRes.data).length,
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
