import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStylistAnalyticsData } from '../features/stylist-analytics/use-stylist-analytics-data'
import { StylistAnalyticsTables } from '../features/stylist-analytics/stylist-analytics-tables'
import { StylistPicker } from '../features/stylist-analytics/stylist-picker'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { formatLocalizedAmount, formatLocalizedNumber, getIntlLocale } from '../i18n/locale-utils.mjs'
import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'

const StatCard = ({ title, value }: { title: string; value: string }) => (
  <Card className="min-w-0 p-5">
    <p className="text-xs font-medium uppercase tracking-wide text-content-strong">{title}</p>
    <p className="mt-2 text-3xl font-semibold text-content">{value}</p>
  </Card>
)

export default function StylistAnalytics() {
  const { t, i18n } = useTranslation()
  const locale = getIntlLocale(i18n.language)
  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—'
    const dateOnly = value.slice(0, 10)
    try {
      return formatDateOnlyLocale(dateOnly, locale, { dateStyle: 'medium' })
    } catch {
      return dateOnly
    }
  }
  const [searchParams] = useSearchParams()
  const stylistId = searchParams.get('stylistId')
  const appliedFrom = searchParams.get('fromDate') ?? ''
  const appliedTo = searchParams.get('toDate') ?? ''
  const { data, loading, dateFrom, setDateFrom, dateTo, setDateTo, error, load, lastParams } =
    useStylistAnalyticsData({ stylistId, appliedFrom, appliedTo })
  const invalidRange = Boolean(dateFrom) !== Boolean(dateTo) || (!!dateFrom && !!dateTo && dateFrom > dateTo)

  // 2.4.6 — svako stanje stranice ima <h1>; bez `?stylistId=` tab bira stilista.
  if (!stylistId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-content">{t('adminAnalytics.tabs.stylists')}</h1>
          <p className="mt-1 text-sm text-content-strong">{t('stylistAnalytics.picker.description')}</p>
        </div>
        <StylistPicker />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost">
        <RouterLink to="/admin/analytics?tab=stylists">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('stylistAnalytics.backToList')}
        </RouterLink>
      </Button>

      <div className="flex flex-col flex-wrap gap-3 md:flex-row md:items-end">
        <div className="w-full md:w-auto">
          <Label htmlFor="stylist-from" className="text-sm">
            {t('stylistAnalytics.fromDate')}
          </Label>
          <Input id="stylist-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 md:max-w-[160px]" />
        </div>
        <div className="w-full md:w-auto">
          <Label htmlFor="stylist-to" className="text-sm">
            {t('stylistAnalytics.toDate')}
          </Label>
          <Input id="stylist-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 md:max-w-[160px]" />
        </div>
        <Button type="button" size="sm" onClick={() => {
          const params: Record<string, string> = {}
          if (dateFrom) params.fromDate = dateFrom
          if (dateTo) params.toDate = dateTo
          load(params)
        }} disabled={invalidRange} className="md:mb-0.5">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('stylistAnalytics.applyingPeriod')}
            </>
          ) : (
            t('stylistAnalytics.applyPeriod')
          )}
        </Button>
        {data && data.stylist.id === stylistId && (data.fromDate || data.toDate) ? (
          <p className="pb-1 text-sm text-content-strong md:self-center">
            {t('stylistAnalytics.period', { from: formatDate(data.fromDate), to: formatDate(data.toDate) })}
          </p>
        ) : null}
      </div>

      {invalidRange ? <p role="alert" className="text-sm text-content">{t('stylistAnalytics.invalidRange')}</p> : null}
      {loading ? <div role="status" className="flex justify-center p-10 text-content-strong"><span className="sr-only">{t('common.loading')}</span><Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" /></div> : null}
      {error && !loading ? <div role="alert" className="space-y-3"><p>{t('stylistAnalytics.loadFailed')}</p><Button type="button" variant="outline" onClick={() => load(lastParams.current)}>{t('common.retry')}</Button></div> : null}
      {data && data.stylist.id === stylistId && !loading ? <>
      <div>
        <h1 className="text-xl font-semibold text-content">{data.stylist.name}</h1>
        {data.stylist.user?.email ? <p className="text-sm text-content-strong">{data.stylist.user.email}</p> : null}
      </div>

      <p className="text-sm text-content">{t('stylistAnalytics.sourceNote')}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title={t('stylistAnalytics.completedInPeriod')} value={formatLocalizedNumber(data.completedCount, i18n.language)} />
        <StatCard title={t('stylistAnalytics.revenue')} value={formatLocalizedAmount(data.revenue, i18n.language)} />
        <StatCard title={t('stylistAnalytics.tips')} value={formatLocalizedAmount(data.tips, i18n.language)} />
      </div>

      <StylistAnalyticsTables data={data} formatDate={formatDate} />
      </> : <h1 className="sr-only">{t('adminAnalytics.tabs.stylists')}</h1>}
    </div>
  )
}
