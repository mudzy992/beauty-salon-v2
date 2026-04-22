import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import { useAppToast } from '../../../lib/toast/useAppToast'
import { useStylistProfileMe } from '../../stylist-workbook/hooks/useStylistProfileMe'
import { proposeReschedule } from '../../stylist-workbook/api/stylist-workbook.api'
import type { RescheduleMode } from '../../stylist-workbook/types'
import { fetchStylistReservations } from '../api/stylist-portal.api'
import { useClientDebts, useReservationActions, useSelectedDebtSum, useStylistReservationDetail } from '../hooks/useStylistReservationDetail'
import type { Reservation, ReservationStatus } from '../types'

const formatTime = (t: string) => t?.slice(0, 5) ?? t

const formatDate = (iso: string) => {
  const d = new Date(iso.slice(0, 10))
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('bs-BA', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })
}

const getStatusVariant = (status: ReservationStatus) => {
  if (status === 'IN_PROGRESS') return 'secondary'
  if (status === 'ATTENDANCE_CONFIRMED' || status === 'CONFIRMED') return 'brand'
  if (status === 'STYLIST_REVIEW' || status === 'PENDING') return 'warning'
  if (status === 'COMPLETED') return 'success'
  if (status === 'NO_SHOW' || status === 'CANCELLED_BY_CLIENT' || status === 'CANCELLED_BY_STYLISTS') return 'danger'
  return 'secondary'
}

const parseMoney = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

const clampNonNegInt = (v: number) => Math.max(0, Math.floor(v))

const getPlannedDateTime = (reservationDate: string, time: string) => {
  const [y, m, d] = reservationDate.slice(0, 10).split('-').map(Number)
  const [hh, mm] = time.slice(0, 5).split(':').map(Number)
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0)
}

const computeMinCharge = (r: Reservation) => {
  const base =
    Array.isArray((r as any).items) && (r as any).items.length > 0
      ? (r as any).items.reduce((acc: number, it: any) => acc + Number(it?.service?.price ?? 0), 0)
      : Number(r.service?.price ?? 0)
  const loyaltyDiscountAmount = Number(r.loyaltyDiscountAmount ?? 0)
  return Math.max(0, base - loyaltyDiscountAmount)
}

