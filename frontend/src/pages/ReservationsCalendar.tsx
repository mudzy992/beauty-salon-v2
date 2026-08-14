import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { Button } from '../components/ui/button'
import { useAppToast } from '../lib/toast/useAppToast'

import { ReservationScheduler } from '../features/reservations/components/ReservationScheduler'
import type { Reservation, StylistProfile } from '../features/reservations/types'
import { useReservationSocketRefresh } from '../features/reservations/use-reservation-socket-refresh'

const toYmd = (d: Date): string => {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const addDays = (d: Date, days: number): Date => {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

export default function ReservationsCalendar() {
  const navigate = useNavigate()
  const toast = useAppToast()

  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stylists, setStylists] = useState<StylistProfile[]>([])
  const [selectedStylistIds, setSelectedStylistIds] = useState<string[]>([])

  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'agenda'>('timeGridWeek')
  const [activeDate, setActiveDate] = useState<Date>(() => new Date())

  const range = useMemo(() => {
    if (view === 'dayGridMonth') {
      const start = new Date(activeDate.getFullYear(), activeDate.getMonth(), 1)
      const end = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0)
      return { fromDate: toYmd(start), toDate: toYmd(end) }
    }
    if (view === 'timeGridDay') {
      const d = new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate())
      return { fromDate: toYmd(d), toDate: toYmd(d) }
    }
    if (view === 'agenda') {
      const day = activeDate.getDay()
      const mondayOffset = day === 0 ? -6 : 1 - day
      const start = addDays(new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate()), mondayOffset)
      const end = addDays(start, 6)
      return { fromDate: toYmd(start), toDate: toYmd(end) }
    }
    const day = activeDate.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    const start = addDays(new Date(activeDate.getFullYear(), activeDate.getMonth(), activeDate.getDate()), mondayOffset)
    const end = addDays(start, 6)
    return { fromDate: toYmd(start), toDate: toYmd(end) }
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
      const { data } = await api.get<StylistProfile[] | { items: StylistProfile[] }>('/api/stylists', {
        params: { page: 0, pageSize: 300 },
      })
      const items = Array.isArray(data) ? data : Array.isArray((data as any).items) ? (data as any).items : []
      setStylists(items)
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

