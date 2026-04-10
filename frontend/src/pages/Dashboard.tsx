import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Card, CardContent } from '../components/ui/card'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import { useSocketEvent } from '../context/SocketContext'

interface DashboardStats {
  usersCount: number;
  stylistsCount: number;
  servicesCount: number;
  reservationsThisMonth: number;
  pendingReservations: number;
  completedReservations: number;
  incomeThisMonth: number;
  tipsThisMonth: number;
  expensesThisMonth: number;
  pendingReviews: number;
  blogPostsCount: number;
}

interface RecentReservation {
  id: string;
  reservationDate: string;
  startTime: string;
  status: string;
  client?: { id: string; firstName?: string | null; lastName?: string | null; username?: string };
  service?: { name: string };
}

const statusClassMap: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  STYLIST_REVIEW: 'bg-orange-100 text-orange-800 border-orange-200',
  CONFIRMED: 'bg-blue-100 text-blue-800 border-blue-200',
  ATTENDANCE_CONFIRMED: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CANCELLED_BY_CLIENT: 'bg-rose-100 text-rose-800 border-rose-200',
  CANCELLED_BY_STYLISTS: 'bg-rose-100 text-rose-800 border-rose-200',
  NO_SHOW: 'bg-slate-100 text-slate-800 border-slate-200',
}

export default function Dashboard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>(
    [],
  )
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(() => {
    setLoading(true)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`

    Promise.all([
      api.get('/api/users').catch(() => ({ data: [] })),
      api.get('/api/stylists').catch(() => ({ data: [] })),
      api.get('/api/services').catch(() => ({ data: [] })),
      api.get('/api/reservations', { params: { fromDate: firstDay, toDate: lastDay } }).catch(() => ({ data: [] })),
      api.get('/api/reservations', { params: { status: 'PENDING' } }).catch(() => ({ data: [] })),
      api.get(`/api/income-books/month/${year}/${month}`).catch(() => ({ data: null })),
      api
        .get<{ expenses?: { totalAmount: string | number }[] }>(
          `/api/expense-books/month/${year}/${month}`,
        )
        .catch(() => ({ data: null })),
      api.get('/api/reviews', { params: { approved: 'false' } }).catch(() => ({ data: [] })),
      api.get('/api/blog').catch(() => ({ data: [] })),
    ]).then(
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
        const allReservations: any[] = Array.isArray(resThisMonth.data)
          ? resThisMonth.data
          : []
        const incomeBook = incomeRes.data
        const expenseBook = expenseBookRes.data
        const bookExpenses = Array.isArray(expenseBook?.expenses)
          ? expenseBook.expenses
          : []
        const monthExpenses = bookExpenses.reduce(
          (sum, e) => sum + Number(e.totalAmount ?? 0),
          0,
        )

        setStats({
          usersCount: Array.isArray(usersRes.data) ? usersRes.data.length : 0,
          stylistsCount: Array.isArray(stylistsRes.data)
            ? stylistsRes.data.length
            : 0,
          servicesCount: Array.isArray(servicesRes.data)
            ? servicesRes.data.length
            : 0,
          reservationsThisMonth: allReservations.length,
          pendingReservations: Array.isArray(pendingRes.data)
            ? pendingRes.data.length
            : 0,
          completedReservations: allReservations.filter(
            (r: any) => r.status === 'COMPLETED',
          ).length,
          incomeThisMonth: Number(incomeBook?.totalRevenue || 0),
          tipsThisMonth: Number(incomeBook?.totalTips || 0),
          expensesThisMonth: monthExpenses,
          pendingReviews: Array.isArray(reviewsRes.data)
            ? reviewsRes.data.length
            : 0,
          blogPostsCount: Array.isArray(blogRes.data) ? blogRes.data.length : 0,
        })

        const sorted = allReservations
          .sort(
            (a: any, b: any) =>
              new Date(b.createdAt ?? b.reservationDate).getTime() -
              new Date(a.createdAt ?? a.reservationDate).getTime(),
          )
          .slice(0, 8)
        setRecentReservations(sorted)
      },
    ).finally(() => setLoading(false))
  }, []);

  useEffect(() => {
    loadData()
  }, [loadData])

  useSocketEvent('reservation:created', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:updated', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:confirmed', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:cancelled', useCallback(() => loadData(), [loadData]))

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="text-sm text-slate-600">Učitavanje…</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xl font-semibold text-slate-900">
          {t('dashboard.welcome')}, {user?.username}
        </div>
        <div className="text-slate-600 mt-1">{t('dashboard.stats')}</div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-slate-600">Korisnici</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {stats?.usersCount ?? 0}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {stats?.stylistsCount ?? 0} stilista
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-slate-600">Rezervacije (ovaj mjesec)</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {stats?.reservationsThisMonth ?? 0}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {stats?.completedReservations ?? 0} završenih |{' '}
              {stats?.pendingReservations ?? 0} na čekanju
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-emerald-700">Prihod (ovaj mjesec)</div>
            <div className="text-2xl font-semibold text-emerald-700 mt-1">
              {(stats?.incomeThisMonth ?? 0).toFixed(2)} KM
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Napojnice: {(stats?.tipsThisMonth ?? 0).toFixed(2)} KM
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-rose-700">Rashodi (ovaj mjesec)</div>
            <div className="text-2xl font-semibold text-rose-700 mt-1">
              {(stats?.expensesThisMonth ?? 0).toFixed(2)} KM
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Neto:{' '}
              {(
                (stats?.incomeThisMonth ?? 0) -
                (stats?.expensesThisMonth ?? 0)
              ).toFixed(2)}{' '}
              KM
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-slate-600">Aktivni Servisi</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {stats?.servicesCount ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-slate-600">Recenzije na čekanju</div>
            <div
              className={
                stats?.pendingReviews
                  ? 'text-2xl font-semibold text-orange-600 mt-1'
                  : 'text-2xl font-semibold text-slate-900 mt-1'
              }
            >
              {stats?.pendingReviews ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-slate-600">Blog članaka</div>
            <div className="text-2xl font-semibold text-slate-900 mt-1">
              {stats?.blogPostsCount ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardContent className="p-5">
          <div className="text-sm font-semibold text-slate-900 mb-3">
            Posljednje Rezervacije
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr className="border-b border-slate-200">
                  <th className="py-2 pr-3 font-medium">Datum</th>
                  <th className="py-2 pr-3 font-medium">Vrijeme</th>
                  <th className="py-2 pr-3 font-medium">Klijent</th>
                  <th className="py-2 pr-3 font-medium">Servis</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-slate-500">
                      Nema rezervacija.
                    </td>
                  </tr>
                ) : (
                  recentReservations.map((r) => {
                    const clientName = r.client
                      ? [r.client.firstName, r.client.lastName]
                          .filter(Boolean)
                          .join(' ') ||
                        r.client.username ||
                        `#${r.client.id.slice(0, 8)}`
                      : '-'
                    const statusClass =
                      statusClassMap[r.status] ??
                      'bg-slate-100 text-slate-800 border-slate-200'
                    return (
                      <tr key={r.id} className="border-b border-slate-100">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {String(r.reservationDate).slice(0, 10)}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {r.startTime}
                        </td>
                        <td className="py-2 pr-3">
                          {r.client ? (
                            <Link
                              to={`/admin/client-analytics?userId=${r.client.id}`}
                              className="text-brand-gold hover:underline"
                            >
                              {clientName}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-2 pr-3">{r.service?.name ?? '-'}</td>
                        <td className="py-2 pr-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusClass}`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
