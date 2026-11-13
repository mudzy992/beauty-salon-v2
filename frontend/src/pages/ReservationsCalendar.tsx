import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

import api from '../api/client'
import { fetchAllPublicStylists } from '../api/catalog'
import { getErrorMessage, getErrorCode } from '../api/error'
import { resolveAdminApiError } from '../features/admin/admin-api-error.mjs'
import { Button } from '../components/ui/button'
import { ThemeSwitcher } from '../features/shell/theme/theme-switcher'
import { LanguageSwitcher } from '../components/i18n/language-switcher'
import { SkipLink } from '../features/shell/admin/ui/skip-link'
import { useAppToast } from '../lib/toast/useAppToast'

import { ReservationScheduler } from '../features/reservations/components/ReservationScheduler'
import type { Reservation, StylistProfile } from '../features/reservations/types'
import { useReservationSocketRefresh } from '../features/reservations/use-reservation-socket-refresh'
import { fetchAllReservationPages } from '../features/reservations/reservation-list.api'
import {
  addDateOnlyDays,
  formatDateOnlyParts,
  getDateOnlyFromLocalCalendarDate,
  getDateOnlyWeekday,
  getDaysInMonth,
  getSalonDateOnly,
  parseDateOnly,
} from '../../../shared/business-date.mjs'

const toYmd = (date: Date): string =>
  getDateOnlyFromLocalCalendarDate(date)

const toLocalCalendarDate = (dateOnly: string): Date => {
  const { year, month, day } = parseDateOnly(dateOnly)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

export default function ReservationsCalendar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useAppToast()

  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [reservationLoadError, setReservationLoadError] = useState(false)
  const [stylists, setStylists] = useState<StylistProfile[]>([])
  const [selectedStylistIds, setSelectedStylistIds] = useState<string[]>([])

  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'agenda'>('timeGridWeek')
  const [activeDate, setActiveDate] = useState<Date>(() =>
    toLocalCalendarDate(getSalonDateOnly()),
  )

  const range = useMemo(() => {
    const dateOnly = toYmd(activeDate)
    const { year, month } = parseDateOnly(dateOnly)
    if (view === 'dayGridMonth') {
      return {
        fromDate: formatDateOnlyParts({ year, month, day: 1 }),
        toDate: formatDateOnlyParts({
          year,
          month,
          day: getDaysInMonth(year, month),
        }),
      }
    }
    if (view === 'timeGridDay') {
      return { fromDate: dateOnly, toDate: dateOnly }
    }

    const weekday = getDateOnlyWeekday(dateOnly)
    const mondayOffset = weekday === 0 ? -6 : 1 - weekday
    const fromDate = addDateOnlyDays(dateOnly, mondayOffset)
    return { fromDate, toDate: addDateOnlyDays(fromDate, 6) }
  }, [activeDate, view])

  const loadReservations = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent === true
    if (!silent) setLoading(true)
    setReservationLoadError(false)
    try {
      const items = await fetchAllReservationPages<Reservation>(range)
      setReservations(items)
    } catch (err) {
      setReservationLoadError(true)
      const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'common.error', getErrorCode(err))
      toast.error(t(apiErr.key, apiErr.values))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [range, t, toast])

  const loadStylists = useCallback(async () => {
    try {
      setStylists(await fetchAllPublicStylists<StylistProfile>())
    } catch {
      setStylists([])
    }
  }, [])

  useEffect(() => {
    void loadStylists()
  }, [loadStylists])

  useEffect(() => {
    void loadReservations()
  }, [loadReservations])

  const refreshFromSocket = useCallback(() => {
    void loadReservations({ silent: true })
  }, [loadReservations])

  useReservationSocketRefresh(refreshFromSocket)

  const handleCreate = async (payload: {
    clientId: string
    bookingMode: 'STANDARD' | 'STAFF_ADMIN_DIRECT'
    stylistProfileId?: string
    serviceIds: string[]
    reservationDate: string
    startTime: string
    endTime: string
    clientNotes?: string
  }) => {
    try {
      await api.post('/api/reservations/admin', payload)
      toast.success(t('reservations.calendar.created'))
      await loadReservations()
    } catch (err) {
      const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'reservations.calendar.createError', getErrorCode(err))
      toast.error(t(apiErr.key, apiErr.values))
      throw err
    }
  }

  const handleMove = async (payload: { reservationId: string; reservationDate: string; startTime: string; endTime: string }) => {
    try {
      const wasAwaitingDailyLog = reservations.some(
        (r) => r.id === payload.reservationId && r.status === 'AWAITING_DAILY_LOG',
      )
      await api.patch(`/api/reservations/${payload.reservationId}`, {
        reservationDate: payload.reservationDate,
        startTime: payload.startTime,
        endTime: payload.endTime,
      })
      toast.success(
        wasAwaitingDailyLog
          ? t('reservations.calendar.returnedFromDailyLog')
          : t('reservations.calendar.moved'),
      )
      await loadReservations()
    } catch (err) {
      const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'reservations.calendar.moveError', getErrorCode(err))
      toast.error(t(apiErr.key, apiErr.values))
      throw err
    }
  }

  const handleResize = async (payload: { reservationId: string; reservationDate: string; startTime: string; endTime: string }) => {
    return handleMove(payload)
  }

  const handleCancel = async (payload: { reservationId: string; cancelReason?: string }) => {
    try {
      await api.post(`/api/reservations/${payload.reservationId}/admin-cancel`, {
        cancelReason: payload.cancelReason || undefined,
      })
      toast.success(t('reservations.calendar.cancelled'))
      await loadReservations()
    } catch (err) {
      const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'reservations.calendar.cancelError', getErrorCode(err))
      toast.error(t(apiErr.key, apiErr.values))
      throw err
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950" data-aurum-calendar>
      <SkipLink targetId="calendar-main" />
      <div className="flex min-h-dvh w-full flex-col p-3 sm:p-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
              {t('reservations.calendar.title')}
            </h1>
            <p className="mt-0.5 hidden text-xs text-slate-600 dark:text-slate-300 sm:block">
              {t('reservations.calendar.workspace')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
          </div>
          {reservationLoadError ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadReservations()}
            >
              {t('common.retry')}
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => navigate('/admin/reservations')}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            {t('reservations.calendar.back')}
          </Button>
        </header>

        <main id="calendar-main" tabIndex={-1} data-admin-calendar-main className="min-h-[28rem] flex-1 rounded-xl border border-slate-200 bg-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-focus-ring dark:border-slate-800 dark:bg-slate-950">
          {loading ? (
            <div role="status" aria-live="polite" className="flex h-full items-center justify-center text-slate-500">
              <span className="sr-only">{t('common.loading')}</span>
              <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            </div>
          ) : (
            <ReservationScheduler
              reservations={reservations}
              stylists={stylists}
              loading={loading}
              view={view}
              onViewChange={setView}
              date={activeDate}
              onDateChange={setActiveDate}
              selectedStylistIds={selectedStylistIds}
              onSelectedStylistIdsChange={setSelectedStylistIds}
              onCreateRequest={handleCreate}
              onMoveRequest={handleMove}
              onResizeRequest={handleResize}
              onCancelRequest={handleCancel}
            />
          )}
        </main>
      </div>
    </div>
  )
}

