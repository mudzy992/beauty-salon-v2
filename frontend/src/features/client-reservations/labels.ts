import type { Reservation } from '../reservations/types'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'

export const getClientReservationServicesLabel = (
  r: Reservation,
  fallback = 'Usluga',
): string => {
  const names =
    r.items && r.items.length > 0
      ? r.items
          .map((it) => it.service?.name)
          .filter((n): n is string => Boolean(n && n.trim()))
      : []
  if (names.length === 1) return names[0]!
  if (names.length > 1) return `${names[0]} + ${names.length - 1}`
  return r.service?.name ?? fallback
}

export const getClientReservationStylistLabel = (r: Reservation): string | null => {
  const u = r.confirmedStylist?.user
  if (!u) return null
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return name || null
}

const CLIENT_RESERVATION_STATUS_KEYS: Record<string, string> = {
  PENDING: 'public.myReservations.status.pending',
  STYLIST_REVIEW: 'public.myReservations.status.stylistReview',
  CONFIRMED: 'public.myReservations.status.confirmed',
  ATTENDANCE_CONFIRMED: 'public.myReservations.status.attendanceConfirmed',
  IN_PROGRESS: 'public.myReservations.status.inProgress',
  AWAITING_DAILY_LOG: 'public.myReservations.status.awaitingDailyLog',
  COMPLETED: 'public.myReservations.status.completed',
  CANCELLED_BY_CLIENT: 'public.myReservations.status.cancelledByClient',
  CANCELLED_BY_STYLISTS: 'public.myReservations.status.cancelledBySalon',
  NO_SHOW: 'public.myReservations.status.noShow',
}

export const getClientReservationStatusKey = (
  status: string,
  cancelReason?: string | null,
): string | null => {
  if (
    status === 'CANCELLED_BY_CLIENT' &&
    (cancelReason ?? '').trim() === 'Nije potvrđen dolazak u roku'
  ) {
    return 'public.myReservations.status.cancelledNoAttendance'
  }
  return CLIENT_RESERVATION_STATUS_KEYS[status] ?? null
}

export const formatReservationDate = (
  value: string,
  locale = 'bs-BA',
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  },
): string => {
  try {
    return formatDateOnlyLocale(value.slice(0, 10), locale, options)
  } catch {
    return value
  }
}
