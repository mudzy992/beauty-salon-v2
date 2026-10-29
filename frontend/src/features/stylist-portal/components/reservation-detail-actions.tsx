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
        <p className="font-semibold text-slate-900 dark:text-slate-50">
          {t('stylistPortal.reservationDetail.actionsUnavailable')}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('stylistPortal.reservationDetail.actionsUnavailableDescription')}
        </p>
        <div className="space-y-1 rounded-md border border-slate-200 p-3 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-200">
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
    <Card className="space-y-3 p-4">
      <p className="font-semibold text-slate-900 dark:text-slate-50">{t('stylistPortal.reservationDetail.actions')}</p>
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
