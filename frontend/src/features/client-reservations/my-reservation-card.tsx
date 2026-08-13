import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { getReservationStatusLabel } from '../reservations/status'
import type { Reservation } from '../reservations/types'
import {
  canClientCancel,
  canClientConfirmAttendance,
  canClientDecideReschedule,
  getAttendanceConfirmHours,
} from './client-reservation-actions'
import {
  formatReservationDate,
  getClientReservationServicesLabel,
  getClientReservationStylistLabel,
} from './labels'

type MyReservationCardProps = {
  reservation: Reservation
  busyId: string | null
  onOpenDetail: (r: Reservation) => void
  onConfirmAttendance: (r: Reservation) => void
  onAcceptReschedule: (r: Reservation) => void
  onDeclineReschedule: (r: Reservation) => void
  onCancel: (r: Reservation) => void
}

export const MyReservationCard = ({
  reservation: r,
  busyId,
  onOpenDetail,
  onConfirmAttendance,
  onAcceptReschedule,
  onDeclineReschedule,
  onCancel,
}: MyReservationCardProps) => {
  const busy = busyId === r.id
  const stylist = getClientReservationStylistLabel(r)
  const showReschedule = canClientDecideReschedule(r.rescheduleStatus)
  const showConfirm = canClientConfirmAttendance(
    r.status,
    r.attendanceConfirmedAt,
    r.attendancePolicy,
    r.attendanceClientDeadlineAt,
  )
  const showCancel = canClientCancel(r.status)

  return (
    <Card className="rounded-2xl border-slate-200/80 shadow-soft">
      <CardContent className="p-5 space-y-4">
        <button
          type="button"
          className="w-full text-left space-y-4 rounded-xl transition hover:bg-slate-50/80 -m-2 p-2"
          onClick={() => onOpenDetail(r)}
          aria-label="Otvori detalje rezervacije"
        >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-950">
              {getClientReservationServicesLabel(r)}
            </p>
            {r.publicReferenceCode ? (
              <p className="text-xs text-slate-500 mt-0.5">{r.publicReferenceCode}</p>
            ) : null}
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {getReservationStatusLabel(r.status, r.cancelReason)}
          </span>
        </div>

        <div className="grid gap-1.5 text-sm text-slate-700">
          <p>
            {formatReservationDate(r.reservationDate)} · {r.startTime} – {r.endTime}
          </p>
          {stylist ? <p className="text-slate-500">Stilist: {stylist}</p> : null}
          {r.clientNotes ? (
            <p className="text-slate-500 line-clamp-2">{r.clientNotes}</p>
          ) : null}
        </div>
        </button>

        {showReschedule &&
        r.rescheduleProposedStartTime &&
        r.rescheduleProposedEndTime ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 space-y-3">
            <p className="text-sm font-medium text-amber-950">
              Predloženi termin: {r.rescheduleProposedStartTime} –{' '}
              {r.rescheduleProposedEndTime}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => onAcceptReschedule(r)}
              >
                Prihvati
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onDeclineReschedule(r)}
              >
                Odbij
              </Button>
            </div>
          </div>
        ) : null}

        {r.status === 'ATTENDANCE_CONFIRMED' ? (
          <p className="text-sm text-emerald-700">Dolazak potvrđen.</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {showConfirm ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => onConfirmAttendance(r)}
            >
              Potvrdi dolazak
            </Button>
          ) : null}
          {showCancel ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-rose-700 hover:text-rose-800"
              disabled={busy}
              onClick={() => onCancel(r)}
            >
              Otkaži
            </Button>
          ) : null}
        </div>
        {showConfirm ? (
          <p className="text-xs text-slate-500">
            Potvrdite najkasnije {getAttendanceConfirmHours(r)}h prije termina. Ako niko ne
            potvrdi, rezervacija se otkazuje na početku termina.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
