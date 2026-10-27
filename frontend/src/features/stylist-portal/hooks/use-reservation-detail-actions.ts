import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'
import type { NavigateFunction } from 'react-router-dom'

import { getErrorMessage } from '../../../api/error'
import { proposeReschedule } from '../../stylist-workbook/api/stylist-workbook.api'
import type { RescheduleMode } from '../../stylist-workbook/types'
import type { CompleteReservationPayload } from '../components/complete-reservation-dialog'
import type { Reservation } from '../types'
import type {
  useClientDebts,
  useReservationActions,
} from './useStylistReservationDetail'

type ReservationActions = ReturnType<typeof useReservationActions>
type ClientDebtsQuery = ReturnType<typeof useClientDebts>

type UseReservationDetailActionsParams = {
  reservation: Reservation | null
  actions: ReservationActions
  debtsQuery: ClientDebtsQuery
  navigate: NavigateFunction
  refetch: () => Promise<unknown>
  success: (title: string, description?: string) => void
  toastApiError: (error: unknown, fallbackMessage?: string) => void
}

export const useReservationDetailActions = ({
  reservation,
  actions,
  debtsQuery,
  navigate,
  refetch,
  success,
  toastApiError,
}: UseReservationDetailActionsParams) => {
  const { t, i18n } = useTranslation()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [completeOpen, setCompleteOpen] = useState(false)
  const [noShowOpen, setNoShowOpen] = useState(false)
  const [overrunOpen, setOverrunOpen] = useState(false)
  const [reorderOpen, setReorderOpen] = useState(false)

  const handleStart = async () => {
    if (!reservation) return
    try {
      await actions.start.mutateAsync(reservation.id)
      await refetch()
      success(t('stylistPortal.reservationDetail.startedTitle'), t('stylistPortal.reservationDetail.startedMessage'))
      navigate(-1)
    } catch (error) {
      toastApiError(error, t('stylistPortal.reservationDetail.startFailed'))
    }
  }

  const handleStaffConfirm = async () => {
    if (!reservation) return
    try {
      await actions.staffConfirm.mutateAsync(reservation.id)
      await refetch()
      success(t('stylistPortal.reservationDetail.attendanceConfirmedTitle'), t('stylistPortal.reservationDetail.attendanceConfirmedMessage'))
    } catch (error) {
      toastApiError(error, t('stylistPortal.reservationDetail.attendanceConfirmFailed'))
    }
  }

  const handleComplete = async (payload: CompleteReservationPayload) => {
    if (!reservation) return
    try {
      const entry = await actions.completeAndCreateDailyLog.mutateAsync({
        reservationId: reservation.id,
        paidAmount: payload.paidAmount,
        settledDebtIds: payload.settledDebtIds,
        debtHandling: payload.debtHandling,
        tipAmount: payload.tipAmount,
        notes: payload.notes,
      })
      await debtsQuery.refetch()
      setCompleteOpen(false)
      success(
        t('stylistPortal.reservationDetail.paymentRecordedTitle'),
        payload.debtHandling === 'CREATE_DEBT'
          ? t('stylistPortal.reservationDetail.paymentWithDebt', { amount: formatLocalizedAmount(payload.shortfall, i18n.language) })
          : t('stylistPortal.reservationDetail.paymentRecorded'),
      )
      navigate(`/stylist/workbook/${entry.id}`)
    } catch (error) {
      const message = getErrorMessage(error, '')
      if (/zaključan|KIF/i.test(message)) {
        toastApiError(
          error,
          t('stylistPortal.reservationDetail.workbookLocked'),
        )
        return
      }
      toastApiError(error, t('stylistPortal.reservationDetail.paymentFailed'))
    }
  }

  const handleCancel = async (rawReason: string) => {
    if (!reservation) return
    const cancelReason = rawReason.trim()
    if (!cancelReason) {
      toastApiError(null, t('stylistPortal.reservationDetail.cancellationReasonRequired'))
      return
    }
    try {
      await actions.cancel.mutateAsync({ reservationId: reservation.id, cancelReason })
      setCancelOpen(false)
      success(t('stylistPortal.reservationDetail.cancelledTitle'), t('stylistPortal.reservationDetail.cancelledMessage'))
      navigate('/stylist/schedule')
    } catch (error) {
      toastApiError(error, t('stylistPortal.reservationDetail.cancelFailed'))
    }
  }

  const handleNoShow = async (rawReason: string, applyPenalty: boolean) => {
    if (!reservation) return
    const reason = rawReason.trim()
    if (!reason) {
      toastApiError(null, t('stylistPortal.reservationDetail.reasonRequired'))
      return
    }
    try {
      await actions.noShow.mutateAsync({ reservationId: reservation.id, reason, applyPenalty })
      setNoShowOpen(false)
      success(t('stylistPortal.reservationDetail.noShowTitle'), t('stylistPortal.reservationDetail.noShowMessage'))
      navigate('/stylist/schedule')
    } catch (error) {
      toastApiError(error, t('stylistPortal.reservationDetail.noShowFailed'))
    }
  }

  const handleReorder = async (times: { startTime: string; endTime: string }) => {
    if (!reservation) return
    try {
      await actions.reorder.mutateAsync({
        reservationId: reservation.id,
        targetStartTime: times.startTime,
        targetEndTime: times.endTime,
      })
      setReorderOpen(false)
      success(t('stylistPortal.reservationDetail.reorderSentTitle'), t('stylistPortal.reservationDetail.reorderSentMessage'))
      await refetch()
    } catch (error) {
      toastApiError(error, t('stylistPortal.reservationDetail.reorderFailed'))
    }
  }

  const handleOverrun = async (mode: RescheduleMode, manualShiftMinutes?: number) => {
    if (!reservation) return
    setOverrunOpen(false)
    try {
      await proposeReschedule({
        reservationId: reservation.id,
        includeBreaks: false,
        mode,
        manualShiftMinutes,
      })
    } catch (error) {
      void error
    }
    const params = new URLSearchParams({ mode, includeBreaks: '0' })
    if (typeof manualShiftMinutes === 'number') {
      params.set('manualShiftMinutes', String(manualShiftMinutes))
    }
    navigate(
      `/stylist/workbook/reschedule-preview/${reservation.id}?${params.toString()}`,
    )
  }

  return {
    cancelOpen,
    completeOpen,
    noShowOpen,
    overrunOpen,
    reorderOpen,
    setCancelOpen,
    setCompleteOpen,
    setNoShowOpen,
    setOverrunOpen,
    setReorderOpen,
    handleCancel,
    handleComplete,
    handleNoShow,
    handleReorder,
    handleStart,
    handleStaffConfirm,
    handleOverrunActual: () => handleOverrun('actual_overrun'),
    handleOverrunManual: (minutes: number) =>
      handleOverrun('manual_minutes', minutes),
    handleOverrunBreakOnly: () => handleOverrun('use_break_only'),
  }
}
