import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Search,
  Star,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import api from '../api/client'
import { cn } from '../lib/cn'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import type { BadgeProps } from '../components/ui/badge'

interface UserOption {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  isActive: boolean
  createdAt: string
  userRoles?: { role: { name: string } }[]
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

interface ManualEntry {
  id: string
  date: string
  actualPrice: string | number
  tipAmount: string | number
  isManual: boolean
  notes: string | null
  status: string
  service?: { id: string; name: string; price: number | string }
  stylistProfile?: { user?: { firstName: string | null; lastName: string | null; username: string } }
}

interface ClientDebtRow {
  id: string
  amount: number | string
  createdAt: string
  status: 'OPEN' | 'SETTLED'
  service?: { id: string; name: string } | null
  reservation?: { id: string; publicReferenceCode: string; reservationDate: string; startTime: string; endTime: string } | null
  dailyLogEntry?: { id: string; date: string; reservationId: string | null; kind: 'SERVICE' | 'DEBT_PAYMENT' } | null
  manualEntry?: { id: string; date: string } | null
  stylistProfile?: { user?: { firstName: string | null; lastName: string | null; username: string } }
}

interface ClientAnalyticsData {
  fromDate: string | null
  toDate: string | null
  user: {
    id: string
    username: string
    email: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    isActive: boolean
    createdAt: string
    userRoles?: { role: { name: string } }[]
  }
  stats: {
    totalReservations: number
    completedReservations: number
    cancelledReservations: number
    noShowCount: number
    totalSpent: number
    manualEntryCount: number
    manualSpent: number
    avgServiceRating: number | null
    reviewCount: number
  }
  penalty: { cancellationCount: number; penaltyUntil: string | null; isPenalized: boolean }
  topServices: { name: string; count: number; totalSpent: number }[]
  reservations: {
    id: string
    reservationDate: string
    startTime: string
    endTime: string
    status: string
    clientNotes: string | null
    cancelReason: string | null
    cancelledAt: string | null
    service?: { id: string; name: string; price: number | string }
    confirmedStylist?: { user?: { firstName: string | null; lastName: string | null; username: string } }
  }[]
  reviews: {
    id: string
    serviceRating: number
    stylistRating: number | null
    comment: string | null
    isApproved: boolean
    createdAt: string
    service?: { name: string }
    stylist?: { user?: { firstName: string | null; lastName: string | null; username: string } }
  }[]
  manualEntries: ManualEntry[]
}

const statusBadgeVariant: Record<string, NonNullable<BadgeProps['variant']>> = {
  PENDING: 'warning',
  STYLIST_REVIEW: 'warning',
  CONFIRMED: 'secondary',
  ATTENDANCE_CONFIRMED: 'secondary',
  IN_PROGRESS: 'brand',
  COMPLETED: 'success',
  CANCELLED_BY_CLIENT: 'danger',
  CANCELLED_BY_STYLISTS: 'danger',
  NO_SHOW: 'secondary',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Na čekanju',
  STYLIST_REVIEW: 'Pregled stiliste',
  CONFIRMED: 'Potvrđeno',
  ATTENDANCE_CONFIRMED: 'Dolazak potvrđen',
  IN_PROGRESS: 'U toku',
  COMPLETED: 'Završeno',
  CANCELLED_BY_CLIENT: 'Otkazano (klijent)',
  CANCELLED_BY_STYLISTS: 'Otkazano (stilist)',
  NO_SHOW: 'Nije došao/la',
}

const roleBadgeVariant = (role: string): NonNullable<BadgeProps['variant']> => {
  if (role === 'SYSTEM_ADMIN') return 'danger'
  if (role === 'OWNER') return 'brand'
  if (role === 'STYLIST') return 'secondary'
  return 'success'
}

const PAGE_SIZE = 15

const SmallStatCard = ({
  title,
  value,
  hint,
  className,
}: {
  title: string
  value: string
  hint?: string
  className?: string
}) => (
  <Card className={cn('p-4', className)}>
    <p className="text-xs text-slate-500">{title}</p>
    <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
  </Card>
)

const StarRating = ({ rating, max = 5 }: { rating: number; max?: number }) => (
  <div className="flex items-center gap-0.5" aria-label={`Ocjena ${rating} od ${max}`}>
    {Array.from({ length: max }, (_, i) => (
      <Star
        key={i}
        className={cn('h-3.5 w-3.5', i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200 dark:text-slate-700')}
        aria-hidden="true"
      />
    ))}
  </div>
)

export default function ClientAnalytics() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState<UserOption[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams.get('userId'))
  const [analytics, setAnalytics] = useState<ClientAnalyticsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(searchParams.get('fromDate') ?? '')
  const [dateTo, setDateTo] = useState(searchParams.get('toDate') ?? '')
  const [totalUsers, setTotalUsers] = useState(0)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detailReservation, setDetailReservation] = useState<ClientAnalyticsData['reservations'][0] | null>(null)
  const [detailReview, setDetailReview] = useState<ClientAnalyticsData['reviews'][0] | null>(null)
  const [clientDebts, setClientDebts] = useState<ClientDebtRow[]>([])
  const [debtsLoading, setDebtsLoading] = useState(false)

  useEffect(() => {
    setListLoading(true)
    api
      .get<UserOption[] | PaginatedResponse<UserOption>>('/api/users', {
        params: { page, pageSize: PAGE_SIZE },
      })
      .then((r) => {
        if (Array.isArray(r.data)) {
          setUsers(r.data)
          setTotalUsers(r.data.length)
          return
        }
        setUsers(Array.isArray(r.data.items) ? r.data.items : [])
        setTotalUsers(r.data.total ?? 0)
      })
      .catch(() => {
        setUsers([])
        setTotalUsers(0)
      })
      .finally(() => setListLoading(false))
  }, [page])

  const selectUser = useCallback(
    async (userId: string, from?: string, to?: string) => {
      setSelectedUserId(userId)
      if (from) setDateFrom(from)
      if (to) setDateTo(to)
      const params: Record<string, string> = { userId }
      if (from) params.fromDate = from
      if (to) params.toDate = to
      setSearchParams(params)
      setLoading(true)
      setDebtsLoading(true)
      try {
        const queryParams = from && to ? { fromDate: from, toDate: to } : {}
        const { data } = await api.get<ClientAnalyticsData>(`/api/users/${userId}/analytics`, { params: queryParams })
        setAnalytics(data)
        const debtsRes = await api.get<ClientDebtRow[]>('/api/client-debts', { params: { clientId: userId } })
        setClientDebts(Array.isArray(debtsRes.data) ? debtsRes.data : [])
      } catch {
        toast.error('Greška pri učitavanju analitike')
        setAnalytics(null)
        setClientDebts([])
      } finally {
        setLoading(false)
        setDebtsLoading(false)
      }
    },
    [setSearchParams],
  )

  useEffect(() => {
    const uid = searchParams.get('userId')
    const from = searchParams.get('fromDate') ?? undefined
    const to = searchParams.get('toDate') ?? undefined
    if (uid && !analytics) void selectUser(uid, from, to)
  }, [analytics, searchParams, selectUser])

  const filteredUsers = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.firstName?.toLowerCase().includes(q) ?? false) ||
        (u.lastName?.toLowerCase().includes(q) ?? false) ||
        (u.email?.toLowerCase().includes(q) ?? false) ||
        (u.phone?.includes(q) ?? false),
    )
  }, [users, search])

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE))

  useEffect(() => {
    setPage(0)
  }, [search])

  const applyDateFilter = () => {
    if (selectedUserId && dateFrom && dateTo) void selectUser(selectedUserId, dateFrom, dateTo)
  }

  const clearDateFilter = () => {
    setDateFrom('')
    setDateTo('')
    if (selectedUserId) void selectUser(selectedUserId)
  }

  const goBack = () => {
    setSelectedUserId(null)
    setAnalytics(null)
    setSearchParams({})
  }

  const openReservationDetail = (r: ClientAnalyticsData['reservations'][0]) => {
    setDetailReservation(r)
    setDetailReview(null)
    setDetailOpen(true)
  }

  const openReviewDetail = (r: ClientAnalyticsData['reviews'][0]) => {
    setDetailReview(r)
    setDetailReservation(null)
    setDetailOpen(true)
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailReservation(null)
    setDetailReview(null)
  }

  const getStylistName = (s?: { user?: { firstName: string | null; lastName: string | null; username: string } }) => {
    if (!s?.user) return '-'
    return `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.username
  }

  const getUserName = (u: { firstName: string | null; lastName: string | null; username: string }) =>
    [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username

  if (!selectedUserId) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-50">Analitika Klijenata</h1>

        <div className="relative mb-4 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretražite po imenu, emailu, telefonu..."
            className="pl-9"
          />
        </div>

        <Card className="overflow-hidden">
          {listLoading ? (
            <div className="flex justify-center p-10 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="py-3 pl-4 pr-3 font-medium">Ime i Prezime</th>
                    <th className="py-3 pr-3 font-medium">Email</th>
                    <th className="py-3 pr-3 font-medium">Telefon</th>
                    <th className="py-3 pr-3 font-medium">Uloge</th>
                    <th className="py-3 pr-3 font-medium">Status</th>
                    <th className="py-3 pr-3 font-medium">Registrovan</th>
                    <th className="py-3 pr-4 text-right font-medium">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-slate-500">
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/40">
                        <td className="py-3 pl-4 pr-3 font-medium text-slate-900 dark:text-slate-50">{getUserName(u)}</td>
                        <td className="py-3 pr-3 text-slate-700 dark:text-slate-200">{u.email ?? '-'}</td>
                        <td className="py-3 pr-3 text-slate-700 dark:text-slate-200">{u.phone ?? '-'}</td>
                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap gap-1">
                            {u.userRoles?.map((r) => (
                              <Badge key={r.role.name} variant={roleBadgeVariant(r.role.name)} className="text-[10px]">
                                {r.role.name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 pr-3">
                          <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
                            {u.isActive ? 'Aktivan' : 'Neaktivan'}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString('bs-BA')}</td>
                        <td className="py-3 pr-4 text-right">
                          <Button type="button" size="sm" variant="outline" onClick={() => void selectUser(u.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Analitika
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {totalPages > 1 ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {totalUsers} korisnika ukupno
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" size="icon" variant="outline" aria-label="Prethodna" disabled={page === 0} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {page + 1} / {totalPages}
              </p>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label="Sljedeća"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div>
      <Button type="button" variant="ghost" className="mb-4" onClick={goBack}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Nazad na listu
      </Button>

      {loading ? (
        <div className="flex justify-center py-10 text-slate-500">
          <Loader2 className="h-10 w-10 animate-spin" aria-hidden="true" />
        </div>
      ) : null}

      {analytics && !loading ? (
        <div className="space-y-6">
          <div className="flex flex-col flex-wrap gap-3 md:flex-row md:items-end">
            <div className="w-full md:w-auto">
              <Label htmlFor="client-from" className="text-sm">
                Od datuma
              </Label>
              <Input id="client-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 md:max-w-[160px]" />
            </div>
            <div className="w-full md:w-auto">
              <Label htmlFor="client-to" className="text-sm">
                Do datuma
              </Label>
              <Input id="client-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 md:max-w-[160px]" />
            </div>
            <Button type="button" size="sm" onClick={applyDateFilter} disabled={!dateFrom || !dateTo} className="md:mb-0.5">
              Primijeni period
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={clearDateFilter} className="md:mb-0.5">
              Cijeli period
            </Button>
            {analytics.fromDate || analytics.toDate ? (
              <p className="pb-1 text-sm text-slate-500 md:self-center">
                Prikaz: {analytics.fromDate} – {analytics.toDate}
              </p>
            ) : null}
          </div>

          <Card className="p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{getUserName(analytics.user)}</h2>
                <p className="text-sm text-slate-500">{analytics.user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-500">Telefon: {analytics.user.phone ?? '-'}</p>
                  <Badge variant={analytics.user.isActive ? 'success' : 'danger'} className="text-[10px]">
                    {analytics.user.isActive ? 'Aktivan' : 'Neaktivan'}
                  </Badge>
                  {analytics.user.userRoles?.map((r) => (
                    <Badge key={r.role.name} variant="secondary" className="text-[10px]">
                      {r.role.name}
                    </Badge>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">Registrovan: {new Date(analytics.user.createdAt).toLocaleDateString('bs-BA')}</p>
              </div>

              {analytics.penalty.isPenalized ? (
                <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/30">
                  <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-200">
                    <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                    PENALIZIRAN
                  </div>
                  <p className="mt-1 text-sm text-rose-600 dark:text-rose-200">
                    Do: {analytics.penalty.penaltyUntil ? new Date(analytics.penalty.penaltyUntil).toLocaleDateString('bs-BA') : '-'}
                  </p>
                </Card>
              ) : null}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            <SmallStatCard
              title="Rezervacije"
              value={String(analytics.stats.totalReservations)}
              hint={`${analytics.stats.completedReservations} završenih`}
            />
            <SmallStatCard
              title="Otkazane / No-show"
              value={`${analytics.stats.cancelledReservations} / ${analytics.stats.noShowCount}`}
              className="border-rose-100 dark:border-rose-900/30"
            />
            <SmallStatCard
              title="Manuelni unosi"
              value={String(analytics.stats.manualEntryCount)}
              hint={`${Number(analytics.stats.manualSpent).toFixed(2)} KM`}
            />
            <SmallStatCard
              title="Ukupno potrošeno"
              value={`${Number(analytics.stats.totalSpent).toFixed(2)} KM`}
              hint="rezervacije + manuelno"
            />
            <SmallStatCard
              title="Penali"
              value={`${analytics.penalty.cancellationCount} otkazivanja`}
              hint={analytics.penalty.isPenalized ? 'Penaliziran' : 'OK'}
              className={analytics.penalty.isPenalized ? 'border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20' : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <SmallStatCard
              title="Prosječna ocjena"
              value={analytics.stats.avgServiceRating != null ? String(analytics.stats.avgServiceRating) : '-'}
              hint={`od ${analytics.stats.reviewCount} recenzija`}
            />
            {analytics.stats.totalReservations > 0 ? (
              <Card className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Stopa završavanja</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {Math.round((analytics.stats.completedReservations / analytics.stats.totalReservations) * 100)}%
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-md bg-emerald-500"
                    style={{ width: `${(analytics.stats.completedReservations / analytics.stats.totalReservations) * 100}%` }}
                  />
                </div>
              </Card>
            ) : null}
          </div>

          {analytics.topServices.length > 0 ? (
            <Card className="p-5">
              <p className="mb-3 font-semibold text-slate-900 dark:text-slate-50">Najčešći servisi</p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                      <th className="py-2 pr-3 font-medium">Servis</th>
                      <th className="py-2 pr-3 text-right font-medium">Broj posjeta</th>
                      <th className="py-2 text-right font-medium">Ukupno (KM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topServices.map((s, i) => (
                      <tr key={`${s.name}-${i}`} className="border-b border-slate-100 dark:border-slate-800/80">
                        <td className="py-2 pr-3 font-medium">{s.name}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{s.count}</td>
                        <td className="py-2 text-right tabular-nums">{s.totalSpent.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          <Tabs defaultValue="reservations">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
              <TabsTrigger value="reservations">Rezervacije ({analytics.reservations.length})</TabsTrigger>
              <TabsTrigger value="manual">Manuelni prihodi ({analytics.manualEntries.length})</TabsTrigger>
              <TabsTrigger value="debts">Dugovanja ({clientDebts.length})</TabsTrigger>
              <TabsTrigger value="reviews">Recenzije ({analytics.reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="reservations" className="mt-4">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                        <th className="py-3 pl-4 pr-3 font-medium">Datum</th>
                        <th className="py-3 pr-3 font-medium">Vrijeme</th>
                        <th className="py-3 pr-3 font-medium">Servis</th>
                        <th className="py-3 pr-3 font-medium">Stilista</th>
                        <th className="py-3 pr-3 text-right font-medium">Cijena</th>
                        <th className="py-3 pr-3 font-medium">Status</th>
                        <th className="py-3 pr-4 text-right font-medium">Detalji</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.reservations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-slate-500">
                            {t('common.noData')}
                          </td>
                        </tr>
                      ) : (
                        analytics.reservations.map((r) => (
                          <tr
                            key={r.id}
                            className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                            onClick={() => openReservationDetail(r)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                openReservationDetail(r)
                              }
                            }}
                            tabIndex={0}
                          >
                            <td className="py-3 pl-4 pr-3">{r.reservationDate?.slice(0, 10)}</td>
                            <td className="py-3 pr-3">
                              {r.startTime} - {r.endTime}
                            </td>
                            <td className="py-3 pr-3">{r.service?.name ?? '-'}</td>
                            <td className="py-3 pr-3">{getStylistName(r.confirmedStylist)}</td>
                            <td className="py-3 pr-3 text-right tabular-nums">{Number(r.service?.price ?? 0).toFixed(2)}</td>
                            <td className="py-3 pr-3">
                              <Badge variant={statusBadgeVariant[r.status] ?? 'secondary'} className="text-[10px]">
                                {statusLabels[r.status] ?? r.status}
                              </Badge>
                            </td>
                            <td className="py-3 pr-4 text-right">
                              <Button type="button" size="icon" variant="ghost" aria-label="Detalji" onClick={(e) => {
                                e.stopPropagation()
                                openReservationDetail(r)
                              }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                        <th className="py-3 pl-4 pr-3 font-medium">Datum</th>
                        <th className="py-3 pr-3 font-medium">Servis</th>
                        <th className="py-3 pr-3 font-medium">Stilista</th>
                        <th className="py-3 pr-3 text-right font-medium">Cijena (KM)</th>
                        <th className="py-3 pr-3 text-right font-medium">Napojnica (KM)</th>
                        <th className="py-3 pr-3 font-medium">Izvor</th>
                        <th className="py-3 pr-4 font-medium">Bilješka</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.manualEntries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-slate-500">
                            {t('common.noData')}
                          </td>
                        </tr>
                      ) : (
                        analytics.manualEntries.map((e) => (
                          <tr key={e.id} className="border-b border-slate-100 dark:border-slate-800/80">
                            <td className="py-3 pl-4 pr-3">{typeof e.date === 'string' ? e.date.slice(0, 10) : '-'}</td>
                            <td className="py-3 pr-3">{e.service?.name ?? '-'}</td>
                            <td className="py-3 pr-3">{getStylistName(e.stylistProfile)}</td>
                            <td className="py-3 pr-3 text-right font-medium tabular-nums">{Number(e.actualPrice).toFixed(2)}</td>
                            <td className="py-3 pr-3 text-right tabular-nums">{Number(e.tipAmount).toFixed(2)}</td>
                            <td className="py-3 pr-3">
                              <Badge variant={e.isManual ? 'brand' : 'secondary'} className="text-[10px]">
                                {e.isManual ? 'Manuelno' : 'Rezervacija'}
                              </Badge>
                            </td>
                            <td className="max-w-xs py-3 pr-4">
                              <p className="truncate text-xs text-slate-600 dark:text-slate-300">{e.notes ?? '-'}</p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="mt-4">
              {analytics.reviews.length === 0 ? (
                <p className="text-sm text-slate-500">{t('common.noData')}</p>
              ) : (
                <div className="space-y-3">
                  {analytics.reviews.map((r) => (
                    <Card
                      key={r.id}
                      className="cursor-pointer p-4 transition-shadow hover:shadow-md"
                      onClick={() => openReviewDetail(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openReviewDetail(r)
                        }
                      }}
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-900 dark:text-slate-50">{r.service?.name ?? '-'}</p>
                            <Badge variant={r.isApproved ? 'success' : 'warning'} className="text-[10px]">
                              {r.isApproved ? 'Odobreno' : 'Na čekanju'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs text-slate-500">Servis:</p>
                            <StarRating rating={r.serviceRating} />
                            {r.stylistRating != null ? (
                              <>
                                <p className="ml-2 text-xs text-slate-500">Stilista:</p>
                                <StarRating rating={r.stylistRating} />
                              </>
                            ) : null}
                          </div>
                          {r.comment ? (
                            <p className="mt-2 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString('bs-BA')}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="debts" className="mt-4">
              <Card className="p-4">
                {debtsLoading ? (
                  <p className="text-sm text-slate-500">Učitavanje…</p>
                ) : clientDebts.length === 0 ? (
                  <p className="text-sm text-slate-500">{t('common.noData')}</p>
                ) : (
                  <div className="grid gap-2">
                    {clientDebts.map((d) => {
                      const stylistName = d.stylistProfile?.user
                        ? `${d.stylistProfile.user.firstName ?? ''} ${d.stylistProfile.user.lastName ?? ''}`.trim() || d.stylistProfile.user.username
                        : '—'
                      const ref =
                        d.reservation?.publicReferenceCode
                          ? `Rezervacija: ${d.reservation.publicReferenceCode}`
                          : d.dailyLogEntry?.id
                            ? `Daily log: ${d.dailyLogEntry.date.slice(0, 10)}`
                            : d.manualEntry?.id
                              ? `Manual entry: ${d.manualEntry.date.slice(0, 10)}`
                              : '—'
                      return (
                        <div
                          key={d.id}
                          className="rounded-md border border-slate-200 dark:border-slate-800 p-3 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                              {d.service?.name ?? 'Dug'} · {Number(d.amount).toFixed(2)} KM
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              <span className="font-semibold">Stilist:</span> {stylistName} · {ref}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{d.createdAt.slice(0, 10)}</p>
                          </div>
                          <Badge variant={d.status === 'OPEN' ? 'warning' : 'success'} className="text-[10px]">
                            {d.status === 'OPEN' ? 'Otvoren' : 'Zatvoren'}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetail()
        }}
      >
        <DialogContent className="max-w-2xl">
          {detailReservation ? (
            <>
              <DialogHeader>
                <DialogTitle>Detalji Rezervacije</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Datum</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{detailReservation.reservationDate?.slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Vrijeme</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    {detailReservation.startTime} - {detailReservation.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Servis</p>
                  <p className="text-slate-800 dark:text-slate-100">{detailReservation.service?.name ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Cijena</p>
                  <p className="text-slate-800 dark:text-slate-100">{Number(detailReservation.service?.price ?? 0).toFixed(2)} KM</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Stilista</p>
                  <p className="text-slate-800 dark:text-slate-100">{getStylistName(detailReservation.confirmedStylist)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <Badge variant={statusBadgeVariant[detailReservation.status] ?? 'secondary'} className="text-[10px]">
                    {statusLabels[detailReservation.status] ?? detailReservation.status}
                  </Badge>
                </div>
                {detailReservation.clientNotes ? (
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-500">Bilješke klijenta</p>
                    <p className="text-slate-800 dark:text-slate-100">{detailReservation.clientNotes}</p>
                  </div>
                ) : null}
                {detailReservation.cancelReason ? (
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-500">Razlog otkazivanja</p>
                    <p className="text-rose-600">{detailReservation.cancelReason}</p>
                  </div>
                ) : null}
                {detailReservation.cancelledAt ? (
                  <div>
                    <p className="text-xs text-slate-500">Otkazano</p>
                    <p className="text-slate-800 dark:text-slate-100">
                      {new Date(detailReservation.cancelledAt).toLocaleDateString('bs-BA')}
                    </p>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          {detailReview ? (
            <>
              <DialogHeader>
                <DialogTitle>Detalji Recenzije</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Servis</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-50">{detailReview.service?.name ?? '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Stilista</p>
                  <p className="text-slate-800 dark:text-slate-100">{getStylistName(detailReview.stylist)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ocjena servisa</p>
                  <div className="flex items-center gap-2">
                    <StarRating rating={detailReview.serviceRating} />
                    <p className="text-sm text-slate-700 dark:text-slate-200">{detailReview.serviceRating}/5</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ocjena stiliste</p>
                  {detailReview.stylistRating != null ? (
                    <div className="flex items-center gap-2">
                      <StarRating rating={detailReview.stylistRating} />
                      <p className="text-sm text-slate-700 dark:text-slate-200">{detailReview.stylistRating}/5</p>
                    </div>
                  ) : (
                    <p className="text-slate-800 dark:text-slate-100">-</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <Badge variant={detailReview.isApproved ? 'success' : 'warning'} className="text-[10px]">
                    {detailReview.isApproved ? 'Odobreno' : 'Na čekanju'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Datum</p>
                  <p className="text-slate-800 dark:text-slate-100">{new Date(detailReview.createdAt).toLocaleDateString('bs-BA')}</p>
                </div>
                {detailReview.comment ? (
                  <div className="md:col-span-2">
                    <p className="text-xs text-slate-500">Komentar</p>
                    <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-800 dark:bg-slate-900/40 dark:text-slate-100">
                      {detailReview.comment}
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
