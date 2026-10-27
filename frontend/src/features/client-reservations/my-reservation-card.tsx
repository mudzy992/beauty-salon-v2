import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
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
  getClientReservationStatusKey,
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
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const busy = busyId === r.id
  const stylist = getClientReservationStylistLabel(r)
  const statusKey = getClientReservationStatusKey(r.status, r.cancelReason)
  const servicesLabel = getClientReservationServicesLabel(r, t('public.reserve.service'))
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
          aria-label={t('public.myReservations.openDetails')}
        >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-950">
              {servicesLabel}
            </p>
            {r.publicReferenceCode ? (
              <p className="text-xs text-slate-500 mt-0.5">{r.publicReferenceCode}</p>
            ) : null}
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {statusKey ? t(statusKey) : r.status}
          </span>
        </div>

        <div className="grid gap-1.5 text-sm text-slate-700">
          <p>
            {formatReservationDate(r.reservationDate, locale)} · {r.startTime} – {r.endTime}
          </p>
          {stylist ? <p className="text-slate-500">{t('public.myReservations.stylistLabel', { name: stylist })}</p> : null}
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
              {t('public.myReservations.proposedTime', {
                start: r.rescheduleProposedStartTime,
                end: r.rescheduleProposedEndTime,
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => onAcceptReschedule(r)}
              >
                {t('public.myReservations.acceptReschedule')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => onDeclineReschedule(r)}
              >
                {t('public.myReservations.declineReschedule')}
              </Button>
            </div>
          </div>
        ) : null}

        {r.status === 'ATTENDANCE_CONFIRMED' ? (
          <p className="text-sm text-emerald-700">{t('public.myReservations.attendanceConfirmed')}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {showConfirm ? (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => onConfirmAttendance(r)}
            >
              {t('public.myReservations.confirmAttendance')}
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
              {t('public.myReservations.cancelReservation')}
            </Button>
          ) : null}
        </div>
        {showConfirm ? (
          <p className="text-xs text-slate-500">
            {t('public.myReservations.attendanceReminder', {
              hours: getAttendanceConfirmHours(r),
            })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
