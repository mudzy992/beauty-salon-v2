import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import type { Reservation, ReservationStatus } from '../types'

const getStatusVariant = (status: ReservationStatus) => {
  if (status === 'IN_PROGRESS') return 'secondary'
  if (status === 'ATTENDANCE_CONFIRMED' || status === 'CONFIRMED') return 'brand'
  if (status === 'STYLIST_REVIEW' || status === 'PENDING') return 'warning'
  if (status === 'COMPLETED') return 'success'
  if (status === 'NO_SHOW' || status === 'CANCELLED_BY_CLIENT' || status === 'CANCELLED_BY_STYLISTS') return 'danger'
  return 'secondary'
}

const formatTime = (time: string) => time?.slice(0, 5) ?? time

export const StylistScheduleReservationCard = ({ reservation }: { reservation: Reservation }) => {
  const { t } = useTranslation()
  const detailHref = `/stylist/schedule/${reservation.id}`
  const completeHref = `/stylist/schedule/${reservation.id}?action=complete`

  return (
    <Card data-stylist-schedule-card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={detailHref} className="block">
            <p className="font-semibold text-content truncate hover:underline underline-offset-4">
              {reservation.service?.name ?? t('stylistWorkbook.serviceFallback')}
            </p>
          </Link>
          <p className="mt-1 text-sm text-content-strong">
            {formatTime(reservation.startTime)} – {formatTime(reservation.endTime)}
            {reservation.client ? ` · ${reservation.client.firstName} ${reservation.client.lastName}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={getStatusVariant(reservation.status)}>
            {reservation.status === 'CANCELLED_BY_CLIENT' &&
            (reservation.cancelReason ?? '').trim() === 'Nije potvrđen dolazak u roku'
              ? t('reservations.statuses.CANCELLED_UNCONFIRMED_ATTENDANCE')
              : t(`reservations.statuses.${reservation.status}`, { defaultValue: reservation.status })}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <Link to={detailHref}>{t('common.details')}</Link>
          </Button>
          {reservation.status === 'IN_PROGRESS' ? (
            <Button asChild size="sm">
              <Link to={completeHref}>{t('stylistPortal.schedule.payment')}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
