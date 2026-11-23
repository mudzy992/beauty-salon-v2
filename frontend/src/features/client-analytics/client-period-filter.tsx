import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import type { ClientAnalyticsData } from './client-analytics-types'
import type { DateFormatter } from './presentation-types'

type Props = {
  analytics: ClientAnalyticsData | null
  dateFrom: string
  dateTo: string
  setDateFrom: (value: string) => void
  setDateTo: (value: string) => void
  applyDateFilter: () => void
  clearDateFilter: () => void
  formatDateOnly: DateFormatter
}
export function ClientPeriodFilter({ analytics, dateFrom, dateTo, setDateFrom, setDateTo, applyDateFilter, clearDateFilter, formatDateOnly }: Props) {
  const { t } = useTranslation()
  return (
    <>
      <div className="flex flex-col flex-wrap gap-3 md:flex-row md:items-end">
        <div className="w-full md:w-auto">
          <Label htmlFor="client-from" className="text-sm">
            {t('clientAnalyticsPage.fromDate')}
          </Label>
          <Input id="client-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 md:max-w-[160px]" />
        </div>
        <div className="w-full md:w-auto">
          <Label htmlFor="client-to" className="text-sm">
            {t('clientAnalyticsPage.toDate')}
          </Label>
          <Input id="client-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 md:max-w-[160px]" />
        </div>
        <Button type="button" size="sm" onClick={applyDateFilter} disabled={!dateFrom || !dateTo || dateFrom > dateTo} className="md:mb-0.5">
          {t('clientAnalyticsPage.applyPeriod')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={clearDateFilter} className="md:mb-0.5">
          {t('clientAnalyticsPage.fullPeriod')}
        </Button>
        {analytics && (analytics.fromDate || analytics.toDate) ? (
          <p className="pb-1 text-sm text-content-strong md:self-center">
            {t('clientAnalyticsPage.showingPeriod', { from: formatDateOnly(analytics.fromDate), to: formatDateOnly(analytics.toDate) })}
          </p>
        ) : null}
      </div>

      {dateFrom && dateTo && dateFrom > dateTo ? <p role="alert" className="text-sm text-content">{t('adminAnalytics.invalidRange')}</p> : null}
    </>
  )
}
