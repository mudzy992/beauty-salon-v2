import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Plus } from 'lucide-react'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS, bs } from 'date-fns/locale'
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type SlotInfo,
  Views,
} from 'react-big-calendar'
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'

import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import './reservation-scheduler.css'

import api from '../../../api/client'
import { getErrorMessage } from '../../../api/error'
import { Button } from '../../../components/ui/button'
import { Drawer, DrawerContent } from '../../../components/ui/drawer'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { Badge } from '../../../components/ui/badge'
import { useAppToast } from '../../../lib/toast/useAppToast'

import type { Reservation, SchedulerView, StylistProfile } from '../types'
import { getReservationStatusColor, getReservationStatusLabel } from '../status'

type SchedulerEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resourceId: string
  status: string
  reservation: Reservation
}

const SchedulerEventContent = ({ event }: { event: SchedulerEvent }) => {
  const startLabel = event.start instanceof Date ? format(event.start, 'HH:mm') : ''
  const endLabel = event.end instanceof Date ? format(event.end, 'HH:mm') : ''
  const timeLabel = startLabel && endLabel ? `${startLabel}–${endLabel}` : startLabel
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="truncate text-[11px] font-semibold">{event.title}</div>
        <div className="shrink-0 text-[10px] font-semibold opacity-80">{timeLabel}</div>
      </div>
      <div className="mt-0.5 truncate text-[10px] opacity-80">
        {getReservationStatusLabel(event.status, event.reservation.cancelReason)}
      </div>
    </div>
  )
}

type ServiceOption = {
  id: string
  name: string
  durationMinutes?: number
  price?: string | number
}

type ClientOption = {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
}

type Props = {
  reservations: Reservation[]
  stylists: StylistProfile[]
  loading: boolean
  view: SchedulerView
  onViewChange: (v: SchedulerView) => void
  date: Date
  onDateChange: (d: Date) => void
  selectedStylistIds: string[]
  onSelectedStylistIdsChange: (ids: string[]) => void
  onCreateRequest: (payload: {
    clientId: string
    serviceIds: string[]
    reservationDate: string
    startTime: string
    endTime: string
    clientNotes?: string
  }) => Promise<void>
  onMoveRequest: (payload: { reservationId: string; reservationDate: string; startTime: string; endTime: string }) => Promise<void>
  onResizeRequest: (payload: { reservationId: string; reservationDate: string; startTime: string; endTime: string }) => Promise<void>
  onCancelRequest: (payload: { reservationId: string; cancelReason?: string }) => Promise<void>
}

const DragAndDropCalendar = withDragAndDrop(BigCalendar as any) as any

const toYmd = (d: Date): string => format(d, 'yyyy-MM-dd')
const toHm = (d: Date): string => format(d, 'HH:mm')

const combineLocal = (dateStr: string, timeStr: string): Date => {
  const [yyyy, mm, dd] = dateStr.split('-').map((x) => Number(x))
  const [hh, mi] = timeStr.split(':').map((x) => Number(x))
  return new Date(yyyy, (mm ?? 1) - 1, dd ?? 1, hh ?? 0, mi ?? 0, 0, 0)
}

const stylistName = (s?: StylistProfile | null): string => {
  if (!s?.user) return s?.id ?? 'Stilist'
  return [s.user.firstName, s.user.lastName].filter(Boolean).join(' ') || s.user.username || s.id
}

const canCancel = (status: string) =>
  ['PENDING', 'STYLIST_REVIEW', 'CONFIRMED', 'ATTENDANCE_CONFIRMED', 'IN_PROGRESS'].includes(status)

const getReservationResourceId = (r: Reservation): string => {
  const confirmedId = r.confirmedStylist?.id
  if (confirmedId) return confirmedId
  const acceptedResponse = r.stylistResponses?.find((x) => x.status === 'ACCEPTED' && x.stylistProfile?.id)
  if (acceptedResponse?.stylistProfile?.id) return acceptedResponse.stylistProfile.id
  const lockedResponse = r.stylistResponses?.find((x) => x.status === 'LOCKED' && x.stylistProfile?.id)
  if (lockedResponse?.stylistProfile?.id) return lockedResponse.stylistProfile.id
  const anyAssignedResponse = r.stylistResponses?.find((x) => x.stylistProfile?.id)
  if (anyAssignedResponse?.stylistProfile?.id) return anyAssignedResponse.stylistProfile.id
  return 'unassigned'
}

