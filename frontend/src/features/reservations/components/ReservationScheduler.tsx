import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Filter, Plus, Search } from 'lucide-react'
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
import { fetchAllPublicServices } from '../../../api/catalog'
import { getErrorMessage } from '../../../api/error'
import { Button } from '../../../components/ui/button'
import { Drawer, DrawerContent } from '../../../components/ui/drawer'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { Badge } from '../../../components/ui/badge'
import { useAppToast } from '../../../lib/toast/useAppToast'

import type { Reservation, SchedulerView, StylistProfile } from '../types'
import {
  canAdminCancelReservation,
  canAdminConfirmAttendance,
  getReservationStatusColor,
  getReservationStatusLabel,
} from '../status'
import {
  addDateOnlyDays,
  addDateOnlyMonths,
  getDateOnlyFromLocalCalendarDate,
  getSalonDateOnly,
  parseDateOnly,
} from '../../../../../shared/business-date.mjs'

type SchedulerEvent = {
  id: string
  title: string
  start: Date
  end: Date
  resourceId: string
  status: string
  reservation: Reservation
}

const reservationStatusTranslationKey = (status: string, cancelReason?: string | null) =>
  status === 'CANCELLED_BY_CLIENT' && (cancelReason ?? '').trim() === 'Nije potvrđen dolazak u roku'
    ? 'reservations.statuses.CANCELLED_UNCONFIRMED_ATTENDANCE'
    : `reservations.statuses.${status}`

