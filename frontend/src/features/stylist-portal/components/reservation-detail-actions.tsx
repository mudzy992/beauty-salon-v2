import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import type { Reservation } from '../types'
import { getReservationStatusTranslationKey } from '../utils/reservation-detail'
import { formatLocalizedNumber } from '../../../i18n/locale-utils.mjs'

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
  const { t, i18n } = useTranslation()
  if (!hasAnyAction) {
    return (
      <Card className="space-y-2 p-4">
        <p className="font-semibold text-content">
          {t('stylistPortal.reservationDetail.actionsUnavailable')}
        </p>
        <p className="text-sm text-content-strong">
          {t('stylistPortal.reservationDetail.actionsUnavailableDescription')}
        </p>
        <div className="space-y-1 rounded-md border border-line p-3 text-xs text-content-strong">
          <div><span className="font-semibold">{t('stylistPortal.reservationDetail.diagnostics.status')}:</span> {t(getReservationStatusTranslationKey(reservation.status, reservation.cancelReason), { defaultValue: reservation.status })}</div>
          <div><span className="font-semibold">{t('stylistPortal.reservationDetail.diagnostics.profileId')}:</span> {profileId ?? t('stylistPortal.reservationDetail.diagnostics.notSet')}</div>
          <div><span className="font-semibold">{t('stylistPortal.reservationDetail.diagnostics.confirmedStylistId')}:</span> {reservation.confirmedStylistId ?? t('stylistPortal.reservationDetail.diagnostics.notSet')}</div>
          <div><span className="font-semibold">{t('stylistPortal.reservationDetail.diagnostics.confirmedStylistRecordId')}:</span> {reservation.confirmedStylist?.id ?? t('stylistPortal.reservationDetail.diagnostics.notSet')}</div>
          <div><span className="font-semibold">{t('stylistPortal.reservationDetail.diagnostics.isConfirmedStylist')}:</span> {isConfirmedStylist ? t('common.yes') : t('common.no')}</div>
        </div>
        <Button type="button" variant="outline" onClick={onRefresh} disabled={isFetching}>
          {t('stylistPortal.reservationDetail.refresh')}
        </Button>
      </Card>
    )
  }

  return (
    <Card data-stylist-detail-actions className="space-y-3 p-4">
      <p className="font-semibold text-content">{t('stylistPortal.reservationDetail.actions')}</p>
      {canStaffConfirm ? (
        <Button
          type="button"
          onClick={onStaffConfirm}
          disabled={isConfirmingAttendance}
        >
          {t('stylistPortal.reservationDetail.confirmAttendance')}
        </Button>
      ) : null}
      {canStart ? (
        <div className="space-y-2">
          <Button
            type="button"
            onClick={isStartOverdue ? onOpenOverrun : onStart}
            disabled={!!startBlockedReason || isStarting}
          >
            {isStartOverdue ? t('stylistPortal.reservationDetail.handleOverrun') : t('stylistPortal.reservationDetail.startReservation')}
          </Button>
          {startBlockedReason ? (
            // S10 (1.4.3 / 1.4.11): `text-amber-700 dark:text-amber-300` → `text-warn-foreground`.
            // Semantički token je temski (web svijetlo 8.35:1 / web tamno 11.64:1 /
            // Aurum svijetlo 6.39:1 / Aurum tamno 9.75:1 na `surface`).
            <p className="text-sm text-warn-foreground">
              {startBlockedReason}
            </p>
          ) : null}
        </div>
      ) : null}
      {reservation.status === 'IN_PROGRESS' &&
      overrunMinutes >= 5 &&
      reservation.confirmedStylistId === profileId ? (
        <Button type="button" variant="outline" onClick={onOpenOverrun}>
          {t('stylistPortal.reservationDetail.overrunAction', { minutes: formatLocalizedNumber(overrunMinutes, i18n.language) })}
        </Button>
      ) : null}
      {canComplete ? (
        <Button type="button" onClick={onOpenComplete} disabled={isCompleting}>
          {t('stylistPortal.reservationDetail.completeReservation')}
        </Button>
      ) : null}
      {canMarkNoShow ? (
        <Button type="button" variant="outline" onClick={onOpenNoShow}>
          {t('stylistPortal.reservationDetail.markNoShow')}
        </Button>
      ) : null}
      {canCancelByStylist ? (
        <Button type="button" variant="outline" onClick={onOpenCancel}>
          {t('stylistPortal.reservationDetail.cancelReservation')}
        </Button>
      ) : null}
      {(reservation.status === 'CONFIRMED' ||
        reservation.status === 'ATTENDANCE_CONFIRMED') &&
      reservation.confirmedStylistId === profileId &&
      !isStartOverdue ? (
        <Button type="button" variant="outline" onClick={onOpenReorder}>
          {t('stylistPortal.reservationDetail.proposeReschedule')}
        </Button>
      ) : null}
    </Card>
  )
}