export const StylistReservationDetailPage = () => {
  const { toastApiError, success, warning } = useAppToast()
  const navigate = useNavigate()
  const { reservationId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const id = String(reservationId ?? '')

  const { profileId, isLoading: profileLoading } = useStylistProfileMe()
  const { reservation, isLoading, isFetching, refetch } = useStylistReservationDetail({ reservationId: id })
  const actions = useReservationActions()

  const isConfirmedStylist = useMemo(() => {
    if (!reservation || !profileId) return false
    const confirmedId = reservation.confirmedStylistId ?? null
    const confirmedProfileId = reservation.confirmedStylist?.id ?? null
    return confirmedId === profileId || confirmedProfileId === profileId
  }, [reservation, profileId])

  const debtsQuery = useClientDebts({ clientId: reservation?.clientId ?? null })
  const [selectedDebtIds, setSelectedDebtIds] = useState<Record<string, boolean>>({})
  const selectedDebtSum = useSelectedDebtSum({ debts: debtsQuery.debts, selectedDebtIds })

  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const [noShowOpen, setNoShowOpen] = useState(false)
  const [noShowReason, setNoShowReason] = useState('')
  const [noShowApplyPenalty, setNoShowApplyPenalty] = useState(true)

  const [completeOpen, setCompleteOpen] = useState(false)
  const [completeActualPrice, setCompleteActualPrice] = useState('')
  const [completeNotes, setCompleteNotes] = useState('')

  const [overrunOpen, setOverrunOpen] = useState(false)
  const [manualShiftMinutes, setManualShiftMinutes] = useState('5')

  const [reorderOpen, setReorderOpen] = useState(false)
  const [reorderStartTime, setReorderStartTime] = useState('')
  const [reorderEndTime, setReorderEndTime] = useState('')

  const [startBlockedReason, setStartBlockedReason] = useState<string | null>(null)

  const overrunPopupShownForRef = useRef<string | null>(null)
  const [timeTick, setTimeTick] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(() => setTimeTick((v) => v + 1), 30000)
    return () => window.clearInterval(interval)
  }, [])

  const canCancelByStylist = useMemo(() => {
    if (!reservation || !profileId) return false
    return (
      (reservation.status === 'CONFIRMED' || reservation.status === 'IN_PROGRESS') &&
      isConfirmedStylist
    )
  }, [reservation, profileId, isConfirmedStylist])

  const canMarkNoShow = useMemo(() => {
    if (!reservation || !profileId) return false
    return (
      (reservation.status === 'CONFIRMED' || reservation.status === 'ATTENDANCE_CONFIRMED') &&
      isConfirmedStylist
    )
  }, [reservation, profileId, isConfirmedStylist])

  const canStart = useMemo(() => {
    if (!reservation || !profileId) return false
    return reservation.status === 'ATTENDANCE_CONFIRMED' && isConfirmedStylist
  }, [reservation, profileId, isConfirmedStylist])

  const canComplete = useMemo(() => {
    if (!reservation || !profileId) return false
    return reservation.status === 'IN_PROGRESS' && isConfirmedStylist
  }, [reservation, profileId, isConfirmedStylist])

  const hasAnyAction = useMemo(() => {
    return canStart || canComplete || canCancelByStylist || canMarkNoShow
  }, [canStart, canComplete, canCancelByStylist, canMarkNoShow])

  const isStartOverdue = useMemo(() => {
    if (!reservation) return false
    if (reservation.status !== 'ATTENDANCE_CONFIRMED') return false
    const plannedEnd = getPlannedDateTime(reservation.reservationDate, reservation.endTime)
    return Date.now() > plannedEnd.getTime()
  }, [reservation, timeTick])

  const overrunMinutes = useMemo(() => {
    if (!reservation) return 0
    if (reservation.status !== 'IN_PROGRESS') return 0
    const plannedEnd = getPlannedDateTime(reservation.reservationDate, reservation.endTime)
    return Math.floor((Date.now() - plannedEnd.getTime()) / 60000)
  }, [reservation, timeTick])

  useEffect(() => {
    if (reservation?.status !== 'IN_PROGRESS') {
      overrunPopupShownForRef.current = null
    }
  }, [reservation?.status])

  useEffect(() => {
    if (!reservation || !profileId || reservation.status !== 'IN_PROGRESS') return
    if (reservation.confirmedStylistId !== profileId) return
    if (overrunMinutes < 5) return
    const popupKey = `${reservation.id}:5`
    if (overrunPopupShownForRef.current === popupKey) return
    overrunPopupShownForRef.current = popupKey
    warning('Termin je probijen', 'Možete otvoriti rekalkulaciju i poslati obavijesti klijentima.')
  }, [reservation, profileId, overrunMinutes, warning])

  useEffect(() => {
    let cancelled = false

    async function resolve() {
      if (!reservation || !profileId || reservation.status !== 'ATTENDANCE_CONFIRMED') {
        if (!cancelled) setStartBlockedReason(null)
        return
      }

      const plannedStart = getPlannedDateTime(reservation.reservationDate, reservation.startTime)
      if (Date.now() < plannedStart.getTime()) {
        if (!cancelled) {
          setStartBlockedReason(`Termin još nije počeo. Start je dozvoljen od ${formatTime(reservation.startTime)}.`)
        }
        return
      }

      try {
        const day = reservation.reservationDate.slice(0, 10)
        const list = await fetchStylistReservations({ fromDate: day, toDate: day })
        const earlierPending = list
          .filter((r) => r.id !== reservation.id)
          .filter((r) => r.confirmedStylistId === profileId)
          .filter((r) => r.startTime < reservation.startTime)
          .find((r) => r.status === 'CONFIRMED' || r.status === 'ATTENDANCE_CONFIRMED')

        if (!cancelled) {
          setStartBlockedReason(
            earlierPending
              ? `Postoji raniji termin (${formatTime(earlierPending.startTime)}–${formatTime(earlierPending.endTime)}) koji prvo treba obraditi.`
              : null,
          )
        }
      } catch {
        if (!cancelled) setStartBlockedReason(null)
      }
    }

    void resolve()
    return () => {
      cancelled = true
    }
  }, [reservation, profileId, timeTick])

  const goToReschedulePreview = (mode: RescheduleMode, includeBreaks = false, manualMinutes?: number) => {
    if (!reservation) return
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('includeBreaks', includeBreaks ? '1' : '0')
    if (typeof manualMinutes === 'number') params.set('manualShiftMinutes', String(clampNonNegInt(manualMinutes)))
    navigate(`/stylist/workbook/reschedule-preview/${reservation.id}?${params.toString()}`)
  }

  const submitStart = async () => {
    if (!reservation) return
    try {
      await actions.start.mutateAsync(reservation.id)
      await refetch()
      success('Startovano', 'Rezervacija je startovana.')
      navigate(-1)
    } catch (err) {
      toastApiError(err, 'Greška pri startovanju')
    }
  }

  const openComplete = () => {
    if (!reservation) return
    if (reservation.status !== 'IN_PROGRESS') return
    const minCharge = computeMinCharge(reservation)
    setCompleteActualPrice(minCharge ? String(minCharge) : '')
    setCompleteNotes('')
    setSelectedDebtIds({})
    setCompleteOpen(true)
  }

  useEffect(() => {
    const action = searchParams.get('action')
    if (!action) return
    if (!reservation || !profileId) return
    if (action === 'complete' && reservation.status === 'IN_PROGRESS' && isConfirmedStylist) {
      openComplete()
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('action')
        return next
      })
    }
  }, [searchParams, reservation, profileId, isConfirmedStylist, setSearchParams])

  const submitComplete = async () => {
    if (!reservation) return
    const minCharge = computeMinCharge(reservation)
    const paidRaw = parseMoney(completeActualPrice)
    if (!Number.isFinite(paidRaw) || paidRaw < minCharge) {
      toastApiError(null, minCharge > 0 ? `Naplaćeni iznos ne može biti manji od ${minCharge.toFixed(2)} KM.` : 'Unesite ispravan iznos.')
      return
    }
    const autoTip = paidRaw - minCharge
    const tipAmount = autoTip > 0 ? autoTip : 0
    const actualPriceWithDebts = paidRaw + selectedDebtSum

    try {
      const entry = await actions.completeAndCreateDailyLog.mutateAsync({
        reservationId: reservation.id,
        actualPrice: actualPriceWithDebts,
        tipAmount,
        notes: completeNotes.trim() || undefined,
      })

      const selected = debtsQuery.debts.filter((d) => selectedDebtIds[d.id])
      if (selected.length > 0) {
        await Promise.all(selected.map((d) => actions.settleDebt.mutateAsync(d.id)))
        await debtsQuery.refetch()
      }

      setCompleteOpen(false)
      success('Upisano', 'Naplata je upisana u Dnevnik.')
      navigate(`/stylist/workbook/${entry.id}`)
    } catch (err) {
      toastApiError(err, 'Greška pri upisu')
    }
  }

  const submitCancel = async () => {
    if (!reservation) return
    const reason = cancelReason.trim()
    if (!reason) {
      toastApiError(null, 'Unesite obrazloženje otkazivanja.')
      return
    }
    try {
      await actions.cancel.mutateAsync({ reservationId: reservation.id, cancelReason: reason })
      setCancelOpen(false)
      success('Otkazano', 'Rezervacija je otkazana.')
      navigate('/stylist/schedule')
    } catch (err) {
      toastApiError(err, 'Greška pri otkazivanju')
    }
  }

  const submitNoShow = async () => {
    if (!reservation) return
    const reason = noShowReason.trim()
    if (!reason) {
      toastApiError(null, 'Unesite obrazloženje.')
      return
    }
    try {
      await actions.noShow.mutateAsync({ reservationId: reservation.id, reason, applyPenalty: noShowApplyPenalty })
      setNoShowOpen(false)
      success('Označeno', 'Rezervacija je označena kao no-show.')
      navigate('/stylist/schedule')
    } catch (err) {
      toastApiError(err, 'Greška pri označavanju')
    }
  }

  const submitReorder = async () => {
    if (!reservation) return
    const start = reorderStartTime.trim()
    const end = reorderEndTime.trim()
    if (!start || !end) {
      toastApiError(null, 'Unesite početak i kraj novog termina.')
      return
    }
    try {
      await actions.reorder.mutateAsync({ reservationId: reservation.id, targetStartTime: start, targetEndTime: end })
      setReorderOpen(false)
      setReorderStartTime('')
      setReorderEndTime('')
      success('Poslano', 'Klijentu je poslan prijedlog pomjeranja termina.')
      await refetch()
    } catch (err) {
      toastApiError(err, 'Greška pri slanju prijedloga')
    }
  }

  const openOverrun = () => {
    setOverrunOpen(true)
  }

  const handleOverrunActual = async () => {
    if (!reservation) return
    setOverrunOpen(false)
    try {
      await proposeReschedule({ reservationId: reservation.id, includeBreaks: false, mode: 'actual_overrun' })
    } catch {
      // ignore – page will propose again
    }
    goToReschedulePreview('actual_overrun', false)
  }

  const handleOverrunManual = async () => {
    if (!reservation) return
    setOverrunOpen(false)
    const n = clampNonNegInt(parseInt(manualShiftMinutes || '0', 10) || 0)
    try {
      await proposeReschedule({ reservationId: reservation.id, includeBreaks: false, mode: 'manual_minutes', manualShiftMinutes: n })
    } catch {
      // ignore
    }
    goToReschedulePreview('manual_minutes', false, n)
  }

  const handleOverrunBreakOnly = async () => {
    if (!reservation) return
    setOverrunOpen(false)
    try {
      await proposeReschedule({ reservationId: reservation.id, includeBreaks: false, mode: 'use_break_only' })
    } catch {
      // ignore
    }
    goToReschedulePreview('use_break_only', false)
  }

  if (profileLoading || (isLoading && !reservation)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Učitavanje…</div>
      </div>
    )
  }

  if (!reservation) {
    return (
      <Card className="p-6">
        <p className="text-slate-900 dark:text-slate-50 font-semibold">Rezervacija nije pronađena</p>
        <div className="mt-3">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Nazad
          </Button>
        </div>
      </Card>
    )
  }

  const minCharge = computeMinCharge(reservation)
  const loyaltyPercent = Number(reservation.loyaltyDiscountPercent ?? 0)
  const loyaltyAmount = Number(reservation.loyaltyDiscountAmount ?? 0)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Detalji termina</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <Link to="/stylist/schedule" className="underline underline-offset-2">Raspored</Link>
            {' '}· {reservation.service?.name ?? 'Usluga'}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          Osvježi
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 dark:text-slate-50 truncate">
              {reservation.service?.name ?? 'Usluga'}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {formatDate(reservation.reservationDate)} · {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
            </p>
          </div>
          <Badge variant={getStatusVariant(reservation.status)}>{reservation.status}</Badge>
        </div>

        <div className="mt-3 grid gap-2">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold">Klijent:</span>{' '}
            {reservation.client ? `${reservation.client.firstName} ${reservation.client.lastName}` : '—'}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold">Loyalty:</span>{' '}
            {loyaltyPercent > 0 ? `${loyaltyPercent}% (${loyaltyAmount.toFixed(2)} KM)` : '—'}
          </p>
          {reservation.clientNotes ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{reservation.clientNotes}</p>
          ) : null}
          {reservation.rescheduleStatus === 'PENDING' ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">Klijent treba potvrditi predloženi termin.</p>
          ) : null}
        </div>
      </Card>

      {hasAnyAction ? (
        <Card className="p-4 space-y-3">
          <p className="font-semibold text-slate-900 dark:text-slate-50">Akcije</p>

          {canStart ? (
            <div className="space-y-2">
              <Button
                type="button"
                onClick={isStartOverdue ? openOverrun : submitStart}
                disabled={!!startBlockedReason || actions.start.isPending}
              >
                {isStartOverdue ? 'Obradi kašnjenje termina' : 'Startuj rezervaciju'}
              </Button>
              {startBlockedReason ? (
                <p className="text-sm text-amber-700 dark:text-amber-300">{startBlockedReason}</p>
              ) : null}
            </div>
          ) : null}

          {reservation.status === 'IN_PROGRESS' && overrunMinutes >= 5 && reservation.confirmedStylistId === profileId ? (
            <Button type="button" variant="outline" onClick={openOverrun}>
              Termin je probijen ({overrunMinutes} min) · Rekalkulacija
            </Button>
          ) : null}

          {canComplete ? (
            <Button type="button" onClick={openComplete} disabled={actions.completeAndCreateDailyLog.isPending}>
              Završi termin (naplata)
            </Button>
          ) : null}

          {canMarkNoShow ? (
            <Button type="button" variant="outline" onClick={() => { setNoShowReason(''); setNoShowApplyPenalty(true); setNoShowOpen(true) }}>
              Klijent se nije pojavio (no-show)
            </Button>
          ) : null}

          {canCancelByStylist ? (
            <Button type="button" variant="outline" onClick={() => { setCancelReason(''); setCancelOpen(true) }}>
              Otkazivanje (uz razlog)
            </Button>
          ) : null}

          {(reservation.status === 'CONFIRMED' || reservation.status === 'ATTENDANCE_CONFIRMED') &&
          reservation.confirmedStylistId === profileId &&
          !isStartOverdue ? (
            <Button type="button" variant="outline" onClick={() => { setReorderStartTime(''); setReorderEndTime(''); setReorderOpen(true) }}>
              Predloži pomjeranje termina (reorder)
            </Button>
          ) : null}
        </Card>
      ) : (
        <Card className="p-4 space-y-2">
          <p className="font-semibold text-slate-900 dark:text-slate-50">Akcije nisu dostupne</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Ovo se obično desi ako trenutni korisnik nije prepoznat kao potvrđeni stilist za ovaj termin.
          </p>
          <div className="rounded-md border border-slate-200 dark:border-slate-800 p-3 text-xs text-slate-700 dark:text-slate-200 space-y-1">
            <div><span className="font-semibold">status:</span> {reservation.status}</div>
            <div><span className="font-semibold">profileId:</span> {profileId ?? 'null'}</div>
            <div><span className="font-semibold">confirmedStylistId:</span> {reservation.confirmedStylistId ?? 'null'}</div>
            <div><span className="font-semibold">confirmedStylist.id:</span> {reservation.confirmedStylist?.id ?? 'null'}</div>
            <div><span className="font-semibold">isConfirmedStylist:</span> {String(isConfirmedStylist)}</div>
          </div>
          <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Osvježi
          </Button>
        </Card>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Otkazivanje</DialogTitle>
            <DialogDescription>Unesite obrazloženje otkazivanja. Klijent će biti obaviješten.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancelReason">Razlog</Label>
            <Textarea id="cancelReason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelOpen(false)}>
              Odustani
            </Button>
            <Button type="button" onClick={submitCancel} disabled={actions.cancel.isPending}>
              Potvrdi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noShowOpen} onOpenChange={setNoShowOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Klijent se nije pojavio</DialogTitle>
            <DialogDescription>Označite no-show i po potrebi primijenite penal.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="noShowReason">Obrazloženje</Label>
            <Textarea id="noShowReason" value={noShowReason} onChange={(e) => setNoShowReason(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={noShowApplyPenalty ? 'default' : 'outline'}
              onClick={() => setNoShowApplyPenalty((v) => !v)}
            >
              Penal: {noShowApplyPenalty ? 'DA' : 'NE'}
            </Button>
            <p className="text-sm text-slate-600 dark:text-slate-300">Primijeni penal za no-show.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNoShowOpen(false)}>
              Odustani
            </Button>
            <Button type="button" onClick={submitNoShow} disabled={actions.noShow.isPending}>
              Označi no-show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Završi termin</DialogTitle>
            <DialogDescription>
              Preporučena minimalna naplata: {minCharge.toFixed(2)} KM. Napojnica = naplaćeno − minimalno.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="price">Cijena (KM)</Label>
            <Input id="price" value={completeActualPrice} onChange={(e) => setCompleteActualPrice(e.target.value)} inputMode="decimal" />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Dugovanja klijenta</p>
            {debtsQuery.isLoading ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Učitavanje…</p>
            ) : debtsQuery.debts.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Nema otvorenih dugovanja.</p>
            ) : (
              <div className="grid gap-2">
                {debtsQuery.debts.slice(0, 6).map((d) => {
                  const selected = !!selectedDebtIds[d.id]
                  const isMine = d.stylistProfileId === profileId
                  const stylistName = d.stylistProfile?.user
                    ? `${d.stylistProfile.user.firstName ?? ''} ${d.stylistProfile.user.lastName ?? ''}`.trim() || 'Stilist'
                    : 'Stilist'
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setSelectedDebtIds((prev) => ({ ...prev, [d.id]: !prev[d.id] }))}
                      className={
                        selected
                          ? 'w-full rounded-md border border-brand-champagne bg-brand-champagne/10 px-3 py-2 text-left'
                          : 'w-full rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 text-left hover:bg-slate-50/60 dark:hover:bg-slate-900/30'
                      }
                    >
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {d.service?.name ?? 'Usluga'} · {Number(d.amount).toFixed(2)} KM
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {isMine ? 'Dug kod vas' : `Dug kod ${stylistName}`} · {d.createdAt.slice(0, 10)}
                      </p>
                    </button>
                  )
                })}
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Odabrana dugovanja će biti dodata na ukupnu cijenu i neće se računati u napojnicu.
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">Ukupno za dugovanja: {selectedDebtSum.toFixed(2)} KM</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Napomena (opciono)</Label>
            <Textarea id="notes" value={completeNotes} onChange={(e) => setCompleteNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCompleteOpen(false)}>
              Odustani
            </Button>
            <Button type="button" onClick={submitComplete} disabled={actions.completeAndCreateDailyLog.isPending}>
              Potvrdi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overrunOpen} onOpenChange={setOverrunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kašnjenje termina</DialogTitle>
            <DialogDescription>Odaberite kako želite obraditi kašnjenje prije nastavka rada.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Button type="button" onClick={handleOverrunActual}>
              Rekalkuliši po stvarnom kašnjenju
            </Button>

            <div className="space-y-2">
              <Label htmlFor="manualShift">Ručni unos minuta</Label>
              <Input id="manualShift" value={manualShiftMinutes} onChange={(e) => setManualShiftMinutes(e.target.value)} inputMode="numeric" />
              <Button type="button" variant="outline" onClick={handleOverrunManual}>
                Rekalkuliši po ručnom unosu
              </Button>
            </div>

            <Button type="button" variant="ghost" onClick={handleOverrunBreakOnly}>
              Ne pomjeraj termine (iskoristi kraću pauzu)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reorderOpen} onOpenChange={setReorderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reorder termina</DialogTitle>
            <DialogDescription>Pošaljite prijedlog novog termina klijentu.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="reorderStart">Novi početak (HH:mm)</Label>
              <Input id="reorderStart" value={reorderStartTime} onChange={(e) => setReorderStartTime(e.target.value)} placeholder="11:15" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderEnd">Novi kraj (HH:mm)</Label>
              <Input id="reorderEnd" value={reorderEndTime} onChange={(e) => setReorderEndTime(e.target.value)} placeholder="11:45" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReorderOpen(false)}>
              Odustani
            </Button>
            <Button type="button" onClick={submitReorder} disabled={actions.reorder.isPending}>
              Pošalji klijentu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

