import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import type { Reservation } from '../types'
import {
  formatReservationDate,
  formatReservationTime,
  getReservationStatusVariant,
  getReservationStatusTranslationKey,
} from '../utils/reservation-detail'
import { getIntlLocale, formatLocalizedNumber, formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'

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
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const loyaltyPercent = Number(reservation.loyaltyDiscountPercent ?? 0)
  const loyaltyAmount = Number(reservation.loyaltyDiscountAmount ?? 0)

  return (
    <>
      <div data-stylist-detail-heading className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-content">
            {t('stylistPortal.reservationDetail.title')}
          </h1>
          <p className="text-sm text-content-strong">
            <Link to="/stylist/schedule" className="underline underline-offset-2">
              {t('stylistPortal.schedule.title')}
            </Link>{' '}
            · {reservation.service?.name ?? t('stylistPortal.reservationDetail.serviceFallback')}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRefresh} disabled={isFetching}>
          {t('stylistPortal.reservationDetail.refresh')}
        </Button>
      </div>
      <Card data-stylist-detail-summary className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-content">
              {reservation.service?.name ?? t('stylistPortal.reservationDetail.serviceFallback')}
            </p>
            <p className="mt-1 text-sm text-content-strong">
              {formatReservationDate(reservation.reservationDate, locale)} ·{' '}
              {formatReservationTime(reservation.startTime)} –{' '}
              {formatReservationTime(reservation.endTime)}
            </p>
          </div>
          <Badge variant={getReservationStatusVariant(reservation.status)}>
            {t(getReservationStatusTranslationKey(reservation.status, reservation.cancelReason), { defaultValue: reservation.status })}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2">
          <p className="text-sm text-content-strong">
            <span className="font-semibold">{t('reservations.client')}:</span>{' '}
            {reservation.client
              ? `${reservation.client.firstName} ${reservation.client.lastName}`
              : '—'}
          </p>
          <p className="text-sm text-content-strong">
            <span className="font-semibold">{t('stylistPortal.reservationDetail.loyalty')}:</span>{' '}
            {loyaltyPercent > 0
              ? `${formatLocalizedNumber(loyaltyPercent, i18n.language)}% (${formatLocalizedAmount(loyaltyAmount, i18n.language)})`
              : '—'}
          </p>
          {reservation.clientNotes ? (
            <p className="whitespace-pre-wrap text-sm text-content-strong">
              {reservation.clientNotes}
            </p>
          ) : null}
          {reservation.rescheduleStatus === 'PENDING' ? (
            // S10 (1.4.3 / 1.4.11): `text-amber-700 dark:text-amber-300` → `text-warn-foreground`
            // (8.35 / 11.64 / 6.39 / 9.75:1 na `surface` u četiri žive teme).
            <p className="text-sm text-warn-foreground">
              {t('stylistPortal.reservationDetail.pendingReschedule')}
            </p>
          ) : null}
        </div>
      </Card>
    </>
  )
}
