import type { Reservation } from '../types'
import { formatDateOnlyLocale, getSalonDateOnly } from '../../../../../shared/business-date.mjs'

export type StylistScheduleSection = { title: string; data: Reservation[] }

const formatDate = (iso: string, locale: string) =>
  formatDateOnlyLocale(iso.slice(0, 10), locale, {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

const statusOrder: Record<string, number> = {
  IN_PROGRESS: 0,
  ATTENDANCE_CONFIRMED: 1,
  CONFIRMED: 2,
  STYLIST_REVIEW: 3,
  PENDING: 4,
  COMPLETED: 5,
  CANCELLED_BY_CLIENT: 6,
  CANCELLED_BY_STYLISTS: 7,
  NO_SHOW: 8,
}

const sortInDay = (a: Reservation, b: Reservation) => {
  const ao = statusOrder[a.status] ?? 99
  const bo = statusOrder[b.status] ?? 99
  if (ao !== bo) return ao - bo
  if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1
  return 0
}

/** Same day grouping and status/time ordering used by the stylist schedule. */
export const buildStylistScheduleSections = (
  items: Reservation[],
  locale: string,
  todayLabel: string,
): StylistScheduleSection[] => {
  const todayStr = getSalonDateOnly()
  const today: Reservation[] = []
  const futureByDate: Record<string, Reservation[]> = {}

  for (const reservation of items) {
    const date = reservation.reservationDate.slice(0, 10)
    if (date === todayStr) today.push(reservation)
    else if (date > todayStr) {
      if (!futureByDate[date]) futureByDate[date] = []
      futureByDate[date].push(reservation)
    }
  }

  today.sort(sortInDay)
  Object.keys(futureByDate).forEach((date) => futureByDate[date]!.sort(sortInDay))

  const sections: StylistScheduleSection[] = []
  if (today.length) sections.push({ title: todayLabel, data: today })
  Object.keys(futureByDate)
    .sort()
    .forEach((date) => sections.push({ title: formatDate(date, locale), data: futureByDate[date] ?? [] }))
  return sections
}
