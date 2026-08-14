import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import type { Reservation } from '../types'
import { getReservationStatusLabel } from '../../reservations/status'

type ReservationDetailActionsProps = {
  reservation: Reservation
  profileId: string | null
  isConfirmedStylist: boolean
  canStart: boolean
  canComplete: boolean
  canMarkNoShow: boolean
  canCancelByStylist: boolean
  hasAnyAction: boolean
  isStartOverdue: boolean
  overrunMinutes: number
  startBlockedReason: string | null
  isStarting: boolean
  isCompleting: boolean
  isFetching: boolean
  onStart: () => void
  onOpenOverrun: () => void
  onOpenComplete: () => void
  onOpenNoShow: () => void
  onOpenCancel: () => void
  onOpenReorder: () => void
  onRefresh: () => void
  canStaffConfirm: boolean
  isConfirmingAttendance: boolean
  onStaffConfirm: () => void
}

export const ReservationDetailActions = ({
  reservation,
  profileId,
  isConfirmedStylist,
  canStart,
  canComplete,
  canMarkNoShow,
  canCancelByStylist,
  hasAnyAction,
  isStartOverdue,
  overrunMinutes,
  startBlockedReason,
  isStarting,
  isCompleting,
  isFetching,
  onStart,
  onOpenOverrun,
  onOpenComplete,
  onOpenNoShow,
  onOpenCancel,
  onOpenReorder,
  onRefresh,
  canStaffConfirm,
  isConfirmingAttendance,
  onStaffConfirm,
}: ReservationDetailActionsProps) => {
  if (!hasAnyAction) {
    return (
      <Card className="space-y-2 p-4">
        <p className="font-semibold text-slate-900 dark:text-slate-50">
          Akcije nisu dostupne
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Ovo se obično desi ako trenutni korisnik nije prepoznat kao potvrđeni stilist
          za ovaj termin.
        </p>
        <div className="space-y-1 rounded-md border border-slate-200 p-3 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-200">
          <div><span className="font-semibold">status:</span> {getReservationStatusLabel(reservation.status, reservation.cancelReason)}</div>
          <div><span className="font-semibold">profileId:</span> {profileId ?? 'null'}</div>
          <div><span className="font-semibold">confirmedStylistId:</span> {reservation.confirmedStylistId ?? 'null'}</div>
          <div><span className="font-semibold">confirmedStylist.id:</span> {reservation.confirmedStylist?.id ?? 'null'}</div>
          <div><span className="font-semibold">isConfirmedStylist:</span> {String(isConfirmedStylist)}</div>
        </div>
        <Button type="button" variant="outline" onClick={onRefresh} disabled={isFetching}>
          Osvježi
        </Button>
      </Card>
    )
  }

  return (
    <Card className="space-y-3 p-4">
      <p className="font-semibold text-slate-900 dark:text-slate-50">Akcije</p>
      {canStaffConfirm ? (
        <Button
          type="button"
          onClick={onStaffConfirm}
          disabled={isConfirmingAttendance}
        >
          Potvrdi dolazak
        </Button>
      ) : null}
      {canStart ? (
        <div className="space-y-2">
          <Button
            type="button"
            onClick={isStartOverdue ? onOpenOverrun : onStart}
            disabled={!!startBlockedReason || isStarting}
          >
            {isStartOverdue ? 'Obradi kašnjenje termina' : 'Startuj rezervaciju'}
          </Button>
          {startBlockedReason ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {startBlockedReason}
            </p>
          ) : null}
        </div>
      ) : null}
      {reservation.status === 'IN_PROGRESS' &&
      overrunMinutes >= 5 &&
      reservation.confirmedStylistId === profileId ? (
        <Button type="button" variant="outline" onClick={onOpenOverrun}>
          Termin je probijen ({overrunMinutes} min) · Rekalkulacija
        </Button>
      ) : null}
      {canComplete ? (
        <Button type="button" onClick={onOpenComplete} disabled={isCompleting}>
          Završi termin (naplata)
        </Button>
      ) : null}
      {canMarkNoShow ? (
        <Button type="button" variant="outline" onClick={onOpenNoShow}>
          Klijent se nije pojavio (no-show)
        </Button>
      ) : null}
      {canCancelByStylist ? (
        <Button type="button" variant="outline" onClick={onOpenCancel}>
          Otkazivanje (uz razlog)
        </Button>
      ) : null}
      {(reservation.status === 'CONFIRMED' ||
        reservation.status === 'ATTENDANCE_CONFIRMED') &&
      reservation.confirmedStylistId === profileId &&
      !isStartOverdue ? (
        <Button type="button" variant="outline" onClick={onOpenReorder}>
          Predloži pomjeranje termina (reorder)
        </Button>
      ) : null}
    </Card>
  )
}
