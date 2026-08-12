import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { useStylistProfileMe } from '../../stylist-workbook/hooks/useStylistProfileMe'
import {
  getStylistScheduleWindow,
  useStylistScheduleReservations,
} from '../hooks/useStylistReservations'
import type { Reservation, ReservationStatus } from '../types'

type Section = { title: string; data: Reservation[] }

const formatDate = (iso: string) => {
  const d = new Date(iso.slice(0, 10))
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString('bs-BA', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })
}

const formatTime = (t: string) => t?.slice(0, 5) ?? t

const getStatusVariant = (status: ReservationStatus) => {
  if (status === 'IN_PROGRESS') return 'secondary'
  if (status === 'ATTENDANCE_CONFIRMED' || status === 'CONFIRMED') return 'brand'
  if (status === 'STYLIST_REVIEW' || status === 'PENDING') return 'warning'
  if (status === 'COMPLETED') return 'success'
  if (status === 'NO_SHOW' || status === 'CANCELLED_BY_CLIENT' || status === 'CANCELLED_BY_STYLISTS') return 'danger'
  return 'secondary'
}

const buildSections = (items: Reservation[]): Section[] => {
  const todayStr = new Date().toISOString().slice(0, 10)
  const today: Reservation[] = []
  const futureByDate: Record<string, Reservation[]> = {}

  for (const r of items) {
    const d = r.reservationDate.slice(0, 10)
    if (d === todayStr) today.push(r)
    else if (d > todayStr) {
      if (!futureByDate[d]) futureByDate[d] = []
      futureByDate[d].push(r)
    }
  }

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

  today.sort(sortInDay)
  Object.keys(futureByDate).forEach((k) => futureByDate[k]!.sort(sortInDay))

  const sections: Section[] = []
  if (today.length) sections.push({ title: 'Danas', data: today })
  Object.keys(futureByDate)
    .sort()
    .forEach((d) => sections.push({ title: formatDate(d), data: futureByDate[d] ?? [] }))
  return sections
}

export const StylistSchedulePage = () => {
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()
  const { reservations, isLoading, isFetching, refetch } = useStylistScheduleReservations({
    stylistProfileId: profileId,
  })
  const scheduleWindow = getStylistScheduleWindow()

  const sections = useMemo(() => buildSections(reservations), [reservations])

  if (profileLoading || (isLoading && !profileId)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-500">Učitavanje…</div>
      </div>
    )
  }

  if (!profileId) {
    return (
      <Card className="p-6">
        <p className="text-slate-900 dark:text-slate-50 font-semibold">Nema profila</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Profil stilista nije pronađen.</p>
      </Card>
    )
  }

  const empty = !isLoading && reservations.length === 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Raspored</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Prikazuju se termini koje ste preuzeli ({scheduleWindow.fromDate} – {scheduleWindow.toDate}).
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          Osvježi
        </Button>
      </div>

      {empty ? (
        <Card className="p-6">
          <p className="font-semibold text-slate-900 dark:text-slate-50">Nema termina</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Preuzeti termini će se pojaviti ovdje.</p>
        </Card>
      ) : null}

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{section.title}</h2>
            <div className="grid gap-3">
              {section.data.map((r) => {
                const detailHref = `/stylist/schedule/${r.id}`
                const completeHref = `/stylist/schedule/${r.id}?action=complete`

                return (
                  <Card key={r.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={detailHref} className="block">
                          <p className="font-semibold text-slate-900 dark:text-slate-50 truncate hover:underline underline-offset-4">
                            {r.service?.name ?? 'Usluga'}
                          </p>
                        </Link>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {formatTime(r.startTime)} – {formatTime(r.endTime)}
                          {r.client ? ` · ${r.client.firstName} ${r.client.lastName}` : ''}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge variant={getStatusVariant(r.status)}>{r.status}</Badge>
                        <Link to={detailHref}>
                          <Button type="button" variant="outline" size="sm">
                            Detalji
                          </Button>
                        </Link>
                        {r.status === 'IN_PROGRESS' ? (
                          <Link to={completeHref}>
                            <Button type="button" size="sm">
                              Naplata
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

