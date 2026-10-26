import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { fetchStylistReservations } from '../api/stylist-portal.api'
import type { Reservation } from '../types'
import {
  formatReservationTime,
  getPlannedReservationDateTime,
  canStaffConfirmAttendanceUi,
} from '../utils/reservation-detail'

type UseReservationDetailStatusParams = {
  reservation: Reservation | null
  profileId: string | null
  warning: (title: string, description?: string) => void
}

export const useReservationDetailStatus = ({
  reservation,
  profileId,
  warning,
}: UseReservationDetailStatusParams) => {
  const { t } = useTranslation()
  const [startBlockedReason, setStartBlockedReason] = useState<{
    key: string
    values?: Record<string, string>
  } | null>(null)
  const [timeTick, setTimeTick] = useState(0)
  const overrunPopupShownForRef = useRef<string | null>(null)
  const isConfirmedStylist = useMemo(() => {
    if (!reservation || !profileId) return false
    return (
      reservation.confirmedStylistId === profileId ||
      reservation.confirmedStylist?.id === profileId
    )
  }, [reservation, profileId])
  const canCancelByStylist =
    !!reservation &&
    (reservation.status === 'CONFIRMED' || reservation.status === 'IN_PROGRESS') &&
    isConfirmedStylist
  const canMarkNoShow =
    !!reservation &&
    (reservation.status === 'CONFIRMED' ||
      reservation.status === 'ATTENDANCE_CONFIRMED') &&
    isConfirmedStylist
  const canStart =
    !!reservation && reservation.status === 'ATTENDANCE_CONFIRMED' && isConfirmedStylist
  const canStaffConfirm =
    !!reservation && isConfirmedStylist && canStaffConfirmAttendanceUi(reservation)
  const canComplete =
    !!reservation && reservation.status === 'IN_PROGRESS' && isConfirmedStylist
  const hasAnyAction =
    canStart || canComplete || canCancelByStylist || canMarkNoShow || canStaffConfirm
  const isStartOverdue = useMemo(() => {
    if (!reservation || reservation.status !== 'ATTENDANCE_CONFIRMED') return false
    return Date.now() > getPlannedReservationDateTime(
      reservation.reservationDate,
      reservation.endTime,
    ).getTime()
  }, [reservation, timeTick])
  const overrunMinutes = useMemo(() => {
    if (!reservation || reservation.status !== 'IN_PROGRESS') return 0
    const plannedEnd = getPlannedReservationDateTime(
      reservation.reservationDate,
      reservation.endTime,
    )
    return Math.floor((Date.now() - plannedEnd.getTime()) / 60000)
  }, [reservation, timeTick])

  useEffect(() => {
    const interval = window.setInterval(() => setTimeTick((value) => value + 1), 30000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (reservation?.status !== 'IN_PROGRESS') overrunPopupShownForRef.current = null
  }, [reservation?.status])

  useEffect(() => {
    if (!reservation || !profileId || reservation.status !== 'IN_PROGRESS') return
    if (reservation.confirmedStylistId !== profileId || overrunMinutes < 5) return
    const popupKey = `${reservation.id}:5`
    if (overrunPopupShownForRef.current === popupKey) return
    overrunPopupShownForRef.current = popupKey
    warning(
      t('stylistPortal.reservationDetail.overrunWarningTitle'),
      t('stylistPortal.reservationDetail.overrunWarningDescription'),
    )
  }, [reservation, profileId, overrunMinutes, warning, t])

  useEffect(() => {
    let cancelled = false
    const resolveStartBlock = async () => {
      if (!reservation || !profileId || reservation.status !== 'ATTENDANCE_CONFIRMED') {
        if (!cancelled) setStartBlockedReason(null)
        return
      }
      const plannedStart = getPlannedReservationDateTime(
        reservation.reservationDate,
        reservation.startTime,
      )
      if (Date.now() < plannedStart.getTime()) {
        if (!cancelled) {
          setStartBlockedReason({
            key: 'stylistPortal.reservationDetail.startNotYetAllowed',
            values: { time: formatReservationTime(reservation.startTime) },
          })
        }
        return
      }
      try {
        const day = reservation.reservationDate.slice(0, 10)
        const list = await fetchStylistReservations({ fromDate: day, toDate: day })
        const earlierPending = list
          .filter((item) => item.id !== reservation.id)
          .filter((item) => item.confirmedStylistId === profileId)
          .filter((item) => item.startTime < reservation.startTime)
          .find(
            (item) =>
              item.status === 'CONFIRMED' || item.status === 'ATTENDANCE_CONFIRMED',
          )
        if (!cancelled) {
          setStartBlockedReason(
            earlierPending
              ? {
                  key: 'stylistPortal.reservationDetail.earlierAppointmentPending',
                  values: {
                    start: formatReservationTime(earlierPending.startTime),
                    end: formatReservationTime(earlierPending.endTime),
                  },
                }
              : null,
          )
        }
      } catch {
        if (!cancelled) setStartBlockedReason(null)
      }
    }
    void resolveStartBlock()
    return () => {
      cancelled = true
    }
  }, [reservation, profileId, timeTick])

  return {
    canCancelByStylist,
    canComplete,
    canMarkNoShow,
    canStaffConfirm,
    canStart,
    hasAnyAction,
    isConfirmedStylist,
    isStartOverdue,
    overrunMinutes,
    startBlockedReason: startBlockedReason
      ? t(startBlockedReason.key, startBlockedReason.values)
      : null,
  }
}
