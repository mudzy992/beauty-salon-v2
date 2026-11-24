import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'
import { formatLocalizedAmount, getIntlLocale } from '../i18n/locale-utils.mjs'
import { useAnalyticsDashboard } from '../features/analytics/use-analytics-dashboard'
import { AnalyticsPeriodFilter } from '../features/analytics/analytics-period-filter'
import { AnalyticsSummary } from '../features/analytics/analytics-summary'
import { AnalyticsFinanceChart } from '../features/analytics/analytics-finance-chart'
import { AnalyticsPerformanceTables } from '../features/analytics/analytics-performance-tables'
import { Button } from '../components/ui/button'

export default function Analytics() {
  const { t, i18n } = useTranslation()
  const { data, loading, loadError, load, lastParams } = useAnalyticsDashboard()

  // 1.1.1: graf mora imati tekstualnu alternativu s kljucnim brojevima.
  //
  // 🔴 Oba hooka MORAJU biti iznad `if (loading)` / `if (!data)` early return-a.
  // Kad su bili ispod njih, prvi render (loading=true) je imao jedan hook manje od
  // drugog, pa je React bacao #310 „Rendered more hooks than during the previous
  // render" i analitika se rusila pri svakom ucitavanju (regresija iz `87eeabc`).
  const chartData = useMemo(
    () =>
      (data?.monthlyFinance ?? []).map((m) => ({
        ...m,
        label: new Intl.DateTimeFormat(getIntlLocale(i18n.language), {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(Date.UTC(m.year, m.month - 1, 1))),
        net: m.income + m.tips - m.expenses,
      })),
    [data, i18n.language],
  )

  const chartSummary = useMemo(() => {
    const sum = (key: 'income' | 'expenses' | 'tips') =>
      chartData.reduce((acc, row) => acc + Number(row[key] ?? 0), 0)
    return {
      months: chartData.length,
      revenue: formatLocalizedAmount(sum('income'), i18n.language),
      expenses: formatLocalizedAmount(sum('expenses'), i18n.language),
      tips: formatLocalizedAmount(sum('tips'), i18n.language),
    }
  }, [chartData, i18n.language])

  const periodLabel = data?.fromDate && data.toDate
    ? t('adminAnalytics.periodLabel', {
        from: formatDateOnlyLocale(data.fromDate, i18n.language),
        to: formatDateOnlyLocale(data.toDate, i18n.language),
      })
    : t('adminAnalytics.description')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-content">{t('adminAnalytics.title')}</h1>
      <AnalyticsPeriodFilter load={load} periodLabel={periodLabel} />
      {loading ? <div role="status" className="flex justify-center p-10 text-content-strong"><span className="sr-only">{t('common.loading')}</span><Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" /></div> : null}
      {loadError && !loading ? <div role="alert" className="space-y-3"><p>{t('adminAnalytics.loadFailed')}</p><Button type="button" variant="outline" onClick={() => load(lastParams.current)}>{t('common.retry')}</Button></div> : null}
      {data && !loading ? <>
        <AnalyticsSummary data={data} periodLabel={periodLabel} />
        <AnalyticsFinanceChart data={data} chartData={chartData} chartSummary={chartSummary} />
        <AnalyticsPerformanceTables data={data} />
      </> : null}
    </div>
  )
}
