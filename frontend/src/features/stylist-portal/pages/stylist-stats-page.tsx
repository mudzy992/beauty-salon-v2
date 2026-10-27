import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../../components/ui/button'
import { useQuery } from '@tanstack/react-query'

import { Card } from '../../../components/ui/card'
import { useStylistProfileMe } from '../../stylist-workbook/hooks/useStylistProfileMe'
import { fetchDailyLogEntries } from '../../stylist-workbook/api/stylist-workbook.api'
import { fetchStylistReservations } from '../api/stylist-portal.api'
import type { DailyLogEntry } from '../../stylist-workbook/types'
import type { Reservation } from '../types'
import { getCalendarMonthRange } from '../../../../../shared/business-date.mjs'
import { formatLocalizedAmount, formatLocalizedNumber, getIntlLocale } from '../../../i18n/locale-utils.mjs'

const getMonthRange = () => getCalendarMonthRange()
const formatDateOnly = (value: string, locale: string) => {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
    : '—'
}

export const StylistStatsPage = () => {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
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
        <div className="text-sm text-slate-500">{t('common.loading')}</div>
      </div>
    )
  }

  if (!profileId) {
    return (
      <Card className="p-6">
        <p className="text-slate-900 dark:text-slate-50 font-semibold">{t('stylistPortal.stats.noProfile')}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.stats.profileNotFound')}</p>
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
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t('stylistPortal.stats.title')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.stats.monthRange', { from: formatDateOnly(fromDate, locale), to: formatDateOnly(toDate, locale) })}</p>
      </div>

      {reservationsQuery.isError || dailyLogQuery.isError ? (
        <Card className="flex flex-wrap items-center justify-between gap-2 p-4" role="alert">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.stats.loadFailed')}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void reservationsQuery.refetch()
              void dailyLogQuery.refetch()
            }}
          >
            {t('common.retry')}
          </Button>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.stats.completedReservations')}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{formatLocalizedNumber(completedReservations.length, locale, { maximumFractionDigits: 0 })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.stats.confirmedUpcoming')}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{formatLocalizedNumber(confirmedUpcoming.length, locale, { maximumFractionDigits: 0 })}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.stats.workbookRevenue')}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{formatLocalizedAmount(totalRevenue, locale)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">{t('stylistPortal.stats.workbookTips')}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{formatLocalizedAmount(totalTips, locale)}</p>
        </Card>
      </div>
    </div>
  )
}

