import { useCallback, useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Eye, Loader2 } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { useSocketEvent } from '../context/SocketContext'
import { useAppToast } from '../lib/toast/useAppToast'
import { getCalendarMonthRange } from '../lib/date-range'
import {
  ReservationFilters,
  resetReservationFilters,
} from '../features/reservations/components/reservation-filters'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Textarea } from '../components/ui/textarea'

interface ReservationClient {
  id: string
  firstName?: string | null
  lastName?: string | null
  username?: string
  email?: string
  phone?: string | null
}

interface ReservationService {
  id: string
  name: string
  durationMinutes: number
  price: number | string
}

interface ReservationServiceItem {
  id: string
  sortOrder: number
  serviceId: string
  service?: ReservationService
}

interface Reservation {
  id: string
  reservationDate: string
  startTime: string
  endTime: string
  status: string
  clientNotes: string | null
  cancelReason: string | null
  createdAt: string
  client?: ReservationClient
  service?: ReservationService
  items?: ReservationServiceItem[]
  confirmedStylist?: { id: string; user?: { username: string; firstName: string | null; lastName: string | null } }
  stylistResponses?: {
    id: string
    status: string
    rejectionReason: string | null
    stylistProfile?: { user?: { username: string } }
  }[]
  loyaltyDiscountPercent?: number
  loyaltyDiscountAmount?: number | string
  loyaltyPointsUsed?: number
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

const STATUS_OPTIONS = [
  { value: '', label: 'Svi statusi' },
  { value: 'PENDING', label: 'Na čekanju' },
  { value: 'STYLIST_REVIEW', label: 'Pregled stiliste' },
  { value: 'CONFIRMED', label: 'Potvrđena' },
  { value: 'ATTENDANCE_CONFIRMED', label: 'Dolazak potvrđen' },
  { value: 'IN_PROGRESS', label: 'U toku' },
  { value: 'COMPLETED', label: 'Završena' },
  { value: 'CANCELLED_BY_CLIENT', label: 'Otkazao klijent' },
  { value: 'CANCELLED_BY_STYLISTS', label: 'Otkazali stilisti' },
  { value: 'NO_SHOW', label: 'Nije došao' },
] as const

const getStatusLabel = (status: string) =>
  STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status

const getStatusBadgeVariant = (status: string) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'CONFIRMED' || status === 'ATTENDANCE_CONFIRMED') return 'brand'
  if (status === 'IN_PROGRESS') return 'secondary'
  if (status === 'PENDING' || status === 'STYLIST_REVIEW') return 'warning'
  if (status === 'CANCELLED_BY_CLIENT' || status === 'CANCELLED_BY_STYLISTS' || status === 'NO_SHOW') return 'danger'
  return 'secondary'
}

const canCancel = (status: string) =>
  ['PENDING', 'STYLIST_REVIEW', 'CONFIRMED', 'ATTENDANCE_CONFIRMED'].includes(status)