const SchedulerEventContent = ({ event }: { event: SchedulerEvent }) => {
  const { t } = useTranslation()
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
        {t(reservationStatusTranslationKey(event.status, event.reservation.cancelReason), {
          defaultValue: getReservationStatusLabel(event.status, event.reservation.cancelReason),
        })}
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
  gender?: 'MALE' | 'FEMALE'
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
    bookingMode: 'STANDARD' | 'STAFF_ADMIN_DIRECT'
    stylistProfileId?: string
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

const toYmd = (date: Date): string =>
  getDateOnlyFromLocalCalendarDate(date)
const toHm = (d: Date): string => format(d, 'HH:mm')

const toLocalCalendarDate = (dateOnly: string): Date => {
  const { year, month, day } = parseDateOnly(dateOnly)
  return new Date(year, month - 1, day, 12, 0, 0, 0)
}

const combineLocal = (dateStr: string, timeStr: string): Date => {
  const [yyyy, mm, dd] = dateStr.split('-').map((x) => Number(x))
  const [hh, mi] = timeStr.split(':').map((x) => Number(x))
  return new Date(yyyy, (mm ?? 1) - 1, dd ?? 1, hh ?? 0, mi ?? 0, 0, 0)
}

const stylistName = (s: StylistProfile | null | undefined, fallbackLabel: string): string => {
  if (!s?.user) return s?.id ?? fallbackLabel
  return [s.user.firstName, s.user.lastName].filter(Boolean).join(' ') || s.user.username || s.id
}

const reservationServices = (r: Reservation | null | undefined) => {
  const items = Array.isArray(r?.items) ? r?.items : []
  if (items.length > 0) {
    const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    return sorted
      .map((it) => it.service)
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
  }
  return r?.service ? [r.service] : []
}

const reservationServiceTitle = (r: Reservation, fallbackLabel: string): string => {
  const svcs = reservationServices(r)
  if (svcs.length === 0) return fallbackLabel
  const first = svcs[0]?.name ?? fallbackLabel
  const rest = svcs.length - 1
  return rest > 0 ? `${first} (+${rest})` : first
}

const reservationTotals = (r: Reservation): { totalMinutes: number; totalPrice: number } => {
  const svcs = reservationServices(r)
  const totalMinutes = svcs.reduce((acc, s) => acc + Number(s.durationMinutes ?? 0), 0)
  const totalPrice = svcs.reduce((acc, s) => acc + Number(s.price ?? 0), 0)
  return { totalMinutes, totalPrice }
}

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
      ...active.map((s) => ({
        id: s.id,
        title: stylistName(s, t('reservations.calendar.eventFallbacks.stylist')),
      })),
      ...(shouldShowUnassigned
        ? [{ id: 'unassigned', title: t('reservations.calendar.toolbar.unassigned') }]
        : []),
    ]
  }, [hasUnassignedReservations, props.selectedStylistIds, props.stylists, t])

  const events = useMemo(() => {
    const byStylists = new Set(props.selectedStylistIds)
    const filtered = props.selectedStylistIds.length
      ? props.reservations.filter((r) => (r.confirmedStylist?.id ? byStylists.has(r.confirmedStylist.id) : byStylists.has('unassigned')))
      : props.reservations

    return filtered
      .map((r): SchedulerEvent => {
        const serviceTitle = reservationServiceTitle(
          r,
          t('reservations.calendar.eventFallbacks.service'),
        )
        const clientTitle =
          [r.client?.firstName, r.client?.lastName].filter(Boolean).join(' ').trim() ||
          r.client?.username ||
          t('reservations.calendar.eventFallbacks.client')
        const title =
          r.status === 'AWAITING_DAILY_LOG'
            ? `${t('reservations.calendar.eventFallbacks.dailyLogPrefix')} • ${serviceTitle} • ${clientTitle}`
            : `${serviceTitle} • ${clientTitle}`
        const start = combineLocal(String(r.reservationDate).slice(0, 10), r.startTime)
        const end = combineLocal(String(r.reservationDate).slice(0, 10), r.endTime)
        const resourceId = getReservationResourceId(r)
        return { id: r.id, title, start, end, resourceId, status: r.status, reservation: r }
      })
      .filter((e) => !Number.isNaN(e.start.getTime()) && !Number.isNaN(e.end.getTime()))
  }, [props.reservations, props.selectedStylistIds, t])

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
  const [confirmingAttendance, setConfirmingAttendance] = useState(false)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clients, setClients] = useState<ClientOption[]>([])
  const serviceDropdownRef = useRef<HTMLDivElement | null>(null)
  const [showServiceDropdown, setShowServiceDropdown] = useState(false)
  const [createDraft, setCreateDraft] = useState<{
    bookingMode: 'STANDARD' | 'STAFF_ADMIN_DIRECT'
    stylistProfileId: string
    clientSearch: string
    clientId: string
    serviceSearch: string
    serviceIds: string[]
    reservationDate: string
    startTime: string
    endTime: string
    clientNotes: string
  }>({
    bookingMode: 'STANDARD',
    stylistProfileId: '',
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
      setServices(await fetchAllPublicServices<ServiceOption>({ activeOnly: 'true' }))
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

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === createDraft.clientId) ?? null,
    [clients, createDraft.clientId],
  )

  const filteredServices = useMemo(() => {
    const q = createDraft.serviceSearch.trim().toLowerCase()
    const base = selectedClient?.gender ? services.filter((s: any) => s.gender === selectedClient.gender) : services
    if (!q) return base
    return base.filter((s) => s.name.toLowerCase().includes(q))
  }, [createDraft.serviceSearch, selectedClient?.gender, services])

  const servicesById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node)) {
        setShowServiceDropdown(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const isServiceSelected = useCallback((id: string) => createDraft.serviceIds.includes(id), [createDraft.serviceIds])

  const toggleServiceId = useCallback(
    (id: string) => {
      if (!createDraft.clientId) {
        toast.warning(t('reservations.calendar.create.selectClientFirst'))
        return
      }
      setCreateDraft((prev) => {
        const exists = prev.serviceIds.includes(id)
        const next = exists ? prev.serviceIds.filter((x) => x !== id) : [...prev.serviceIds, id]
        return { ...prev, serviceIds: next }
      })
      setShowServiceDropdown(true)
    },
    [createDraft.clientId, t, toast],
  )

  const selectedServices = useMemo(
    () => createDraft.serviceIds.map((id) => servicesById.get(id)).filter((x): x is ServiceOption => Boolean(x)),
    [createDraft.serviceIds, servicesById],
  )

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

  const messages = useMemo(
    () => ({
      today: t('reservations.calendar.messages.today'),
      previous: t('reservations.calendar.messages.previous'),
      next: t('reservations.calendar.messages.next'),
      month: t('reservations.calendar.messages.month'),
      week: t('reservations.calendar.messages.week'),
      day: t('reservations.calendar.messages.day'),
      agenda: t('reservations.calendar.messages.agenda'),
      date: t('reservations.calendar.messages.date'),
      time: t('reservations.calendar.messages.time'),
      event: t('reservations.calendar.messages.event'),
      allDay: t('reservations.calendar.messages.allDay'),
      work_week: t('reservations.calendar.messages.workWeek'),
      yesterday: t('reservations.calendar.messages.yesterday'),
      tomorrow: t('reservations.calendar.messages.tomorrow'),
      showMore: (total: number) =>
        t('reservations.calendar.messages.showMore', { total }),
      noEventsInRange: t('reservations.calendar.messages.noEventsInRange'),
    }),
    [t],
  )

  const openCreate = (slot?: SlotInfo) => {
    const start = slot?.start instanceof Date ? slot.start : new Date(props.date)
    const end = slot?.end instanceof Date ? slot.end : new Date(props.date)
    const preselectedStylistId =
      props.selectedStylistIds.length === 1 && props.selectedStylistIds[0] !== 'unassigned'
        ? props.selectedStylistIds[0] ?? ''
        : ''
    setCreateDraft({
      bookingMode: 'STANDARD',
      stylistProfileId: preselectedStylistId,
      clientSearch: '',
      clientId: '',
      serviceSearch: '',
      serviceIds: [],
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

  const shiftDate = (direction: -1 | 1) => {
    const current = toYmd(props.date)
    const dateOnly =
      view === Views.MONTH
        ? addDateOnlyMonths(current, direction)
        : addDateOnlyDays(current, direction * (view === Views.DAY ? 1 : 7))
    props.onDateChange(toLocalCalendarDate(dateOnly))
  }

  const handlePrev = () => shiftDate(-1)
  const handleNext = () => shiftDate(1)

  return (
    <div className="bg-white dark:bg-slate-950">
      <div className="border-b border-slate-200 dark:border-slate-800 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-slate-500" aria-hidden="true" />
            <div className="font-semibold text-slate-900 dark:text-slate-50">
              {t('reservations.calendar.toolbar.title')}
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {props.selectedStylistIds.length
                ? t('reservations.calendar.toolbar.selectedStylistsCount', { count: props.selectedStylistIds.length })
                : t('reservations.calendar.toolbar.allStylists')}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openCreate()}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              {t('reservations.calendar.toolbar.newAppointment')}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => props.onDateChange(toLocalCalendarDate(getSalonDateOnly()))}
            >
              {messages.today}
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label={t('reservations.calendar.toolbar.previous')} onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label={t('reservations.calendar.toolbar.next')} onClick={handleNext}>
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
            <span>{t('reservations.calendar.toolbar.stylists')}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={props.selectedStylistIds.length === 0 ? 'rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white' : 'rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-200'}
                onClick={() => props.onSelectedStylistIdsChange([])}
              >
                {t('reservations.calendar.toolbar.all')}
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
              { status: 'CONFIRMED', label: t('reservations.statuses.CONFIRMED') },
              { status: 'PENDING', label: t('reservations.statuses.PENDING') },
              { status: 'AWAITING_DAILY_LOG', label: t('reservations.calendar.toolbar.dailyLog') },
              { status: 'CANCELLED_BY_CLIENT', label: t('reservations.statuses.CANCELLED_BY_CLIENT') },
              { status: 'COMPLETED', label: t('reservations.statuses.COMPLETED') },
            ].map((x) => (
              <span key={x.status} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 dark:border-slate-800 dark:bg-slate-950">
                <span
                  className={
                    x.status === 'COMPLETED'
                      ? 'h-2 w-2 rounded-full bg-emerald-500'
                      : x.status === 'PENDING' || x.status === 'AWAITING_DAILY_LOG'
                        ? 'h-2 w-2 rounded-full bg-amber-500'
                        : x.status.startsWith('CANCELLED')
                          ? 'h-2 w-2 rounded-full bg-rose-500'
                          : 'h-2 w-2 rounded-full bg-brand-gold-ring'
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
        <DrawerContent side="right" className="flex flex-col">
          <div className="h-full overflow-y-auto p-5">
            {drawerMode === 'details' && activeReservation ? (
              <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">{t('reservations.calendar.details.status')}</p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">
                  {t(reservationStatusTranslationKey(activeReservation.status, activeReservation.cancelReason), {
                    defaultValue: getReservationStatusLabel(activeReservation.status, activeReservation.cancelReason),
                  })}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500">{t('reservations.calendar.details.appointment')}</p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-slate-50">
                    {String(activeReservation.reservationDate).slice(0, 10)} • {activeReservation.startTime}–{activeReservation.endTime}
                  </p>
                  {activeReservation.items && activeReservation.items.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {[...activeReservation.items]
                        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                        .map((it) => (
                          <div
                            key={it.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/30"
                          >
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{it.service?.name ?? '-'}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {Number(it.service?.durationMinutes ?? 0)} min | {Number(it.service?.price ?? 0).toFixed(2)} KM
                            </p>
                          </div>
                        ))}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
                        <p className="font-medium text-slate-900 dark:text-slate-50">{t('reservations.calendar.details.total')}</p>
                        <p className="text-slate-700 dark:text-slate-300">
                          {reservationTotals(activeReservation).totalMinutes} min |{' '}
                          {reservationTotals(activeReservation).totalPrice.toFixed(2)} KM
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{activeReservation.service?.name ?? '-'}</p>
                  )}
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('reservations.calendar.details.client')}:{' '}
                    {[activeReservation.client?.firstName, activeReservation.client?.lastName].filter(Boolean).join(' ').trim() ||
                      activeReservation.client?.username ||
                      '-'}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t('reservations.calendar.details.stylist')}: {activeReservation.confirmedStylist ? stylistName(activeReservation.confirmedStylist, t('reservations.calendar.eventFallbacks.stylist')) : t('reservations.calendar.details.unconfirmed')}
                  </p>
                </div>

                {activeReservation.clientNotes ? (
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs text-slate-500">{t('reservations.calendar.details.clientNotes')}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900 dark:text-slate-50">
                      {activeReservation.clientNotes}
                    </p>
                  </div>
                ) : null}

                {activeReservation.cancelReason ? (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 dark:border-rose-900/40 dark:bg-rose-950/20">
                    <p className="text-xs text-rose-700 dark:text-rose-300">{t('reservations.calendar.details.cancelReason')}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-rose-900 dark:text-rose-200">
                      {activeReservation.cancelReason}
                    </p>
                  </div>
                ) : null}

                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('reservations.calendar.details.editAppointment')}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeReservation.status === 'AWAITING_DAILY_LOG'
                      ? t('reservations.calendar.details.dailyLogMoveHelp')
                      : t('reservations.calendar.details.editHelp')}
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>{t('reservations.calendar.details.date')}</Label>
                      <Input
                        type="date"
                        value={editDraft.reservationDate}
                        onChange={(e) => setEditDraft((p) => ({ ...p, reservationDate: e.target.value }))}
                        disabled={savingEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('reservations.calendar.details.startTime')}</Label>
                      <Input
                        type="time"
                        value={editDraft.startTime}
                        onChange={(e) => setEditDraft((p) => ({ ...p, startTime: e.target.value }))}
                        disabled={savingEdit}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('reservations.calendar.details.endTime')}</Label>
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
                          toast.error(getErrorMessage(err, t('reservations.calendar.details.saveError')))
                        } finally {
                          setSavingEdit(false)
                        }
                      }}
                    >
                      {savingEdit
                        ? t('reservations.calendar.details.saving')
                        : t('reservations.calendar.details.saveChanges')}
                    </Button>
                  </div>
                </div>

                {activeReservation.status === 'AWAITING_DAILY_LOG' ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('reservations.calendar.details.dailyLogTitle')}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                      {t('reservations.calendar.details.dailyLogHelp')}
                    </p>
                    <Button type="button" variant="outline" className="mt-3" asChild>
                      <Link to="/admin/daily-log">{t('reservations.calendar.details.openDailyLog')}</Link>
                    </Button>
                  </div>
                ) : null}

                {canAdminConfirmAttendance(activeReservation) ? (
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('reservations.calendar.details.confirmAttendanceTitle')}</p>
                    <p className="mt-1 text-xs text-slate-500">{t('reservations.calendar.details.confirmAttendanceHelp')}</p>
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        disabled={confirmingAttendance}
                        onClick={async () => {
                          if (!activeReservation) return
                          setConfirmingAttendance(true)
                          try {
                            await api.post(`/api/reservations/${activeReservation.id}/staff-confirm-attendance`)
                            toast.success(t('reservations.calendar.details.attendanceConfirmed'))
                            setDrawerOpen(false)
                          } catch (err) {
                            toast.error(getErrorMessage(err, t('reservations.calendar.details.attendanceConfirmError')))
                          } finally {
                            setConfirmingAttendance(false)
                          }
                        }}
                      >
                        {confirmingAttendance
                          ? t('reservations.calendar.details.confirmingAttendance')
                          : t('reservations.calendar.details.confirmAttendance')}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {canAdminCancelReservation(activeReservation.status) ? (
                  <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('reservations.calendar.details.cancelTitle')}</p>
                    <p className="mt-1 text-xs text-slate-500">{t('reservations.calendar.details.cancelHelp')}</p>
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder={t('reservations.calendar.details.cancelReasonPlaceholder')}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)} disabled={cancelling}>
                          {t('reservations.calendar.details.close')}
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
                              toast.error(getErrorMessage(err, t('reservations.calendar.details.cancelError')))
                            } finally {
                              setCancelling(false)
                            }
                          }}
                        >
                          {cancelling
                            ? t('reservations.calendar.details.cancelling')
                            : t('reservations.calendar.details.cancelAction')}
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
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('reservations.calendar.create.title')}</p>
                  <p className="text-xs text-slate-500">{t('reservations.calendar.create.subtitle')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('reservations.calendar.create.bookingMode')}</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className={
                      createDraft.bookingMode === 'STANDARD'
                        ? 'rounded-lg border border-slate-900 bg-slate-900 px-3 py-3 text-left text-sm text-white'
                        : 'rounded-lg border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
                    }
                    onClick={() =>
                      setCreateDraft((p) => ({ ...p, bookingMode: 'STANDARD', stylistProfileId: '' }))
                    }
                  >
                    <div className="font-semibold">{t('reservations.calendar.create.standardTitle')}</div>
                    <div className="mt-1 text-xs opacity-80">
                      {t('reservations.calendar.create.standardDescription')}
                    </div>
                  </button>
                  <button
                    type="button"
                    className={
                      createDraft.bookingMode === 'STAFF_ADMIN_DIRECT'
                        ? 'rounded-lg border border-slate-900 bg-slate-900 px-3 py-3 text-left text-sm text-white'
                        : 'rounded-lg border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
                    }
                    onClick={() => setCreateDraft((p) => ({ ...p, bookingMode: 'STAFF_ADMIN_DIRECT' }))}
                  >
                    <div className="font-semibold">{t('reservations.calendar.create.directTitle')}</div>
                    <div className="mt-1 text-xs opacity-80">
                      {t('reservations.calendar.create.directDescription')}
                    </div>
                  </button>
                </div>
              </div>

              {createDraft.bookingMode === 'STAFF_ADMIN_DIRECT' ? (
                <div className="space-y-2">
                  <Label>{t('reservations.calendar.create.stylist')}</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {props.stylists.map((stylist) => {
                      const label = stylistName(stylist, t('reservations.calendar.eventFallbacks.stylist'))
                      const active = createDraft.stylistProfileId === stylist.id
                      return (
                        <button
                          key={stylist.id}
                          type="button"
                          className={
                            active
                              ? 'rounded-lg border border-brand-gold-ring bg-brand-champagne/20 px-3 py-2 text-left text-sm'
                              : 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900/40'
                          }
                          onClick={() => setCreateDraft((p) => ({ ...p, stylistProfileId: stylist.id }))}
                        >
                          <div className="font-medium text-slate-900 dark:text-slate-50">{label}</div>
                          <div className="text-xs text-slate-500">{stylist.id}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>{t('reservations.calendar.create.client')}</Label>
                <Input
                  placeholder={t('reservations.calendar.create.clientSearchPlaceholder')}
                  value={createDraft.clientSearch}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, clientSearch: e.target.value, clientId: '' }))}
                />
                {clientsLoading ? <p className="text-xs text-slate-500">{t('reservations.calendar.create.loadingClients')}</p> : null}
                {createDraft.clientId ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {t('reservations.calendar.create.selectedClient')}: <span className="font-semibold">{createDraft.clientId}</span>
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
                        onClick={() =>
                          setCreateDraft((p) => {
                            const hasMismatch =
                              c.gender &&
                              p.serviceIds.length > 0 &&
                              p.serviceIds
                                .map((id) => servicesById.get(id))
                                .filter(Boolean)
                                .some((s: any) => s?.gender && s.gender !== c.gender)

                            return {
                              ...p,
                              clientId: c.id,
                              clientSearch: label,
                              serviceIds: hasMismatch ? [] : p.serviceIds,
                              serviceSearch: hasMismatch ? '' : p.serviceSearch,
                            }
                          })
                        }
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
                <Label>{t('reservations.calendar.create.service')}</Label>
                {!createDraft.clientId ? (
                  <p className="text-xs text-slate-500">{t('reservations.calendar.create.serviceGenderHint')}</p>
                ) : null}
                <div ref={serviceDropdownRef} className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    className="pl-9"
                    disabled={!createDraft.clientId}
                    placeholder={
                      !createDraft.clientId
                        ? t('reservations.calendar.create.selectClientPlaceholder')
                        : t('reservations.calendar.create.serviceSearchPlaceholder')
                    }
                    value={createDraft.serviceSearch}
                    onChange={(e) => {
                      const v = e.target.value
                      setCreateDraft((p) => ({ ...p, serviceSearch: v }))
                      setShowServiceDropdown(true)
                    }}
                    onFocus={() => setShowServiceDropdown(true)}
                  />
                  {showServiceDropdown && filteredServices.length > 0 ? (
                    <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950">
                      {filteredServices.map((svc) => (
                        <li
                          key={svc.id}
                          className="cursor-pointer px-3 py-2 hover:bg-brand-champagne/20"
                          onMouseDown={(ev) => ev.preventDefault()}
                          onClick={() => toggleServiceId(svc.id)}
                        >
                          <div className="flex justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2">
                              {isServiceSelected(svc.id) ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                              {svc.name}
                            </span>
                            <span className="text-slate-500">{Number(svc.price ?? 0).toFixed(2)} KM</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {selectedServices.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {selectedServices.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-50">{s.name}</div>
                          <div className="text-xs text-slate-500">{Number(s.price ?? 0).toFixed(2)} KM</div>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => toggleServiceId(s.id)}>
                          {t('reservations.calendar.create.removeService')}
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t('reservations.calendar.details.date')}</Label>
                  <Input
                    type="date"
                    value={createDraft.reservationDate}
                    onChange={(e) => setCreateDraft((p) => ({ ...p, reservationDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('reservations.calendar.details.startTime')}</Label>
                  <Input
                    type="time"
                    value={createDraft.startTime}
                    onChange={(e) => setCreateDraft((p) => ({ ...p, startTime: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('reservations.calendar.details.endTime')}</Label>
                  <Input
                    type="time"
                    value={createDraft.endTime}
                    onChange={(e) => setCreateDraft((p) => ({ ...p, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('reservations.calendar.create.clientNote')}</Label>
                <Textarea
                  value={createDraft.clientNotes}
                  onChange={(e) => setCreateDraft((p) => ({ ...p, clientNotes: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setDrawerOpen(false)}>
                  {t('reservations.calendar.details.close')}
                </Button>
                <Button
                  type="button"
                  onClick={async () => {
                    try {
                      await props.onCreateRequest({
                        clientId: createDraft.clientId.trim(),
                        bookingMode: createDraft.bookingMode,
                        stylistProfileId:
                          createDraft.bookingMode === 'STAFF_ADMIN_DIRECT'
                            ? createDraft.stylistProfileId.trim() || undefined
                            : undefined,
                        serviceIds: createDraft.serviceIds.map((x) => x.trim()).filter(Boolean),
                        reservationDate: createDraft.reservationDate,
                        startTime: createDraft.startTime,
                        endTime: createDraft.endTime,
                        clientNotes: createDraft.clientNotes.trim() || undefined,
                      })
                      setDrawerOpen(false)
                    } catch (err) {
                      toast.error(getErrorMessage(err, t('reservations.calendar.createError')))
                    }
                  }}
                  disabled={
                    !createDraft.clientId.trim() ||
                    (createDraft.bookingMode === 'STAFF_ADMIN_DIRECT' &&
                      !createDraft.stylistProfileId.trim()) ||
                    createDraft.serviceIds.length === 0 ||
                    !createDraft.reservationDate ||
                    !createDraft.startTime ||
                    !createDraft.endTime
                  }
                >
                  {t('reservations.calendar.create.submit')}
                </Button>
              </div>
              </div>
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

