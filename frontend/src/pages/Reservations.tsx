import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Eye, Loader2 } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { resolveAdminApiError } from '../features/admin/admin-api-error.mjs'
import { useReservationSocketRefresh } from '../features/reservations/use-reservation-socket-refresh'
import { useAppToast } from '../lib/toast/useAppToast'
import { formatLocalizedAmount, formatLocalizedDateTime } from '../i18n/locale-utils.mjs'
import { getCalendarMonthRange } from '../lib/date-range'
import {
  ReservationFilters,
  resetReservationFilters,
} from '../features/reservations/components/reservation-filters'
import {
  RESERVATION_STATUS_OPTIONS,
  canAdminCancelReservation,
  canAdminConfirmAttendance,
  getReservationStatusLabel,
} from '../features/reservations/status'

import { Badge } from '../components/ui/badge'
import { PageHeader } from '../features/shell/admin/ui/page-header'
import { StatusBadge } from '../features/shell/admin/ui/status-badge'
import { reservationStatusDescriptor } from '../features/reservations/reservation-status-view'
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
  attendancePolicy?: 'CLIENT_REQUIRED' | 'STAFF_WAIVED'
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

const getClientName = (c?: ReservationClient) => {
  if (!c) return '-'
  return (`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.username || '-') as string
}

export default function Reservations() {
  const { t, i18n } = useTranslation()
  const { success, error } = useAppToast()

  const getLocalizedReservationStatusLabel = (status: string, cancelReason?: string | null) => {
    const statusKey =
      status === 'CANCELLED_BY_CLIENT' &&
      (cancelReason ?? '').trim() === 'Nije potvrđen dolazak u roku'
        ? 'reservations.statuses.CANCELLED_UNCONFIRMED_ATTENDANCE'
        : `reservations.statuses.${status}`
    return t(statusKey, { defaultValue: getReservationStatusLabel(status, cancelReason) })
  }
  const getListStylistName = (stylist?: Reservation['confirmedStylist']) => {
    if (!stylist?.user) return t('reservations.adminList.unconfirmedStylist')
    return (
      `${stylist.user.firstName ?? ''} ${stylist.user.lastName ?? ''}`.trim() ||
      stylist.user.username ||
      t('reservations.adminList.stylistFallback')
    )
  }

  const [items, setItems] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const requestSequenceRef = useRef(0)
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
  // 3.3.2 — hookovi moraju biti iznad svakog early return-a (React #310).
  const cancelTitleId = useId()
  const cancelHelpId = useId()
  const [cancelling, setCancelling] = useState(false)
  const [confirmingAttendance, setConfirmingAttendance] = useState(false)
  /** WCAG 4.1.3 — realtime osvježavanje ne smije tiho zamijeniti podatke. */
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedClientSearch(clientSearch.trim()), 300)
    return () => window.clearTimeout(timer)
  }, [clientSearch])

  const loadData = useCallback(() => {
    const requestSequence = ++requestSequenceRef.current
    setLoading(true)
    setLoadError(false)
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
        if (requestSequence !== requestSequenceRef.current) return
        if (Array.isArray(r.data)) {
          setItems(r.data)
          setTotal(r.data.length)
          return
        }
        setItems(Array.isArray(r.data.items) ? r.data.items : [])
        setTotal(r.data.total ?? 0)
      })
      .catch(() => {
        if (requestSequence !== requestSequenceRef.current) return
        setLoadError(true)
      })
      .finally(() => {
        if (requestSequence === requestSequenceRef.current) setLoading(false)
      })
  }, [fromDate, toDate, statusFilter, debouncedClientSearch, page, pageSize])

  useEffect(() => {
    loadData()
    return () => {
      requestSequenceRef.current += 1
    }
  }, [loadData])

  useEffect(() => {
    setPage(0)
  }, [fromDate, toDate, statusFilter, debouncedClientSearch])

  const handleSocketRefresh = useCallback(() => {
    loadData()
    setRefreshNotice(
      t('reservations.adminList.autoRefreshed', {
        time: new Date().toLocaleTimeString(i18n.language),
      }),
    )
  }, [loadData, t, i18n.language])

  useReservationSocketRefresh(handleSocketRefresh)

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

  const handleStaffConfirmAttendance = async () => {
    if (!detail) return
    setConfirmingAttendance(true)
    try {
      await api.post(`/api/reservations/${detail.id}/staff-confirm-attendance`)
      success(t('reservations.adminDetail.attendanceConfirmed'))
      loadData()
      const { data } = await api.get<Reservation>(`/api/reservations/${detail.id}`)
      setDetail(data)
    } catch (err) {
      const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'reservations.adminDetail.attendanceConfirmError')
      error(t(apiErr.key, apiErr.values))
    } finally {
      setConfirmingAttendance(false)
    }
  }

  const handleCancel = async () => {
    if (!detail) return
    setCancelling(true)
    try {
      await api.post(`/api/reservations/${detail.id}/admin-cancel`, { cancelReason: cancelReason || undefined })
      success(t('reservations.adminDetail.cancelled'))
      loadData()
      setOpen(false)
    } catch (err) {
      const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'reservations.adminDetail.cancelError')
      error(t(apiErr.key, apiErr.values))
    } finally {
      setCancelling(false)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const serviceSummary = (r: Reservation) => {
    const items = Array.isArray(r.items) ? r.items : []
    if (items.length > 0) {
      const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      const firstName = sorted[0]?.service?.name ?? t('reservations.adminList.serviceFallback')
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
          <p className="font-medium text-content">{formatLocalizedAmount(base, i18n.language)}</p>
          <p className="text-xs text-ok-foreground">
            -{pct}% ({formatLocalizedAmount(amt, i18n.language)}) →{' '}
            <span className="font-semibold">{formatLocalizedAmount(final, i18n.language)}</span>
          </p>
        </div>
      )
    }
    return <span className="font-medium text-content">{formatLocalizedAmount(base, i18n.language)}</span>
  }

  return (
    <div>
      <PageHeader
        title={t('nav.reservations')}
        actions={
          <Button asChild type="button" variant="outline">
            <RouterLink to="/admin/reservations/calendar">
              <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('reservations.adminList.calendar')}
            </RouterLink>
          </Button>
        }
      />

      <p role="status" aria-live="polite" className="sr-only">
        {refreshNotice}
      </p>

      <Card className="mb-4">
        <div className="p-4">
          <ReservationFilters
            fromDate={fromDate}
            toDate={toDate}
            statusFilter={statusFilter}
            clientSearch={clientSearch}
            statusOptions={RESERVATION_STATUS_OPTIONS.map((option) => ({
              ...option,
              label: option.value
                ? t(`reservations.statuses.${option.value}`, { defaultValue: option.label })
                : t('reservations.listFilters.allStatuses'),
            }))}
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
          <div role="status" className="flex justify-center p-10 text-content-muted">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
            <span className="sr-only">{t('common.loading')}</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p role="alert" className="text-sm text-bad-foreground">
              {t('reservations.adminList.loadError')}
            </p>
            <Button type="button" variant="outline" onClick={() => loadData()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 p-3 lg:hidden">
              {items.length === 0 ? (
                <p className="p-3 text-sm text-content-muted">{t('common.noData')}</p>
              ) : (
                items.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full rounded-md border border-line bg-surface p-3 text-left hover:bg-surface-muted"
                    onClick={() => void openDetail(r)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-content">{String(r.reservationDate).slice(0, 10)}</p>
                        <p className="text-sm text-content-muted">
                          {r.startTime} - {r.endTime}
                        </p>
                      </div>
                      <StatusBadge
                        status={reservationStatusDescriptor(r.status, r.cancelReason)}
                        label={getLocalizedReservationStatusLabel(r.status, r.cancelReason)}
                      />
                    </div>
                  <p className="mt-2 text-sm text-content">{serviceSummary(r)}</p>
                    <p className="text-sm text-content-muted">{getClientName(r.client)}</p>
                  </button>
                ))
              )}
            </div>

            <div className="hidden app-table-wrap lg:block">
              <table className="app-table w-full border-collapse">
                <caption className="sr-only">{t('nav.reservations')}</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-content-muted">
                    <th scope="col" className="p-3 font-medium">{t('reservations.adminList.date')}</th>
                    <th scope="col" className="p-3 font-medium">{t('reservations.adminList.time')}</th>
                    <th scope="col" className="p-3 font-medium">{t('reservations.adminList.client')}</th>
                    <th scope="col" className="p-3 font-medium">{t('reservations.adminList.service')}</th>
                    <th scope="col" className="p-3 font-medium text-right">{t('reservations.adminList.priceLoyalty')}</th>
                    <th scope="col" className="p-3 font-medium">{t('reservations.adminList.stylist')}</th>
                    <th scope="col" className="p-3 font-medium">{t('reservations.adminList.status')}</th>
                    <th scope="col" className="p-3 font-medium text-right">{t('reservations.adminList.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-content-muted">
                        {t('common.noData')}
                      </td>
                    </tr>
                  ) : (
                    items.map((r) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer border-b border-line hover:bg-surface-muted"
                        onClick={() => void openDetail(r)}
                      >
                        <td className="p-3">{String(r.reservationDate).slice(0, 10)}</td>
                        <td className="p-3">
                          {r.startTime} – {r.endTime}
                        </td>
                        <td className="p-3" onClick={(e) => e.stopPropagation()}>
                          {r.client ? (
                            <RouterLink
                              to={`/admin/analytics?tab=clients&userId=${r.client.id}`}
                              className="font-medium text-brand-gold-text hover:underline"
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
                              to={`/admin/analytics?tab=stylists&stylistId=${r.confirmedStylist.id}`}
                              className="text-brand-gold-text hover:underline"
                            >
                              {getListStylistName(r.confirmedStylist)}
                            </RouterLink>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3">
                          <StatusBadge
                            status={reservationStatusDescriptor(r.status, r.cancelReason)}
                            label={getLocalizedReservationStatusLabel(r.status, r.cancelReason)}
                          />
                        </td>
                        <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <Button type="button" size="icon" variant="ghost" aria-label={t('reservations.adminList.details')} onClick={() => void openDetail(r)}>
                            <Eye className="h-4 w-4 text-info-foreground" aria-hidden="true" />
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

      {!loading && !loadError ? (
        <nav
          aria-label={t('table.pagination')}
          className="mt-4 flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-content-muted">{t('reservations.adminList.total', { total })}</p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              {t('reservations.adminList.previous')}
            </Button>
            <span role="status" aria-live="polite" className="text-sm text-content-muted tabular-nums">
              {page + 1} / {totalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              {t('reservations.adminList.next')}
            </Button>
          </div>
        </nav>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('reservations.adminDetail.title')}</DialogTitle>
          </DialogHeader>

          {detail ? (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-content">{t('reservations.adminDetail.status')}</p>
                <StatusBadge
                  status={reservationStatusDescriptor(detail.status, detail.cancelReason)}
                  label={getLocalizedReservationStatusLabel(detail.status, detail.cancelReason)}
                  className="px-3 py-1 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-content-muted">{t('reservations.adminDetail.date')}</p>
                  <p className="font-medium text-content">{String(detail.reservationDate).slice(0, 10)}</p>
                </div>
                <div>
                  <p className="text-xs text-content-muted">{t('reservations.adminDetail.time')}</p>
                  <p className="font-medium text-content">
                    {detail.startTime} – {detail.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-content-muted">{t('reservations.adminDetail.created')}</p>
                  <p className="font-medium text-content">{formatLocalizedDateTime(detail.createdAt, i18n.language)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-content-muted">{t('reservations.adminDetail.client')}</p>
                  <p className="font-medium text-content">{getClientName(detail.client)}</p>
                  {detail.client?.phone ? <p className="mt-1 text-sm text-content-muted">{t('reservations.adminDetail.phone')}: {detail.client.phone}</p> : null}
                </div>
                <div>
                  <p className="text-xs text-content-muted">{t('reservations.adminDetail.confirmedStylist')}</p>
                  <p className="font-medium text-content">{getListStylistName(detail.confirmedStylist)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-content-muted">{t('reservations.adminDetail.service')}</p>
                {detail.items && detail.items.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {[...detail.items]
                      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                      .map((it) => (
                        <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface-muted p-2">
                          <p className="font-medium text-content">{it.service?.name ?? '-'}</p>
                          <p className="text-sm text-content-muted">
                            {Number(it.service?.durationMinutes ?? 0)} {t('reservations.adminDetail.minuteUnit')} | {formatLocalizedAmount(Number(it.service?.price ?? 0), i18n.language)}
                          </p>
                        </div>
                      ))}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
                      <p className="font-medium text-content">{t('reservations.adminDetail.total')}</p>
                      <p className="text-content-strong">
                        {getServicesTotals(detail).totalMinutes} {t('reservations.adminDetail.minuteUnit')} | {formatLocalizedAmount(getServicesTotals(detail).totalPrice, i18n.language)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-content">{detail.service?.name ?? '-'}</p>
                    {detail.service ? (
                      <p className="mt-1 text-sm text-content-muted">
                        {detail.service.durationMinutes} {t('reservations.adminDetail.minuteUnit')} | {formatLocalizedAmount(Number(detail.service.price), i18n.language)}
                      </p>
                    ) : null}
                  </>
                )}
              </div>

              {detail.clientNotes ? (
                <div>
                  <p className="text-xs text-content-muted">{t('reservations.adminDetail.clientNotes')}</p>
                  <p className="mt-1 whitespace-pre-wrap text-content">{detail.clientNotes}</p>
                </div>
              ) : null}

              {detail.cancelReason ? (
                <div>
                  <p className="text-xs text-content-muted">{t('reservations.adminDetail.cancellationReason')}</p>
                  <p className="mt-1 whitespace-pre-wrap text-bad-foreground">{detail.cancelReason}</p>
                </div>
              ) : null}

              {detail.stylistResponses && detail.stylistResponses.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-content">{t('reservations.adminDetail.stylistResponses')}</p>
                  <div className="mt-2 space-y-2">
                    {detail.stylistResponses.map((sr) => (
                      <div key={sr.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface-muted p-2">
                        <p className="text-sm text-content">{sr.stylistProfile?.user?.username ?? '-'}</p>
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
                          className="text-xs"
                        >
                          {t(`reservations.adminDetail.responseStatuses.${sr.status}`, { defaultValue: sr.status })}
                        </Badge>
                        {sr.rejectionReason ? <p className="text-xs text-content-muted">{sr.rejectionReason}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {detail.status === 'AWAITING_DAILY_LOG' ? (
                <div className="rounded-md border border-line bg-warn p-3">
                  <p className="text-sm font-medium text-content">
                    {t('reservations.adminDetail.dailyLogTitle')}
                  </p>
                  <p className="mt-1 text-xs text-content-muted">
                    {t('reservations.adminDetail.dailyLogHelp')}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button type="button" variant="outline" asChild>
                      <RouterLink to="/admin/daily-log">{t('reservations.adminDetail.openDailyLog')}</RouterLink>
                    </Button>
                  </div>
                </div>
              ) : null}

              {canAdminConfirmAttendance(detail) ? (
                <div className="rounded-md border border-line p-3">
                  <p className="text-sm font-medium text-content">
                    {t('reservations.adminDetail.confirmAttendanceTitle')}
                  </p>
                  <p className="mt-1 text-xs text-content-muted">
                    {t('reservations.adminDetail.confirmAttendanceHelp')}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      onClick={() => void handleStaffConfirmAttendance()}
                      disabled={confirmingAttendance}
                    >
                      {confirmingAttendance ? t('reservations.adminDetail.attendanceConfirming') : t('reservations.adminDetail.confirmAttendance')}
                    </Button>
                  </div>
                </div>
              ) : null}

              {canAdminCancelReservation(detail.status) ? (
                <div className="rounded-md border border-line p-3">
                  {/* 3.3.2: naslov i pomoć bili su obični <p> — vidljivi, ali programski
                      nepovezani s poljem, pa ih čitač ekrana nije najavio uz njega (polje je
                      imalo samo placeholder, koji nestaje čim korisnik počne kucati).
                      useId() + aria-labelledby/aria-describedby, bez vizuelne promjene. */}
                  <p id={cancelTitleId} className="text-sm font-medium text-content">{t('reservations.adminDetail.cancelTitle')}</p>
                  <p id={cancelHelpId} className="mt-1 text-xs text-content-muted">{t('reservations.adminDetail.cancelHelp')}</p>
                  <div className="mt-3 space-y-2">
                    <Textarea
                      aria-labelledby={cancelTitleId}
                      aria-describedby={cancelHelpId}
                      placeholder={t('reservations.adminDetail.cancelReasonPlaceholder')}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="danger"
                        onClick={() => void handleCancel()}
                        disabled={cancelling}
                      >
                        {cancelling ? t('reservations.adminDetail.cancelling') : t('reservations.adminDetail.cancelAction')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('reservations.adminDetail.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
