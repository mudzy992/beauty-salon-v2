import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { type BadgeProps } from '../../components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import type { ClientAnalyticsData } from './client-analytics-types'
import { ClientReservationDetail, ClientReviewDetail } from './client-analytics-detail-panels'

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

/**
 * Dijalog sa detaljima rezervacije ili recenzije.
 *
 * Sadržaj je u zasebnim panelima (`ClientReservationDetail`,
 * `ClientReviewDetail`); ovdje je samo okvir, naslov i povrat fokusa.
 */
export function ClientAnalyticsDetailDialog({ detailOpen, closeDetail, detailTriggerRef, detailReservation, detailReview, formatDateOnly, formatInstantDate, getStylistName, getReservationStatusLabel, statusBadgeVariant }: Props) {
  const { t } = useTranslation()
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
            <ClientReservationDetail
              reservation={detailReservation}
              formatDateOnly={formatDateOnly}
              formatInstantDate={formatInstantDate}
              getStylistName={getStylistName}
              getReservationStatusLabel={getReservationStatusLabel}
              statusBadgeVariant={statusBadgeVariant}
            />
          </>
        ) : null}

        {detailReview ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('clientAnalyticsPage.reviewDetails')}</DialogTitle>
            </DialogHeader>
            <ClientReviewDetail
              review={detailReview}
              formatInstantDate={formatInstantDate}
              getStylistName={getStylistName}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
