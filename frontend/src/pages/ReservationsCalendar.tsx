import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

import api from '../api/client'
import { fetchAllPublicStylists } from '../api/catalog'
import { getErrorMessage } from '../api/error'
import { Button } from '../components/ui/button'
import { useAppToast } from '../lib/toast/useAppToast'

import { ReservationScheduler } from '../features/reservations/components/ReservationScheduler'
import type { Reservation, StylistProfile } from '../features/reservations/types'
import { useReservationSocketRefresh } from '../features/reservations/use-reservation-socket-refresh'
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
  const navigate = useNavigate()
  const toast = useAppToast()

  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
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
    try {
      const { data } = await api.get<Reservation[] | { items: Reservation[] }>('/api/reservations', { params: range })
      const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : []
      setReservations(items)
    } catch {
      setReservations([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [range])

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
      toast.success('Rezervacija kreirana')
      await loadReservations()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Greška pri kreiranju rezervacije'))
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
          ? 'Termin je izašao iz dnevne knjige i vraćen u raspored.'
          : 'Termin pomjeren',
      )
      await loadReservations()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Pomjeranje nije moguće'))
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
      toast.success('Rezervacija otkazana')
      await loadReservations()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Greška pri otkazivanju'))
      throw err
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <div className="h-dvh w-full p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-slate-900 dark:text-slate-50">
              Kalendar rezervacija
            </h1>
            <p className="mt-0.5 hidden text-xs text-slate-600 dark:text-slate-300 sm:block">
              Radna površina (full screen).
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => navigate('/admin/reservations')}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Nazad
          </Button>
        </div>

        <div className="h-[calc(100dvh-72px)] rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
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
        </div>
      </div>
    </div>
  )
}

