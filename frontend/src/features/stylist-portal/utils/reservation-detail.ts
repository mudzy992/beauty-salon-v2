import type { Reservation, ReservationStatus } from '../types'
import {
  formatDateOnlyLocale,
  salonWallTimeToInstant,
} from '../../../../../shared/business-date.mjs'

type ReservationWithItems = Reservation & {
  items?: Array<{ service?: { price?: number | string | null } | null }>
}

export const formatReservationTime = (time: string) => time?.slice(0, 5) ?? time

export const formatReservationDate = (iso: string) => {
  try {
    return formatDateOnlyLocale(iso.slice(0, 10), 'bs-BA', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

export const getReservationStatusVariant = (status: ReservationStatus) => {
  if (status === 'IN_PROGRESS') return 'secondary'
  if (status === 'ATTENDANCE_CONFIRMED' || status === 'CONFIRMED') return 'brand'
  if (status === 'STYLIST_REVIEW' || status === 'PENDING') return 'warning'
  if (status === 'COMPLETED') return 'success'
  if (
    status === 'NO_SHOW' ||
    status === 'CANCELLED_BY_CLIENT' ||
    status === 'CANCELLED_BY_STYLISTS'
  ) {
    return 'danger'
  }
  return 'secondary'
}

export const parseReservationMoney = (value: string) => {
  const amount = parseFloat(value.replace(',', '.'))
  return Number.isFinite(amount) ? amount : Number.NaN
}

export const getPlannedReservationDateTime = (reservationDate: string, time: string) =>
  salonWallTimeToInstant(reservationDate.slice(0, 10), time)

export const canStaffConfirmAttendanceUi = (
  reservation: Pick<Reservation, 'status' | 'attendancePolicy' | 'reservationDate' | 'startTime'>,
  now = Date.now(),
): boolean => {
  if (reservation.status !== 'CONFIRMED') return false
  if (reservation.attendancePolicy === 'STAFF_WAIVED') return false
  return now < getPlannedReservationDateTime(reservation.reservationDate, reservation.startTime).getTime()
}

export const computeReservationMinimumCharge = (reservation: Reservation) => {
  const items = (reservation as ReservationWithItems).items
  const base = items?.length
    ? items.reduce((sum, item) => sum + Number(item.service?.price ?? 0), 0)
    : Number(reservation.service?.price ?? 0)
  return Math.max(0, base - Number(reservation.loyaltyDiscountAmount ?? 0))
}
