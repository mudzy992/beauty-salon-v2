import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, type BadgeProps } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { formatLocalizedAmount, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { ClientAnalyticsData } from './client-analytics-types'
import { StarRating } from './star-rating'

type Props = {
  detailOpen: boolean
  closeDetail: () => void
  detailTriggerRef: MutableRefObject<HTMLElement | null>
  detailReservation: ClientAnalyticsData['reservations'][number] | null
  detailReview: ClientAnalyticsData['reviews'][number] | null
  formatDateOnly: (value: string | null | undefined) => string
  formatInstantDate: (value: string | null | undefined) => string
  getStylistName: (stylist?: { user?: { firstName: string | null; lastName: string | null; username: string } }) => string
  getReservationStatusLabel: (status: string) => string
  statusBadgeVariant: Record<string, NonNullable<BadgeProps['variant']>>
}

export function ClientAnalyticsDetailDialog({ detailOpen, closeDetail, detailTriggerRef, detailReservation, detailReview, formatDateOnly, formatInstantDate, getStylistName, getReservationStatusLabel, statusBadgeVariant }: Props) {
  const { t, i18n } = useTranslation()
  return (
    <Dialog
      open={detailOpen}
      onOpenChange={(open) => {
        if (!open) closeDetail()
      }}
    >
      <DialogContent data-client-analytics-dialog aria-describedby={undefined} className="max-w-2xl" onCloseAutoFocus={(event) => {
        if (detailTriggerRef.current?.isConnected) {
          event.preventDefault()
          detailTriggerRef.current.focus()
        }
      }}>
        {detailReservation ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('clientAnalyticsPage.reservationDetails')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.date')}</p>
                <p className="font-semibold text-content">{formatDateOnly(detailReservation.reservationDate)}</p>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.time')}</p>
                <p className="font-semibold text-content">
                  {detailReservation.startTime} - {detailReservation.endTime}
                </p>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.service')}</p>
                <p className="text-content">{detailReservation.service?.name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.price')}</p>
                <p className="text-content">{formatLocalizedAmount(Number(detailReservation.service?.price ?? 0), i18n.language)}</p>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.stylist')}</p>
                <p className="text-content">{getStylistName(detailReservation.confirmedStylist)}</p>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.status')}</p>
                <Badge variant={statusBadgeVariant[detailReservation.status] ?? 'secondary'} className="text-[10px]">
                  {getReservationStatusLabel(detailReservation.status)}
                </Badge>
              </div>
              {detailReservation.clientNotes ? (
                <div className="md:col-span-2">
                  <p className="text-xs text-content-strong">{t('clientAnalyticsPage.clientNotes')}</p>
                  <p className="text-content">{detailReservation.clientNotes}</p>
                </div>
              ) : null}
              {detailReservation.cancelReason ? (
                <div className="md:col-span-2">
                  <p className="text-xs text-content-strong">{t('clientAnalyticsPage.cancellationReason')}</p>
                  <p className="text-rose-600">{detailReservation.cancelReason}</p>
                </div>
              ) : null}
              {detailReservation.cancelledAt ? (
                <div>
                  <p className="text-xs text-content-strong">{t('clientAnalyticsPage.cancelled')}</p>
                  <p className="text-content">
                    {formatInstantDate(detailReservation.cancelledAt)}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {detailReview ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('clientAnalyticsPage.reviewDetails')}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.service')}</p>
                <p className="font-semibold text-content">{detailReview.service?.name ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.stylist')}</p>
                <p className="text-content">{getStylistName(detailReview.stylist)}</p>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.serviceRating')}</p>
                <div className="flex items-center gap-2">
                  <StarRating rating={detailReview.serviceRating} />
                  <p className="text-sm text-content-strong">{formatLocalizedNumber(detailReview.serviceRating, i18n.language)}/5</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.stylistRating')}</p>
                {detailReview.stylistRating != null ? (
                  <div className="flex items-center gap-2">
                    <StarRating rating={detailReview.stylistRating} />
                    <p className="text-sm text-content-strong">{formatLocalizedNumber(detailReview.stylistRating, i18n.language)}/5</p>
                  </div>
                ) : (
                  <p className="text-content">-</p>
                )}
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.status')}</p>
                <Badge variant={detailReview.isApproved ? 'success' : 'warning'} className="text-[10px]">
                  {detailReview.isApproved ? t('clientAnalyticsPage.approved') : t('clientAnalyticsPage.pending')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-content-strong">{t('clientAnalyticsPage.date')}</p>
                <p className="text-content">{formatInstantDate(detailReview.createdAt)}</p>
              </div>
              {detailReview.comment ? (
                <div className="md:col-span-2">
                  <p className="text-xs text-content-strong">{t('clientAnalyticsPage.comment')}</p>
                  <div className="rounded-md bg-surface-muted p-3 text-sm text-content">
                    {detailReview.comment}
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