const getClientName = (c?: ReservationClient) => {
  if (!c) return '-'
  return (`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.username || '-') as string
}

const getStylistName = (s?: Reservation['confirmedStylist']) => {
  if (!s?.user) return 'Nije potvrđen'
  return `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.username || 'Stilista'
}

export default function Reservations() {
  const { t } = useTranslation()
  const { success, error } = useAppToast()

  const [items, setItems] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)

  const initialRange = getCalendarMonthRange()
  const [fromDate, setFromDate] = useState(initialRange.fromDate)
  const [toDate, setToDate] = useState(initialRange.toDate)
  const [statusFilter, setStatusFilter] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('')

  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Reservation | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedClientSearch(clientSearch.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [clientSearch])

  const loadData = useCallback(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (fromDate) params.fromDate = fromDate
    if (toDate) params.toDate = toDate
    if (statusFilter) params.status = statusFilter
    if (debouncedClientSearch) params.clientSearch = debouncedClientSearch
    params.page = String(page)
    params.pageSize = String(pageSize)
    api
      .get<Reservation[] | PaginatedResponse<Reservation>>('/api/reservations', { params })
      .then((r) => {
        if (Array.isArray(r.data)) {
          setItems(r.data)
          setTotal(r.data.length)
          return
        }
        setItems(Array.isArray(r.data.items) ? r.data.items : [])
        setTotal(r.data.total ?? 0)
      })
      .catch(() => {
        setItems([])
        setTotal(0)
      })
      .finally(() => setLoading(false))
  }, [fromDate, toDate, statusFilter, debouncedClientSearch, page, pageSize])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setPage(0)
  }, [fromDate, toDate, statusFilter, debouncedClientSearch])

  useSocketEvent('reservation:created', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:updated', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:cancelled', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:confirmed', useCallback(() => loadData(), [loadData]))
  useSocketEvent('reservation:stylist_response', useCallback(() => loadData(), [loadData]))

  const openDetail = async (r: Reservation) => {
    try {
      const { data } = await api.get<Reservation>(`/api/reservations/${r.id}`)
      setDetail(data)
    } catch {
      setDetail(r)
    }
    setCancelReason('')
    setOpen(true)
  }

  const handleCancel = async () => {
    if (!detail) return
    setCancelling(true)
    try {
      await api.post(`/api/reservations/${detail.id}/admin-cancel`, { cancelReason: cancelReason || undefined })
      success('Rezervacija otkazana')
      loadData()
      setOpen(false)
    } catch (err) {
      error(getErrorMessage(err, 'Greška pri otkazivanju'))
    } finally {
      setCancelling(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const serviceSummary = (r: Reservation) => {
    const items = Array.isArray(r.items) ? r.items : []
    if (items.length > 0) {
      const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      const firstName = sorted[0]?.service?.name ?? 'Servis'
      const rest = sorted.length - 1
      return rest > 0 ? `${firstName} (+${rest})` : firstName
    }
    return r.service?.name ?? '-'
  }

  const getServicesTotals = (r: Reservation) => {
    const items = Array.isArray(r.items) ? r.items : []
    if (items.length > 0) {
      const totalMinutes = items.reduce((acc, it) => acc + Number(it.service?.durationMinutes ?? 0), 0)
      const totalPrice = items.reduce((acc, it) => acc + Number(it.service?.price ?? 0), 0)
      return { totalMinutes, totalPrice }
    }
    return {
      totalMinutes: Number(r.service?.durationMinutes ?? 0),
      totalPrice: Number(r.service?.price ?? 0),
    }
  }

  const priceBlock = (r: Reservation) => {
    const { totalPrice } = getServicesTotals(r)
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) return '-'
    const base = totalPrice
    const pct = Number(r.loyaltyDiscountPercent ?? 0)
    const amt = Number(r.loyaltyDiscountAmount ?? 0)
    if (pct > 0 && amt > 0) {
      const final = base - amt
      return (
        <div className="text-right">
          <p className="font-medium text-slate-900 dark:text-slate-50">{base.toFixed(2)} KM</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">
            -{pct}% ({amt.toFixed(2)} KM) → <span className="font-semibold">{final.toFixed(2)} KM</span>
          </p>
        </div>
      )
    }
    return <span className="font-medium text-slate-900 dark:text-slate-50">{base.toFixed(2)} KM</span>
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {t('nav.reservations')}
        </h1>
        <Button asChild type="button" variant="outline">
          <RouterLink to="/admin/reservations/calendar">
            <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
            Kalendar
          </RouterLink>
        </Button>
      </div>

      <Card className="mb-4">
        <div className="p-4">
          <ReservationFilters
            fromDate={fromDate}
            toDate={toDate}
            statusFilter={statusFilter}
            clientSearch={clientSearch}
            statusOptions={STATUS_OPTIONS}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onStatusChange={setStatusFilter}
            onClientSearchChange={setClientSearch}
            onReset={() => {
              const next = resetReservationFilters()
              setFromDate(next.fromDate)
              setToDate(next.toDate)
              setStatusFilter(next.statusFilter)
              setClientSearch(next.clientSearch)
            }}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-10 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 p-3 lg:hidden">
              {items.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">{t('common.noData')}</p>
              ) : (
                items.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full rounded-md border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900/40"
                    onClick={() => void openDetail(r)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-50">{String(r.reservationDate).slice(0, 10)}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {r.startTime} - {r.endTime}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(r.status)} className="text-[10px]">
                        {getStatusLabel(r.status)}
                      </Badge>
                    </div>
                  <p className="mt-2 text-sm text-slate-900 dark:text-slate-50">{serviceSummary(r)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">{getClientName(r.client)}</p>
                  </button>
                ))
              )}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-3 font-medium">Datum</th>
                    <th className="p-3 font-medium">Vrijeme</th>
                    <th className="p-3 font-medium">Klijent</th>
                    <th className="p-3 font-medium">Servis</th>
                    <th className="p-3 font-medium text-right">Cijena / Loyalty</th>
                    <th className="p-3 font-medium">Stilista</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-slate-500">
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/80 dark:hover:bg-slate-900/40"
                        onClick={() => void openDetail(r)}
                      >
                        <td className="p-3">{String(r.reservationDate).slice(0, 10)}</td>
                        <td className="p-3">
                          {r.startTime} – {r.endTime}
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          {r.client ? (
                            <RouterLink
                              to={`/admin/client-analytics?userId=${r.client.id}`}
                              className="font-medium text-brand-gold hover:underline"
                            >
                              {getClientName(r.client)}
                            </RouterLink>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3">{serviceSummary(r)}</td>
                        <td className="p-3 text-right">{priceBlock(r)}</td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          {r.confirmedStylist ? (
                            <RouterLink
                              to={`/admin/stylist-analytics?stylistId=${r.confirmedStylist.id}`}
                              className="text-brand-gold hover:underline"
                            >
                              {getStylistName(r.confirmedStylist)}
                            </RouterLink>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant={getStatusBadgeVariant(r.status)} className="text-[10px]">
                            {getStatusLabel(r.status)}
                          </Badge>
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Detalji" onClick={() => void openDetail(r)}>
                            <Eye className="h-4 w-4 text-blue-600" aria-hidden="true" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Ukupno: {total}</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Prethodna
          </Button>
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {page + 1} / {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Sljedeća
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalji rezervacije</DialogTitle>
          </DialogHeader>

          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-900 dark:text-slate-50">Status</p>
                <Badge variant={getStatusBadgeVariant(detail.status)} className="px-3 py-1 text-sm">
                  {getStatusLabel(detail.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Datum</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{String(detail.reservationDate).slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Vrijeme</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">
                    {detail.startTime} – {detail.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Kreirano</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{new Date(detail.createdAt).toLocaleString('bs-BA')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">Klijent</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{getClientName(detail.client)}</p>
                  {detail.client?.phone ? <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tel: {detail.client.phone}</p> : null}
                </div>
                <div>
                  <p className="text-xs text-slate-500">Potvrđeni stilista</p>
                  <p className="font-medium text-slate-900 dark:text-slate-50">{getStylistName(detail.confirmedStylist)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">Servis</p>
                {detail.items && detail.items.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {[...detail.items]
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      .map((it) => (
                        <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/30">
                          <p className="font-medium text-slate-900 dark:text-slate-50">{it.service?.name ?? '-'}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {Number(it.service?.durationMinutes ?? 0)} min | {Number(it.service?.price ?? 0).toFixed(2)} KM
                          </p>
                        </div>
                      ))}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
                      <p className="font-medium text-slate-900 dark:text-slate-50">Ukupno</p>
                      <p className="text-slate-700 dark:text-slate-300">
                        {getServicesTotals(detail).totalMinutes} min | {getServicesTotals(detail).totalPrice.toFixed(2)} KM
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{detail.service?.name ?? '-'}</p>
                    {detail.service ? (
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {detail.service.durationMinutes} min | {Number(detail.service.price).toFixed(2)} KM
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              {detail.clientNotes ? (
                <div>
                  <p className="text-xs text-slate-500">Napomena klijenta</p>
                  <p className="mt-1 whitespace-pre-wrap text-slate-900 dark:text-slate-50">{detail.clientNotes}</p>
                </div>
              ) : null}

              {detail.cancelReason ? (
                <div>
                  <p className="text-xs text-slate-500">Razlog otkazivanja</p>
                  <p className="mt-1 whitespace-pre-wrap text-rose-700 dark:text-rose-300">{detail.cancelReason}</p>
                </div>
              ) : null}

              {detail.stylistResponses && detail.stylistResponses.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Odgovori stilista</p>
                  <div className="mt-2 space-y-2">
                    {detail.stylistResponses.map((sr) => (
                      <div key={sr.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/30">
                        <p className="text-sm text-slate-900 dark:text-slate-50">{sr.stylistProfile?.user?.username ?? '-'}</p>
                        <Badge
                          variant={
                            sr.status === 'ACCEPTED'
                              ? 'success'
                              : sr.status === 'REJECTED'
                                ? 'danger'
                                : sr.status === 'LOCKED'
                                  ? 'warning'
                                  : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {sr.status}
                        </Badge>
                        {sr.rejectionReason ? <p className="text-xs text-slate-500">{sr.rejectionReason}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {canCancel(detail.status) ? (
                <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Otkaži rezervaciju</p>
                  <p className="mt-1 text-xs text-slate-500">Otkazivanje je dozvoljeno za ovu fazu.</p>
                  <div className="mt-3 space-y-2">
                    <Textarea
                      placeholder="Razlog otkazivanja (opciono)"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
                        onClick={() => void handleCancel()}
                        disabled={cancelling}
                      >
                        {cancelling ? 'Otkazivanje...' : 'Otkaži rezervaciju'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Zatvori
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
