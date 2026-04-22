import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { useSocketEvent } from '../../context/SocketContext'
import { useAppToast } from '../../lib/toast/useAppToast'

interface ServiceOption {
  id: string
  name: string
  durationMinutes: number
  price?: string
  gender: 'MALE' | 'FEMALE'
  shortDescription?: string
  subcategory?: { name: string; category?: { name: string } }
}

interface DateAvailability {
  date: string
  available: boolean
}

interface SlotOption {
  startTime: string
  endTime: string
  availableStylistCount: number
}

interface LoyaltyInfo {
  enabled: boolean
  hasAccount: boolean
  redeemEnabled?: boolean
  points?: number
  tier?: string | null
  tierMaxDiscountPercent?: number
  globalMaxDiscountPercent?: number
  service?: {
    id: string
    maxDiscountPercent: number
  } | null
}

const MotionDiv = motion.div

const MONTHS_BS = [
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'August',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
]

const ServiceAutocomplete = ({
  services,
  loading,
  selected,
  onSelect,
}: {
  services: ServiceOption[]
  loading: boolean
  selected: ServiceOption[]
  onSelect: (next: ServiceOption[]) => void
}) => {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return services
    const q = query.toLowerCase()
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.subcategory?.name?.toLowerCase().includes(q) ||
        s.subcategory?.category?.name?.toLowerCase().includes(q),
    )
  }, [query, services])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (selected.length > 0) {
    const totalMinutes = selected.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0)
    return (
      <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50 p-3">
        <div>
          <div className="font-semibold text-slate-900">Odabrani servisi</div>
          <div className="mt-2 space-y-2">
            {selected.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{s.name}</div>
                  <div className="mt-0.5 text-xs text-slate-600">{s.durationMinutes} min</div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onSelect(selected.filter((x) => x.id !== s.id))
                  }}
                >
                  Ukloni
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              Ukupno: {totalMinutes} min
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setOpen(true)
            }}
          >
            Dodaj još
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              onSelect([])
              setQuery('')
            }}
          >
            Očisti
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Pretražite usluge po imenu..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className="pl-9"
        />
        {loading ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
            Učitavanje…
          </div>
        ) : null}
      </div>
      {open && !loading ? (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="max-h-[280px] overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">Nema rezultata.</div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="w-full text-left px-3 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                  onClick={() => {
                    onSelect([...selected, s])
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {s.name}
                      </div>
                      {s.subcategory?.category ? (
                        <div className="text-xs text-slate-500">
                          {s.subcategory.category.name} → {s.subcategory.name}
                        </div>
                      ) : null}
                    </div>
                    <span className="text-xs font-semibold rounded-full border border-slate-200/80 bg-white px-2 py-1 text-slate-700">
                      {s.durationMinutes} min
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const ReservationCalendar = ({
  availableDates,
  selectedDate,
  onSelectDate,
  loading,
  disabled,
}: {
  availableDates: Map<string, boolean>
  selectedDate: string
  onSelectDate: (date: string) => void
  loading: boolean
  disabled: boolean
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })

  const today = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])

  const daysInMonth = useMemo(
    () => new Date(currentMonth.year, currentMonth.month + 1, 0).getDate(),
    [currentMonth],
  )

  const firstDayOfWeek = useMemo(() => {
    const day = new Date(currentMonth.year, currentMonth.month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }, [currentMonth])

  const canGoPrev = useMemo(() => {
    const now = new Date()
    return (
      currentMonth.year > now.getFullYear() ||
      (currentMonth.year === now.getFullYear() && currentMonth.month > now.getMonth())
    )
  }, [currentMonth])

  const cells = useMemo(() => {
    const result: Array<{
      day: number
      dateStr: string
      available: boolean
      isPast: boolean
      isToday: boolean
    }> = []
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isPast = dateStr < today
      const available = !isPast && (availableDates.get(dateStr) ?? false)
      result.push({ day: d, dateStr, available, isPast, isToday: dateStr === today })
    }
    return result
  }, [availableDates, currentMonth, daysInMonth, today])

  if (loading) {
    return <div className="h-[200px] flex items-center justify-center text-slate-600">Učitavanje…</div>
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!canGoPrev || disabled}
          onClick={() =>
            setCurrentMonth((prev) =>
              prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 },
            )
          }
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="font-semibold text-slate-900">
          {MONTHS_BS[currentMonth.month]} {currentMonth.year}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() =>
            setCurrentMonth((prev) =>
              prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 },
            )
          }
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'].map((d) => (
          <div key={d} className="text-center py-1 text-xs font-semibold text-slate-500 uppercase">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}
        {cells.map(({ day, dateStr, available, isPast, isToday }) => {
          const isSelected = dateStr === selectedDate
          const disabledCell = disabled || !available
          const title = available ? 'Dostupan' : isPast ? 'Prošao' : 'Nedostupan'
          return (
            <button
              key={dateStr}
              type="button"
              title={title}
              disabled={disabledCell}
              className={[
                'h-10 w-full rounded-md text-sm transition',
                isSelected ? 'bg-slate-900 text-white font-semibold' : 'bg-transparent text-slate-700',
                !available ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-100',
                isToday && !isSelected ? 'border-2 border-slate-300' : 'border border-transparent',
              ].join(' ')}
              onClick={() => onSelectDate(dateStr)}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900" /> Odabrano
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200 border border-slate-300" /> Dostupno
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Nedostupno
        </div>
      </div>
    </div>
  )
}

export default function PublicReserve() {
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useAppToast()
  const { user, token, isReady, refreshProfile } = useAuth()

  const [services, setServices] = useState<ServiceOption[]>([])
  const [selectedServices, setSelectedServices] = useState<ServiceOption[]>([])
  const [availableDatesMap, setAvailableDatesMap] = useState<Map<string, boolean>>(new Map())
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<SlotOption[]>([])
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null)
  const [notes, setNotes] = useState('')
  const [loadingServices, setLoadingServices] = useState(true)
  const [loadingDates, setLoadingDates] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null)
  const [desiredLoyaltyPercent, setDesiredLoyaltyPercent] = useState<number>(0)
  const dateSectionRef = useRef<HTMLDivElement | null>(null)

  const servicesForGender = useMemo(() => {
    if (!user?.gender) return []
    return services.filter((service) => service.gender === user.gender)
  }, [services, user?.gender])

  useEffect(() => {
    if (!isReady) return
    if (!token) {
      navigate('/login', { state: { from: '/rezervacija' }, replace: true })
      return
    }
    if (user?.mustChangePassword) {
      navigate('/force-change-password', { replace: true })
      return
    }
    if (!user?.email || !user?.phone || !user?.isEmailVerified) {
      navigate('/profil', { replace: true })
      return
    }
    if (!user?.gender) {
      navigate('/profil', { replace: true })
      return
    }
    api
      .get<ServiceOption[]>('/api/services', { params: { activeOnly: 'true' } })
      .then((r) => setServices(Array.isArray(r.data) ? r.data : []))
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false))
  }, [isReady, token, navigate, user])

  useEffect(() => {
    if (loadingServices) return
    if (selectedServices.length > 0) return
    if (!user?.gender) return
    const serviceId = (searchParams.get('serviceId') ?? '').trim()
    if (!serviceId) return
    const match = servicesForGender.find((s) => s.id === serviceId) ?? null
    if (!match) return
    setSelectedServices([match])
    window.setTimeout(
      () => dateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50,
    )
  }, [loadingServices, searchParams, servicesForGender, selectedServices.length, user?.gender])

  const loadAvailability = useCallback((serviceIds: string[]) => {
    setLoadingDates(true)
    const from = new Date()
    const to = new Date()
    to.setDate(to.getDate() + 60)
    api
      .get<DateAvailability[]>('/api/reservations/availability/dates', {
        params: {
          serviceIds: serviceIds.join(','),
          fromDate: from.toISOString().slice(0, 10),
          toDate: to.toISOString().slice(0, 10),
        },
      })
      .then((r) => {
        const map = new Map<string, boolean>()
        if (Array.isArray(r.data)) {
          r.data.forEach((d) => map.set(d.date, d.available))
        }
        setAvailableDatesMap(map)
      })
      .catch(() => setAvailableDatesMap(new Map()))
      .finally(() => setLoadingDates(false))
  }, [])

  const selectedServiceIds = useMemo(() => selectedServices.map((s) => s.id), [selectedServices])

  useEffect(() => {
    if (selectedServiceIds.length === 0) {
      setAvailableDatesMap(new Map())
      setSelectedDate('')
      setSlots([])
      setSelectedSlot(null)
      setStep(1)
      return
    }
    setStep(2)
    loadAvailability(selectedServiceIds)
    setSelectedDate('')
    setSlots([])
    setSelectedSlot(null)
  }, [selectedServiceIds, loadAvailability])

  useEffect(() => {
    if (selectedServiceIds.length === 0 || !selectedDate) {
      setSlots([])
      setSelectedSlot(null)
      setLoyaltyInfo(null)
      setDesiredLoyaltyPercent(0)
      return
    }
    setLoadingSlots(true)
    setStep(3)
    api
      .get<SlotOption[]>('/api/reservations/availability/slots', {
        params: { serviceIds: selectedServiceIds.join(','), date: selectedDate },
      })
      .then((r) => setSlots(Array.isArray(r.data) ? r.data : []))
      .catch(() => setSlots([]))
      .finally(() => {
        setLoadingSlots(false)
        setSelectedSlot(null)
      })
  }, [selectedServiceIds, selectedDate])

  useSocketEvent(
    'availability:changed',
    useCallback(
      (data: unknown) => {
        const d = data as { serviceId?: string; serviceIds?: string[]; date: string }
        const intersects =
          selectedServiceIds.length > 0 &&
          (Array.isArray(d.serviceIds)
            ? d.serviceIds.some((x) => selectedServiceIds.includes(x))
            : d.serviceId
              ? selectedServiceIds.includes(d.serviceId)
              : false)
        if (intersects) {
          loadAvailability(selectedServiceIds)
          if (selectedDate === d.date) {
            api
              .get<SlotOption[]>('/api/reservations/availability/slots', {
                params: { serviceIds: selectedServiceIds.join(','), date: selectedDate },
              })
              .then((r) => setSlots(Array.isArray(r.data) ? r.data : []))
              .catch(() => {})
          }
        }
      },
      [selectedServiceIds, selectedDate, loadAvailability],
    ),
  )

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (selectedServiceIds.length === 0 || !selectedDate || !selectedSlot) return
    if (
      user?.mustChangePassword ||
      user?.genderOnboardingCompleted !== true ||
      !user?.email ||
      !user?.isEmailVerified
    ) {
      toast.warning('Prije rezervacije morate ažurirati profil i verifikovati email.')
      navigate('/profil')
      return
    }
    setSubmitting(true)
    try {
      await api.post('/api/reservations', {
        serviceIds: selectedServiceIds,
        reservationDate: selectedDate,
        startTime: selectedSlot.start,
        endTime: selectedSlot.end,
        ...(notes.trim() && { clientNotes: notes.trim() }),
        ...(desiredLoyaltyPercent > 0 && { desiredLoyaltyPercent }),
      })
      await refreshProfile().catch(() => {})
      const svcLabel =
        selectedServices.length === 1
          ? selectedServices[0]!.name
          : `${selectedServices[0]!.name} + ${selectedServices.length - 1}`
      toast.success(
        t('public.reserve.success'),
        `${svcLabel} - ${new Date(selectedDate).toLocaleDateString('bs-BA')} u ${selectedSlot.start}`,
      )
      setSelectedServices([])
      setSelectedDate('')
      setSelectedSlot(null)
      setNotes('')
      setStep(1)
      setLoyaltyInfo(null)
      setDesiredLoyaltyPercent(0)
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('common.error')
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  const bgUrl = getSetting(
    'public_reserve_bg',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=2000',
  )

  return (
    <div className="min-h-screen pt-8 pb-20 relative bg-white">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.04]"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />

      <MotionDiv
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mx-auto max-w-2xl px-4"
      >
        <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-soft">
          <CardContent className="p-6 md:p-10">
            <div className="text-center">
              <div className="text-2xl font-semibold tracking-tight text-slate-950">
                {getSetting('public_reserve_title', 'Rezervišite Vaš Termin')}
              </div>
              <div className="text-slate-600 mt-2">
                {getSetting(
                  'public_reserve_subtitle',
                  'Osigurajte svoje vrijeme za savršenu frizuru u nekoliko jednostavnih koraka.',
                )}
              </div>
            </div>

            <div className="flex items-center justify-center mt-8">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={[
                      'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition',
                      step >= s ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600',
                    ].join(' ')}
                  >
                    {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                  </div>
                  {s < 4 ? (
                    <div className={step > s ? 'h-0.5 w-10 bg-slate-900' : 'h-0.5 w-10 bg-slate-200'} />
                  ) : null}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">
                  {t('public.reserve.selectService')}
                </Label>
                <ServiceAutocomplete
                  services={servicesForGender}
                  loading={loadingServices}
                  selected={selectedServices}
                  onSelect={setSelectedServices}
                />
              </div>

              {selectedServices.length > 0 ? (
                <MotionDiv
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-2" ref={dateSectionRef}>
                    <Label className="text-slate-700 font-semibold">
                      {t('public.reserve.selectDate')}
                    </Label>
                    <ReservationCalendar
                      availableDates={availableDatesMap}
                      selectedDate={selectedDate}
                      onSelectDate={(d) => setSelectedDate(d)}
                      loading={loadingDates}
                      disabled={selectedServices.length === 0}
                    />
                  </div>
                </MotionDiv>
              ) : null}

              {selectedDate ? (
                <MotionDiv
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">
                      {t('public.reserve.selectTime')}{' '}
                      <span className="font-normal text-slate-500 text-sm ml-2">
                        (
                        {new Date(selectedDate).toLocaleDateString('bs-BA', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                        )
                      </span>
                    </Label>

                    {loadingSlots ? (
                      <div className="py-4 text-center text-slate-600">Učitavanje…</div>
                    ) : slots.length === 0 ? (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-center text-sm text-orange-800">
                        Nema dostupnih termina za odabrani datum. Pokušajte drugi datum.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {slots.map((slot) => {
                          const isSelected =
                            selectedSlot?.start === slot.startTime &&
                            selectedSlot?.end === slot.endTime
                          const now = new Date()
                          const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                          const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                          const isPastSlot = selectedDate === todayLocal && slot.startTime < nowHHMM
                          return (
                            <button
                              key={`${slot.startTime}-${slot.endTime}`}
                              type="button"
                              disabled={isPastSlot}
                              className={[
                                'rounded-md border px-3 py-2 text-left transition',
                                isSelected
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-200 bg-white hover:bg-slate-50',
                                isPastSlot ? 'opacity-40 cursor-not-allowed' : '',
                              ].join(' ')}
                              onClick={() => {
                                if (isPastSlot) return
                                setSelectedSlot({ start: slot.startTime, end: slot.endTime })
                                setStep(4)
                                api
                                  .get<LoyaltyInfo>('/api/loyalty/client/me', {
                                    params: { serviceIds: selectedServiceIds.join(',') },
                                  })
                                  .then((r) => setLoyaltyInfo(r.data))
                                  .catch(() => setLoyaltyInfo(null))
                                setDesiredLoyaltyPercent(0)
                              }}
                            >
                              <div className="text-sm font-semibold">
                                {slot.startTime}
                              </div>
                              <div className={isSelected ? 'text-xs opacity-80' : 'text-xs text-slate-500'}>
                                {slot.availableStylistCount}{' '}
                                {slot.availableStylistCount === 1 ? 'stilist' : 'stilista'}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </MotionDiv>
              ) : null}

              {selectedSlot ? (
                <MotionDiv
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-semibold">
                      {t('public.reserve.notes')}
                    </Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Posebne želje, napomene za stilista..."
                    />
                  </div>

                  {loyaltyInfo &&
                  loyaltyInfo.enabled &&
                  loyaltyInfo.redeemEnabled &&
                  loyaltyInfo.hasAccount &&
                  loyaltyInfo.service &&
                  loyaltyInfo.service.maxDiscountPercent > 0 ? (
                    <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <div className="font-semibold text-purple-900 mb-2">
                        Loyalty popust
                      </div>
                      <div className="text-sm text-purple-900">
                        Status: {loyaltyInfo.tier ?? 'Nema nivoa'} · Dostupno bodova:{' '}
                        {loyaltyInfo.points ?? 0}
                      </div>
                      <div className="text-sm text-purple-900">
                        Maksimalan popust za ovu uslugu:{' '}
                        {loyaltyInfo.service.maxDiscountPercent}%
                      </div>
                      <div className="mt-3 flex items-end gap-3">
                        <div className="flex-1 space-y-2">
                          <Label className="text-purple-900 font-semibold">
                            Koliki popust želite iskoristiti?
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={loyaltyInfo.service.maxDiscountPercent}
                            step={1}
                            value={desiredLoyaltyPercent}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              setDesiredLoyaltyPercent(
                                Math.max(
                                  0,
                                  Math.min(val || 0, loyaltyInfo.service!.maxDiscountPercent),
                                ),
                              )
                            }}
                          />
                        </div>
                        <div className="pb-2 text-sm text-purple-900 font-semibold">%</div>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                    <div className="font-semibold text-slate-950 mb-2">
                      Pregled rezervacije:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-slate-500">Usluga</div>
                        <div className="font-semibold">
                          {selectedServices.length === 1
                            ? selectedServices[0]!.name
                            : `${selectedServices[0]!.name} + ${selectedServices.length - 1}`}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Trajanje</div>
                        <div className="font-semibold">
                          {selectedServices.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0)} minuta
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Datum</div>
                        <div className="font-semibold">
                          {new Date(selectedDate).toLocaleDateString('bs-BA', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Termin</div>
                        <div className="font-semibold">
                          {selectedSlot.start} - {selectedSlot.end}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-4"
                    disabled={submitting || !selectedSlot}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {submitting ? 'Slanje rezervacije…' : t('public.reserve.submit')}
                    </span>
                  </Button>
                </MotionDiv>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </MotionDiv>
    </div>
  )
}

