import { Link } from 'react-router-dom'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import type { Reservation } from '../types'
import { getReservationStatusLabel } from '../../reservations/status'
import {
  formatReservationDate,
  formatReservationTime,
  getReservationStatusVariant,
} from '../utils/reservation-detail'

type ReservationDetailSummaryProps = {
  reservation: Reservation
  isFetching: boolean
  onRefresh: () => void
}

export const ReservationDetailSummary = ({
  reservation,
  isFetching,
  onRefresh,
}: ReservationDetailSummaryProps) => {
  const loyaltyPercent = Number(reservation.loyaltyDiscountPercent ?? 0)
  const loyaltyAmount = Number(reservation.loyaltyDiscountAmount ?? 0)

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Detalji termina
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <Link to="/stylist/schedule" className="underline underline-offset-2">
              Raspored
            </Link>{' '}
            · {reservation.service?.name ?? 'Usluga'}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRefresh} disabled={isFetching}>
          Osvježi
        </Button>
      </div>
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900 dark:text-slate-50">
              {reservation.service?.name ?? 'Usluga'}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {formatReservationDate(reservation.reservationDate)} ·{' '}
              {formatReservationTime(reservation.startTime)} –{' '}
              {formatReservationTime(reservation.endTime)}
            </p>
          </div>
          <Badge variant={getReservationStatusVariant(reservation.status)}>
            {getReservationStatusLabel(reservation.status, reservation.cancelReason)}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold">Klijent:</span>{' '}
            {reservation.client
              ? `${reservation.client.firstName} ${reservation.client.lastName}`
              : '—'}
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-200">
            <span className="font-semibold">Loyalty:</span>{' '}
            {loyaltyPercent > 0
              ? `${loyaltyPercent}% (${loyaltyAmount.toFixed(2)} KM)`
              : '—'}
          </p>
          {reservation.clientNotes ? (
            <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
              {reservation.clientNotes}
            </p>
          ) : null}
          {reservation.rescheduleStatus === 'PENDING' ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Klijent treba potvrditi predloženi termin.
            </p>
          ) : null}
        </div>
      </Card>
    </>
  )
}
