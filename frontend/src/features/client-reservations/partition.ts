import type { Reservation } from '../reservations/types'

const TERMINAL = [
  'COMPLETED',
  'CANCELLED_BY_CLIENT',
  'CANCELLED_BY_STYLISTS',
  'NO_SHOW',
] as const

export const isReservationUpcoming = (r: Reservation): boolean => {
  const end = new Date(r.reservationDate)
  if (Number.isNaN(end.getTime())) return true
  const [hh, mm] = (r.endTime ?? '23:59').split(':').map(Number)
  end.setHours(hh || 0, mm || 0, 0, 0)
  return end.getTime() >= Date.now()
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
  past.sort((a, b) => {
    const da = new Date(a.reservationDate).getTime()
    const db = new Date(b.reservationDate).getTime()
    return db - da
  })
  return { upcoming, past }
}

export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })
    ?.response?.data?.message
  if (Array.isArray(msg)) return msg.join(', ')
  if (typeof msg === 'string' && msg.trim()) return msg
  return fallback
}
