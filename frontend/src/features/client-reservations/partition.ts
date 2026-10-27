import type { Reservation } from '../reservations/types'
import { salonWallTimeToInstant } from '../../../../shared/business-date.mjs'

const TERMINAL = [
  'COMPLETED',
  'CANCELLED_BY_CLIENT',
  'CANCELLED_BY_STYLISTS',
  'NO_SHOW',
] as const

export const isReservationUpcoming = (r: Reservation): boolean => {
  const dateOnly = String(r.reservationDate ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return true
  try {
    return (
      salonWallTimeToInstant(dateOnly, r.endTime ?? '23:59').getTime() >=
      Date.now()
    )
  } catch {
    return true
  }
}

export const partitionClientReservations = (
  items: Reservation[],
): { upcoming: Reservation[]; past: Reservation[] } => {
  const upcoming: Reservation[] = []
  const past: Reservation[] = []
  for (const r of items) {
    if (isReservationUpcoming(r) && !(TERMINAL as readonly string[]).includes(r.status)) {
      upcoming.push(r)
    } else {
      past.push(r)
    }
  }
  past.sort((a, b) =>
    b.reservationDate.slice(0, 10).localeCompare(a.reservationDate.slice(0, 10)),
  )
  return { upcoming, past }
}

export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  if (typeof msg === 'string' && msg.trim()) return msg
  return fallback
}
