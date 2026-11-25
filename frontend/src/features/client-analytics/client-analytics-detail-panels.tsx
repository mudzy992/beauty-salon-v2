import { useTranslation } from 'react-i18next'
import { Badge, type BadgeProps } from '../../components/ui/badge'
import { formatLocalizedAmount, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { ClientAnalyticsData } from './client-analytics-types'
import { StarRating } from './star-rating'

type StylistRef = { user?: { firstName: string | null; lastName: string | null; username: string } }

type ReservationProps = {
  reservation: ClientAnalyticsData['reservations'][number]
  formatDateOnly: (value: string | null | undefined) => string
  formatInstantDate: (value: string | null | undefined) => string
  getStylistName: (stylist?: StylistRef) => string
  getReservationStatusLabel: (status: string) => string
  statusBadgeVariant: Record<string, NonNullable<BadgeProps['variant']>>
}

/** Detalji jedne rezervacije unutar analitike klijenta. */
export function ClientReservationDetail({
  reservation,
  formatDateOnly,
  formatInstantDate,
  getStylistName,
  getReservationStatusLabel,
  statusBadgeVariant,
}: ReservationProps) {
  const { t, i18n } = useTranslation()
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.date')}</p>
        <p className="font-semibold text-content">{formatDateOnly(reservation.reservationDate)}</p>
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.time')}</p>
        <p className="font-semibold text-content">
          {reservation.startTime} - {reservation.endTime}
        </p>
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.service')}</p>
        <p className="text-content">{reservation.service?.name ?? '-'}</p>
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.price')}</p>
        <p className="text-content">{formatLocalizedAmount(Number(reservation.service?.price ?? 0), i18n.language)}</p>
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.stylist')}</p>
        <p className="text-content">{getStylistName(reservation.confirmedStylist)}</p>
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.status')}</p>
        <Badge variant={statusBadgeVariant[reservation.status] ?? 'secondary'} className="text-[10px]">
          {getReservationStatusLabel(reservation.status)}
        </Badge>
      </div>
      {reservation.clientNotes ? (
        <div className="md:col-span-2">
          <p className="text-xs text-content-strong">{t('clientAnalyticsPage.clientNotes')}</p>
          <p className="text-content">{reservation.clientNotes}</p>
        </div>
      ) : null}
      {reservation.cancelReason ? (
        <div className="md:col-span-2">
          <p className="text-xs text-content-strong">{t('clientAnalyticsPage.cancellationReason')}</p>
          <p className="text-rose-600">{reservation.cancelReason}</p>
        </div>
      ) : null}
      {reservation.cancelledAt ? (
        <div>
          <p className="text-xs text-content-strong">{t('clientAnalyticsPage.cancelled')}</p>
          <p className="text-content">
            {formatInstantDate(reservation.cancelledAt)}
          </p>
        </div>
      ) : null}
    </div>
  )
}

type ReviewProps = {
  review: ClientAnalyticsData['reviews'][number]
  formatInstantDate: (value: string | null | undefined) => string
  getStylistName: (stylist?: StylistRef) => string
}

/** Detalji jedne recenzije unutar analitike klijenta. */
export function ClientReviewDetail({ review, formatInstantDate, getStylistName }: ReviewProps) {
  const { t, i18n } = useTranslation()
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.service')}</p>
        <p className="font-semibold text-content">{review.service?.name ?? '-'}</p>
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.stylist')}</p>
        <p className="text-content">{getStylistName(review.stylist)}</p>
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.serviceRating')}</p>
        <div className="flex items-center gap-2">
          <StarRating rating={review.serviceRating} />
          <p className="text-sm text-content-strong">{formatLocalizedNumber(review.serviceRating, i18n.language)}/5</p>
        </div>
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.stylistRating')}</p>
        {review.stylistRating != null ? (
          <div className="flex items-center gap-2">
            <StarRating rating={review.stylistRating} />
            <p className="text-sm text-content-strong">{formatLocalizedNumber(review.stylistRating, i18n.language)}/5</p>
          </div>
        ) : (
          <p className="text-content">-</p>
        )}
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.status')}</p>
        <Badge variant={review.isApproved ? 'success' : 'warning'} className="text-[10px]">
          {review.isApproved ? t('clientAnalyticsPage.approved') : t('clientAnalyticsPage.pending')}
        </Badge>
      </div>
      <div>
        <p className="text-xs text-content-strong">{t('clientAnalyticsPage.date')}</p>
        <p className="text-content">{formatInstantDate(review.createdAt)}</p>
      </div>
      {review.comment ? (
        <div className="md:col-span-2">
          <p className="text-xs text-content-strong">{t('clientAnalyticsPage.comment')}</p>
          <div className="rounded-md bg-surface-muted p-3 text-sm text-content">
            {review.comment}
          </div>
        </div>
      ) : null}
    </div>
  )
}
