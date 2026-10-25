import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Card } from '../../../components/ui/card'
import { useStylistProfileMe } from '../../stylist-workbook/hooks/useStylistProfileMe'
import { fetchDailyLogEntries } from '../../stylist-workbook/api/stylist-workbook.api'
import { fetchStylistReservations } from '../api/stylist-portal.api'
import type { DailyLogEntry } from '../../stylist-workbook/types'
import type { Reservation } from '../types'
import { getCalendarMonthRange } from '../../../../../shared/business-date.mjs'

const getMonthRange = () => getCalendarMonthRange()

const money = (n: number) => `${n.toFixed(2)} KM`

export const StylistStatsPage = () => {
  const { profileId, isLoading: profileLoading } = useStylistProfileMe()
  const { fromDate, toDate } = useMemo(() => getMonthRange(), [])

  const reservationsQuery = useQuery({
    queryKey: ['stylistStats', 'reservations', fromDate, toDate],
    queryFn: () => fetchStylistReservations({ fromDate, toDate }),
  })

  const dailyLogQuery = useQuery({
    queryKey: ['stylistStats', 'dailyLog', profileId, fromDate, toDate],
    queryFn: async () => {
      if (!profileId) return [] as DailyLogEntry[]
      return fetchDailyLogEntries({ stylistProfileId: profileId, fromDate, toDate })
    },
    enabled: !!profileId,
  })

  if (profileLoading || (reservationsQuery.isLoading && !profileId)) {
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

  const reservations = (reservationsQuery.data ?? []) as Reservation[]
  const dailyLog = (dailyLogQuery.data ?? []) as DailyLogEntry[]

  const completedReservations = reservations.filter((r) => r.status === 'COMPLETED')
  const confirmedUpcoming = reservations.filter(
    (r) => r.status === 'CONFIRMED' || r.status === 'ATTENDANCE_CONFIRMED' || r.status === 'IN_PROGRESS',
  )

  const completedLogEntries = dailyLog.filter((e) => e.status === 'COMPLETED')
  const totalRevenue = completedLogEntries.reduce((sum, e) => sum + Number(e.actualPrice ?? 0), 0)
  const totalTips = completedLogEntries.reduce((sum, e) => sum + Number(e.tipAmount ?? 0), 0)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Statistika</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Tekući mjesec ({fromDate} – {toDate})</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">Završene rezervacije</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{completedReservations.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">Nadolazeće (potvrđene)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{confirmedUpcoming.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">Prihod (Dnevnik)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{money(totalRevenue)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">Napojnice (Dnevnik)</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{money(totalTips)}</p>
        </Card>
      </div>
    </div>
  )
}

