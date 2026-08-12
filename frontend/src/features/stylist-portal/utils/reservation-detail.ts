import type { Reservation, ReservationStatus } from '../types'

type ReservationWithItems = Reservation & {
  items?: Array<{ service?: { price?: number | string | null } | null }>
}

export const formatReservationTime = (time: string) => time?.slice(0, 5) ?? time

export const formatReservationDate = (iso: string) => {
  const date = new Date(iso.slice(0, 10))
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10)
  return date.toLocaleDateString('bs-BA', {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
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

export const getPlannedReservationDateTime = (reservationDate: string, time: string) => {
  const [year, month, day] = reservationDate.slice(0, 10).split('-').map(Number)
  const [hours, minutes] = time.slice(0, 5).split(':').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0)
}

export const computeReservationMinimumCharge = (reservation: Reservation) => {
  const items = (reservation as ReservationWithItems).items
  const base = items?.length
    ? items.reduce((sum, item) => sum + Number(item.service?.price ?? 0), 0)
    : Number(reservation.service?.price ?? 0)
  return Math.max(0, base - Number(reservation.loyaltyDiscountAmount ?? 0))
}