export const ReservationScheduler = (props: Props) => {
  const { t } = useTranslation()
  const toast = useAppToast()

  const locales = useMemo(() => ({ 'en-US': enUS, 'bs-BA': bs }), [])
  const currentLang = (String((t as any)?.i18n?.language ?? 'bs') || 'bs').toLowerCase()
  const localeKey = currentLang.startsWith('en') ? 'en-US' : 'bs-BA'

  const localizer = useMemo(
    () =>
      dateFnsLocalizer({
        format,
        parse,
        startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1 }),
        getDay,
        locales,
      }),
    [locales],
  )

  const hasUnassignedReservations = useMemo(() => props.reservations.some((r) => getReservationResourceId(r) === 'unassigned'), [props.reservations])

  const resources = useMemo(() => {
    const active = props.stylists.filter((s) => (s.isActive ?? true) !== false)
    const shouldShowUnassigned =
      hasUnassignedReservations || props.selectedStylistIds.includes('unassigned')
    return [
      ...active.map((s) => ({ id: s.id, title: stylistName(s) })),
      ...(shouldShowUnassigned ? [{ id: 'unassigned', title: 'Nije potvrđen' }] : []),
    ]
  }, [hasUnassignedReservations, props.selectedStylistIds, props.stylists])

  const events = useMemo(() => {
    const byStylists = new Set(props.selectedStylistIds)
    const filtered = props.selectedStylistIds.length
      ? props.reservations.filter((r) => (r.confirmedStylist?.id ? byStylists.has(r.confirmedStylist.id) : byStylists.has('unassigned')))
      : props.reservations

    return filtered
      .map((r): SchedulerEvent => {
        const serviceTitle = r.service?.name ?? 'Usluga'
        const clientTitle =
          [r.client?.firstName, r.client?.lastName].filter(Boolean).join(' ').trim() || r.client?.username || 'Klijent'
        const title = `${serviceTitle} • ${clientTitle}`
        const start = combineLocal(String(r.reservationDate).slice(0, 10), r.startTime)
        const end = combineLocal(String(r.reservationDate).slice(0, 10), r.endTime)
        const resourceId = getReservationResourceId(r)
        return { id: r.id, title, start, end, resourceId, status: r.status, reservation: r }
      })
      .filter((e) => !Number.isNaN(e.start.getTime()) && !Number.isNaN(e.end.getTime()))
  }, [props.reservations, props.selectedStylistIds])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'details' | 'create'>('details')
  const [activeReservation, setActiveReservation] = useState<Reservation | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [editDraft, setEditDraft] = useState<{ reservationDate: string; startTime: string; endTime: string }>({
    reservationDate: '',
    startTime: '',
    endTime: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [createDraft, setCreateDraft] = useState<{
    clientSearch: string
    clientId: string
    serviceSearch: string
    serviceIds: string[]
    reservationDate: string
    startTime: string
    endTime: string
    clientNotes: string
  }>({
    clientSearch: '',
    clientId: '',
    serviceSearch: '',
    serviceIds: [],
    reservationDate: '',
    startTime: '',
    endTime: '',
    clientNotes: '',
  })

  const loadServices = useCallback(async () => {
    try {
      const { data } = await api.get<ServiceOption[] | { items: ServiceOption[] }>('/api/services', {
        params: { page: 0, pageSize: 300, activeOnly: 'true' },
      })
      const items = Array.isArray(data) ? data : Array.isArray((data as any).items) ? (data as any).items : []
      setServices(items)
    } catch {
      setServices([])
    }
  }, [])

  const loadClients = useCallback(async (query: string) => {
    const q = query.trim()
    if (!q) {
      setClients([])
      return
    }
    setClientsLoading(true)
    try {
      const { data } = await api.get<{ items: ClientOption[] }>('/api/users/clients', {
        params: { page: 0, pageSize: 10, q },
      })
      setClients(Array.isArray(data.items) ? data.items : [])
    } catch {
      setClients([])
    } finally {
      setClientsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadServices()
  }, [loadServices])

  useEffect(() => {
    const t = window.setTimeout(() => {
      void loadClients(createDraft.clientSearch)
    }, 300)
    return () => window.clearTimeout(t)
  }, [createDraft.clientSearch, loadClients])

  const filteredServices = useMemo(() => {
    const q = createDraft.serviceSearch.trim().toLowerCase()
    if (!q) return services
    return services.filter((s) => s.name.toLowerCase().includes(q))
  }, [createDraft.serviceSearch, services])

  const servicesById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])

  useEffect(() => {
    const start = (createDraft.startTime ?? '').trim()
    if (!start) return
    if (!createDraft.serviceIds || createDraft.serviceIds.length === 0) return
    const totalMinutes = createDraft.serviceIds
      .map((id) => servicesById.get(id)?.durationMinutes ?? 0)
      .reduce((acc, x) => acc + x, 0)
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return
    const [hhRaw, mmRaw] = start.split(':').map(Number)
    if (!Number.isFinite(hhRaw) || !Number.isFinite(mmRaw)) return
    const startMinutes = hhRaw * 60 + mmRaw
    const endMinutes = startMinutes + totalMinutes
    const endH = Math.floor(endMinutes / 60) % 24
    const endM = endMinutes % 60
    const nextEnd = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
    if (createDraft.endTime !== nextEnd) {
      setCreateDraft((p) => ({ ...p, endTime: nextEnd }))
    }
  }, [createDraft.startTime, createDraft.serviceIds, createDraft.endTime, servicesById])

  const view = useMemo(() => {
    if (props.view === 'dayGridMonth') return Views.MONTH
    if (props.view === 'timeGridDay') return Views.DAY
    if (props.view === 'agenda') return Views.AGENDA
    return Views.WEEK
  }, [props.view])

  const messages = useMemo(() => {
    if (localeKey.startsWith('en')) {
      return {
        today: 'Today',
        previous: 'Back',
        next: 'Next',
        month: 'Month',
        week: 'Week',
        day: 'Day',
        agenda: 'Agenda',
        date: 'Date',
        time: 'Time',
        event: 'Event',
        noEventsInRange: 'No events in range.',
      }
    }
    return {
      today: 'Danas',
      previous: 'Nazad',
      next: 'Naprijed',
      month: 'Mjesec',
      week: 'Sedmica',
      day: 'Dan',
      agenda: 'Agenda',
      date: 'Datum',
      time: 'Vrijeme',
      event: 'Termin',
      noEventsInRange: 'Nema termina u odabranom periodu.',
    }
  }, [localeKey])

  const openCreate = (slot?: SlotInfo) => {
    const start = slot?.start instanceof Date ? slot.start : new Date(props.date)
    const end = slot?.end instanceof Date ? slot.end : new Date(props.date)
    setCreateDraft({
      clientSearch: '',
      clientId: '',
      serviceSearch: '',
      serviceId: '',
      reservationDate: toYmd(start),
      startTime: toHm(start),
      endTime: toHm(end),
      clientNotes: '',
    })
    setDrawerMode('create')
    setActiveReservation(null)
    setDrawerOpen(true)
  }

  const openDetails = (r: Reservation) => {
    setActiveReservation(r)
    setCancelReason('')
    setCancelling(false)
    setEditDraft({
      reservationDate: String(r.reservationDate).slice(0, 10),
      startTime: r.startTime,
      endTime: r.endTime,
    })
    setSavingEdit(false)
    setDrawerMode('details')
    setDrawerOpen(true)
  }

  const eventPropGetter = (event: SchedulerEvent) => {
    const color = getReservationStatusColor(event.status)
    const base: React.CSSProperties = {
      borderRadius: 10,
      border: '1px solid rgba(15, 23, 42, 0.12)',
      borderLeftWidth: 4,
      padding: '2px 6px',
      cursor: 'pointer',
      zIndex: 2,
      boxShadow: '0 1px 0 rgba(0, 0, 0, 0.04)',
    }
    if (color === 'emerald') return { style: { ...base, borderLeftColor: '#10B981', backgroundColor: '#ECFDF5', color: '#065F46' } }
    if (color === 'amber') return { style: { ...base, borderLeftColor: '#F59E0B', backgroundColor: '#FFFBEB', color: '#92400E' } }
    if (color === 'rose') return { style: { ...base, borderLeftColor: '#F43F5E', backgroundColor: '#FFF1F2', color: '#9F1239' } }
    if (color === 'brand') return { style: { ...base, borderLeftColor: '#D4A843', backgroundColor: '#FEF3C7', color: '#78350F' } }
    return { style: { ...base, borderLeftColor: '#64748B', backgroundColor: '#F1F5F9', color: '#0F172A' } }
  }

  const handlePrev = () => {
    const d = new Date(props.date)
    if (view === Views.MONTH) d.setMonth(d.getMonth() - 1)
    else if (view === Views.DAY) d.setDate(d.getDate() - 1)
    else d.setDate(d.getDate() - 7)
    props.onDateChange(d)
  }

  const handleNext = () => {
    const d = new Date(props.date)
    if (view === Views.MONTH) d.setMonth(d.getMonth() + 1)
    else if (view === Views.DAY) d.setDate(d.getDate() + 1)
    else d.setDate(d.getDate() + 7)
    props.onDateChange(d)
  }

  return (
    <div className="bg-white dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <div className="font-semibold text-slate-900 dark:text-slate-50">Rezervacije</div>
            <Badge variant="secondary" className="text-[10px]">
              {props.selectedStylistIds.length ? `${props.selectedStylistIds.length} stilist(a)` : 'Svi stilisti'}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openCreate()}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Novi termin
            </Button>

            <Button type="button" variant="outline" size="sm" onClick={() => props.onDateChange(new Date())}>
              {messages.today}
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label="Prethodni" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label="Sljedeći" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>

            <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-800 overflow-hidden">
              <button
                type="button"
                className={props.view === 'dayGridMonth' ? 'px-3 py-2 text-sm font-semibold bg-slate-900 text-white' : 'px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'}
                onClick={() => props.onViewChange('dayGridMonth')}
              >
                {messages.month}
              </button>
              <button
                type="button"
                className={props.view === 'timeGridWeek' ? 'px-3 py-2 text-sm font-semibold bg-slate-900 text-white' : 'px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'}
                onClick={() => props.onViewChange('timeGridWeek')}
              >
                {messages.week}
              </button>
              <button
                type="button"
                className={props.view === 'timeGridDay' ? 'px-3 py-2 text-sm font-semibold bg-slate-900 text-white' : 'px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'}
                onClick={() => props.onViewChange('timeGridDay')}
              >
                {messages.day}
              </button>
              <button
                type="button"
                className={props.view === 'agenda' ? 'px-3 py-2 text-sm font-semibold bg-slate-900 text-white' : 'px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900/40'}
                onClick={() => props.onViewChange('agenda')}
              >
                {messages.agenda}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Filter className="h-4 w-4" aria-hidden="true" />
            <span>Stilisti</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={props.selectedStylistIds.length === 0 ? 'rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white' : 'rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-200'}
                onClick={() => props.onSelectedStylistIdsChange([])}
              >
                Svi
              </button>
              {resources.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={
                    props.selectedStylistIds.includes(r.id)
                      ? 'rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white'
                      : 'rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-200'
                  }
                  onClick={() => {
                    if (props.selectedStylistIds.includes(r.id)) {
                      props.onSelectedStylistIdsChange(props.selectedStylistIds.filter((x) => x !== r.id))
                      return
                    }
                    props.onSelectedStylistIdsChange([...props.selectedStylistIds, r.id])
                  }}
                >
                  {r.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
            {[
              { status: 'CONFIRMED', label: getReservationStatusLabel('CONFIRMED') },
              { status: 'PENDING', label: getReservationStatusLabel('PENDING') },
              { status: 'CANCELLED_BY_CLIENT', label: getReservationStatusLabel('CANCELLED_BY_CLIENT') },
              { status: 'COMPLETED', label: getReservationStatusLabel('COMPLETED') },
            ].map((x) => (
              <span key={x.status} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-950">
                <span
                  className={
                    x.status === 'COMPLETED'
                      ? 'h-2 w-2 rounded-full bg-emerald-500'
                      : x.status === 'PENDING'
                        ? 'h-2 w-2 rounded-full bg-amber-500'
                        : x.status.startsWith('CANCELLED')
                          ? 'h-2 w-2 rounded-full bg-rose-500'
                          : 'h-2 w-2 rounded-full bg-brand-gold'
                  }
                />
                {x.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <DragAndDropCalendar
            localizer={localizer}
            culture={localeKey}
            messages={messages as any}
            toolbar={false}
            date={props.date}
            onNavigate={(d: Date) => props.onDateChange(d)}
            view={view}
            onView={(v: string) => {
              if (v === Views.MONTH) props.onViewChange('dayGridMonth')
              if (v === Views.WEEK) props.onViewChange('timeGridWeek')
              if (v === Views.DAY) props.onViewChange('timeGridDay')
              if (v === Views.AGENDA) props.onViewChange('agenda')
            }}
            events={events}
            startAccessor="start"
            endAccessor="end"
            resourceAccessor="resourceId"
            resources={resources}
            resourceIdAccessor="id"
            resourceTitleAccessor="title"
            views={{ month: true, week: true, day: true, agenda: true }}
            selectable
            resizable
            dayLayoutAlgorithm="no-overlap"
            step={15}
            timeslots={4}
            onSelectSlot={(slot: SlotInfo) => openCreate(slot)}
            onSelectEvent={(e: SchedulerEvent) => openDetails(e.reservation)}
            onEventDrop={async ({ event, start, end }: { event: SchedulerEvent; start: Date; end: Date }) => {
              const ev = event as SchedulerEvent
              await props.onMoveRequest({
                reservationId: ev.id,
                reservationDate: toYmd(start as Date),
                startTime: toHm(start as Date),
                endTime: toHm(end as Date),
              })
            }}
            onEventResize={async ({ event, start, end }: { event: SchedulerEvent; start: Date; end: Date }) => {
              const ev = event as SchedulerEvent
              await props.onResizeRequest({
                reservationId: ev.id,
                reservationDate: toYmd(start as Date),
                startTime: toHm(start as Date),
                endTime: toHm(end as Date),
              })
            }}
            eventPropGetter={eventPropGetter as any}
            components={{
              event: SchedulerEventContent as any,
            }}
            style={{ height: 'calc(100dvh - 260px)' }}
          />
        </div>
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent side="right" className="p-5">
          {drawerMode === 'details' && activeReservation ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Status</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-50">
                    {getReservationStatusLabel(activeReservation.status, activeReservation.cancelReason)}
                  </p>
                  <Badge variant="secondary" className="text-[10px]">
                    {activeReservation.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500">Termin</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">
                    {String(activeReservation.reservationDate).slice(0, 10)} • {activeReservation.startTime}–{activeReservation.endTime}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{activeReservation.service?.name ?? '-'}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Klijent:{' '}
                    {[activeReservation.client?.firstName, activeReservation.client?.lastName].filter(Boolean).join(' ').trim() ||
                      activeReservation.client?.username ||
                      '-'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Stilist: {activeReservation.confirmedStylist ? stylistName(activeReservation.confirmedStylist) : 'Nije potvrđen'}
                  </p>
                </div>

                {activeReservation.clientNotes ? (
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs text-slate-500">Napomena klijenta</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-50">
                      {activeReservation.clientNotes}
                    </p>
                  </div>
                ) : null}

                {activeReservation.cancelReason ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
                    <p className="text-xs text-rose-700 dark:text-rose-300">Razlog otkazivanja</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-rose-900 dark:text-rose-200">
                      {activeReservation.cancelReason}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Uredi termin</p>
                  <p className="mt-1 text-xs text-slate-500">Promjena datuma/vremena (admin).</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Datum</Label>
                      <Input
                        type="date"
                        value={editDraft.reservationDate}
                        onChange={(e) => setEditDraft((p) => ({ ...p, reservationDate: e.target.value }))}
                        disabled={savingEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Početak</Label>
                      <Input
                        type="time"
                        value={editDraft.startTime}
                        onChange={(e) => setEditDraft((p) => ({ ...p, startTime: e.target.value }))}
                        disabled={savingEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kraj</Label>
                      <Input
                        type="time"
                        value={editDraft.endTime}
                        onChange={(e) => setEditDraft((p) => ({ ...p, endTime: e.target.value }))}
                        disabled={savingEdit}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        savingEdit ||
                        !editDraft.reservationDate ||
                        !editDraft.startTime ||
                        !editDraft.endTime ||
                        editDraft.reservationDate === String(activeReservation.reservationDate).slice(0, 10) &&
                          editDraft.startTime === activeReservation.startTime &&
                          editDraft.endTime === activeReservation.endTime
                      }
                      onClick={async () => {
                        if (!activeReservation) return
                        setSavingEdit(true)
                        try {
                          await props.onMoveRequest({
                            reservationId: activeReservation.id,
                            reservationDate: editDraft.reservationDate,
                            startTime: editDraft.startTime,
                            endTime: editDraft.endTime,
                          })
                          setDrawerOpen(false)
                        } catch (err) {
                          toast.error(getErrorMessage(err, 'Spremanje nije moguće'))
                        } finally {
                          setSavingEdit(false)
                        }
                      }}
                    >
                      {savingEdit ? 'Spremanje...' : 'Spasi promjenu'}
                    </Button>
                  </div>
                </div>

                {canCancel(activeReservation.status) ? (
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Otkaži rezervaciju</p>
                    <p className="mt-1 text-xs text-slate-500">Otkazivanje je dozvoljeno za ovaj status.</p>
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Razlog otkazivanja (opciono)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)} disabled={cancelling}>
                          Zatvori
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-950/20"
                          disabled={cancelling}
                          onClick={async () => {
                            if (!activeReservation) return
                            setCancelling(true)
                            try {
                              await props.onCancelRequest({
                                reservationId: activeReservation.id,
                                cancelReason: cancelReason.trim() || undefined,
                              })
                              setDrawerOpen(false)
                            } catch (err) {
                              toast.error(getErrorMessage(err, 'Greška pri otkazivanju'))
                            } finally {
                              setCancelling(false)
                            }
                          }}
                        >
                          {cancelling ? 'Otkazivanje...' : 'Otkaži'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {drawerMode === 'create' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Nova rezervacija</p>
                  <p className="text-xs text-slate-500">Kreiranje termina u ime klijenta (admin).</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Klijent</Label>
                <Input
                  placeholder="Pretraži klijente (ime, prezime, username)..."
                  value={createDraft.clientSearch}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, clientSearch: e.target.value, clientId: '' }))}
                />
                {clientsLoading ? <p className="text-xs text-slate-500">Učitavanje...</p> : null}
                {createDraft.clientId ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    Odabrano: <span className="font-semibold">{createDraft.clientId}</span>
                  </p>
                ) : null}
                {clients.length > 0 ? (
                  <div className="max-h-[220px] overflow-auto rounded-lg border border-slate-200 dark:border-slate-800">
                    {clients.map((c) => {
                      const label =
                        [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
                        c.username ||
                        c.id
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 last:border-b-0 dark:border-slate-800 dark:hover:bg-slate-900/40"
                          onClick={() => setCreateDraft((p) => ({ ...p, clientId: c.id, clientSearch: label }))}
                        >
                          <div className="font-medium text-slate-900 dark:text-slate-50">{label}</div>
                          <div className="text-xs text-slate-500">{c.id}</div>
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Servis</Label>
                <Input
                  placeholder="Pretraži servis..."
                  value={createDraft.serviceSearch}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, serviceSearch: e.target.value }))}
                />
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950"
                  multiple
                  value={createDraft.serviceIds}
                  onChange={(e) => {
                    const ids = Array.from(e.currentTarget.selectedOptions)
                      .map((o) => o.value)
                      .filter(Boolean)
                    setCreateDraft((p) => ({ ...p, serviceIds: ids }))
                  }}
                >
                  {filteredServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Odaberite jedan ili više servisa (Ctrl/⌘ + klik).
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Datum</Label>
                  <Input
                    type="date"
                    value={createDraft.reservationDate}
                    onChange={(e) => setCreateDraft((p) => ({ ...p, reservationDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Početak</Label>
                  <Input
                    type="time"
                    value={createDraft.startTime}
                    onChange={(e) => setCreateDraft((p) => ({ ...p, startTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kraj</Label>
                  <Input
                    type="time"
                    value={createDraft.endTime}
                    onChange={(e) => setCreateDraft((p) => ({ ...p, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Napomena (opciono)</Label>
                <Textarea
                  value={createDraft.clientNotes}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, clientNotes: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
                  Zatvori
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await props.onCreateRequest({
                        clientId: createDraft.clientId.trim(),
                        serviceIds: createDraft.serviceIds.map((x) => x.trim()).filter(Boolean),
                        reservationDate: createDraft.reservationDate,
                        startTime: createDraft.startTime,
                        endTime: createDraft.endTime,
                        clientNotes: createDraft.clientNotes.trim() || undefined,
                      })
                      setDrawerOpen(false)
                    } catch (err) {
                      toast.error(getErrorMessage(err, 'Greška pri kreiranju rezervacije'))
                    }
                  }}
                  disabled={
                    !createDraft.clientId.trim() ||
                    createDraft.serviceIds.length === 0 ||
                    !createDraft.reservationDate ||
                    !createDraft.startTime ||
                    !createDraft.endTime
                  }
                >
                  Kreiraj
                </Button>
              </div>
            </div>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  )
}

