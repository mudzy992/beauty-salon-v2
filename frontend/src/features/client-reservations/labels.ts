import type { Reservation } from '../reservations/types'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'

export const getClientReservationServicesLabel = (r: Reservation): string => {
  const names =
    r.items && r.items.length > 0
      ? r.items
          .map((it) => it.service?.name)
          .filter((n): n is string => Boolean(n && n.trim()))
      : []
  if (names.length === 1) return names[0]!
  if (names.length > 1) return `${names[0]} + ${names.length - 1}`
  return r.service?.name ?? 'Usluga'
}

export const getClientReservationStylistLabel = (r: Reservation): string | null => {
  const u = r.confirmedStylist?.user
  if (!u) return null
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return name || null
}

export const formatReservationDate = (value: string): string => {
  try {
    return formatDateOnlyLocale(value.slice(0, 10), 'bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return value
  }
}
