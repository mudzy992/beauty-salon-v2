import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Link as RouterLink } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  addDateOnlyMonths,
  formatDateOnlyLocale,
  getDateTimePartsInTimeZone,
  parseDateOnly,
} from '../../../shared/business-date.mjs'
import { formatLocalizedAmount, formatLocalizedNumber, getIntlLocale } from '../i18n/locale-utils.mjs'
import api from '../api/client'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

interface MonthlyFinance {
  year: number
  month: number
  label: string
  income: number
  expenses: number
  tips: number
}

interface StylistPerformance {
  stylistProfileId: string
  stylistName: string
  completedCount: number
  revenue: number
  tips: number
}

interface TopServiceRow {
  serviceId: string
  serviceName: string
  count: number
  revenue: number
}

interface PeriodExpenseCategoryRow {
  categoryId: string
  categoryName: string
  total: number
}

interface PeriodFinance {
  servicesRevenue: number
  tips: number
  totalIncome: number
  expensesByCategory: PeriodExpenseCategoryRow[]
  totalExpenses: number
  netProfit: number
}

interface AnalyticsDashboard {
  monthlyFinance: MonthlyFinance[]
  stylistPerformance: StylistPerformance[]
  topServices: TopServiceRow[]
  conversionRate: number | null
  totalPending: number
  totalCompleted: number
  fromDate: string
  toDate: string
  periodFinance: PeriodFinance
}

type PeriodPreset = '12' | 'thisMonth' | 'lastMonth' | 'custom'

const getPresetParams = (preset: PeriodPreset, customFrom?: string, customTo?: string): Record<string, string> => {
  const now = new Date()
  const current = getDateTimePartsInTimeZone(now)
  if (preset === '12') return { monthsBack: '12' }
  if (preset === 'thisMonth') {
    return { year: String(current.year), month: String(current.month) }
  }
  if (preset === 'lastMonth') {
    const firstOfCurrentMonth = `${String(current.year).padStart(4, '0')}-${String(current.month).padStart(2, '0')}-01`
    const previous = parseDateOnly(addDateOnlyMonths(firstOfCurrentMonth, -1))
    return { year: String(previous.year), month: String(previous.month) }
  }
  if (preset === 'custom' && customFrom && customTo) return { fromDate: customFrom, toDate: customTo }
  return { monthsBack: '12' }
}

const StatCard = ({ title, value, hint }: { title: string; value: string; hint?: string }) => (
  <Card className="min-w-0 p-5">
    <p className="text-xs font-medium uppercase tracking-wide text-content-strong">{title}</p>
    <p className="mt-2 text-3xl font-semibold text-content dark:text-slate-50">{value}</p>
    {hint ? <p className="mt-2 text-sm text-content-strong">{hint}</p> : null}
  </Card>
)

export default function Analytics() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<AnalyticsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodPreset>('12')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const requestSequence = useRef(0)
  const lastParams = useRef<Record<string, string>>({ monthsBack: '12' })
  const [loadError, setLoadError] = useState(false)

  const load = useCallback((params: Record<string, string>) => {
    const sequence = ++requestSequence.current
    lastParams.current = params
    setLoading(true)
    setLoadError(false)
    setData(null)
    api
      .get<AnalyticsDashboard>('/api/analytics/dashboard', { params })
      .then((res) => {
        if (sequence !== requestSequence.current) return
        const value = res.data
        if (!value || !value.periodFinance || !Array.isArray(value.monthlyFinance) ||
            !Array.isArray(value.stylistPerformance) || !Array.isArray(value.topServices) ||
            !Array.isArray(value.periodFinance.expensesByCategory) ||
            !parseDateOnly(value.fromDate) || !parseDateOnly(value.toDate) ||
            ![value.periodFinance.servicesRevenue, value.periodFinance.tips, value.periodFinance.totalIncome,
              value.periodFinance.totalExpenses, value.periodFinance.netProfit, value.totalPending, value.totalCompleted].every(Number.isFinite) ||
            (value.conversionRate !== null && !Number.isFinite(value.conversionRate)) ||
            !value.monthlyFinance.every(row => Number.isInteger(row.year) && Number.isInteger(row.month) && row.month >= 1 && row.month <= 12 && [row.income, row.expenses, row.tips].every(Number.isFinite)) ||
            !value.periodFinance.expensesByCategory.every(row => Number.isFinite(row.total)) ||
            !value.stylistPerformance.every(row => [row.completedCount, row.revenue, row.tips].every(Number.isFinite)) ||
            !value.topServices.every(row => [row.count, row.revenue].every(Number.isFinite))) throw new Error('Invalid analytics response')
        setData(value)
      })
      .catch(() => { if (sequence === requestSequence.current) setLoadError(true) })
      .finally(() => { if (sequence === requestSequence.current) setLoading(false) })
  }, [])

  useEffect(() => {
    load({ monthsBack: '12' })
    return () => { requestSequence.current += 1 }
  }, [load])

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
  const invalidRange = !!customFrom && !!customTo && customFrom > customTo

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-content dark:text-slate-50">{t('adminAnalytics.title')}</h1>

      <div className="flex flex-col flex-wrap items-stretch gap-4 md:flex-row md:items-end">
        <div className="w-full md:w-auto md:min-w-[290px]">
          <Label htmlFor="analytics-period" className="text-sm">
            {t('adminAnalytics.period')}
          </Label>
          <select
            id="analytics-period"
            data-default-admin-field=""
            value={period}
            onChange={(e) => {
              const next = e.target.value as PeriodPreset
              setPeriod(next)
              if (next !== 'custom') load(getPresetParams(next))
            }}
            className="mt-1 flex h-10 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-content shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2   dark:text-slate-50 dark:focus-visible:ring-offset-slate-950 md:max-w-[360px]"
          >
            <option value="12">{t('adminAnalytics.last12Months')}</option>
            <option value="thisMonth">{t('adminAnalytics.thisMonth')}</option>
            <option value="lastMonth">{t('adminAnalytics.lastMonth')}</option>
            <option value="custom">{t('adminAnalytics.customRange')}</option>
          </select>
        </div>

        {period === 'custom' ? (
          <>
            <div className="w-full md:w-auto">
              <Label htmlFor="analytics-from" className="text-sm">
                {t('adminAnalytics.from')}
              </Label>
              <Input
                id="analytics-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="mt-1 md:max-w-[180px]"
              />
            </div>
            <div className="w-full md:w-auto">
              <Label htmlFor="analytics-to" className="text-sm">
                {t('adminAnalytics.to')}
              </Label>
              <Input
                id="analytics-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="mt-1 md:max-w-[180px]"
              />
            </div>
            <Button type="button" onClick={() => load(getPresetParams('custom', customFrom, customTo))} disabled={!customFrom || !customTo || invalidRange} className="md:mb-0.5">
              {t('adminAnalytics.apply')}
            </Button>
            {invalidRange ? <p role="alert" className="text-sm text-content">{t('adminAnalytics.invalidRange')}</p> : null}
          </>
        ) : (
          <p className="pb-1 text-sm text-content-strong md:self-center">{periodLabel}</p>
        )}
      </div>

      {loading ? <div role="status" className="flex justify-center p-10 text-content-strong"><span className="sr-only">{t('common.loading')}</span><Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" /></div> : null}
      {loadError && !loading ? <div role="alert" className="space-y-3"><p>{t('adminAnalytics.loadFailed')}</p><Button type="button" variant="outline" onClick={() => load(lastParams.current)}>{t('common.retry')}</Button></div> : null}
      {data && !loading ? <>
      <p className="text-sm text-content">{t('adminAnalytics.financePeriodNote')}</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 p-5">
          <h2 className="text-sm font-semibold text-content dark:text-slate-50">{t('adminAnalytics.revenue')}</h2>
          <p className="mt-1 text-xs text-content-strong">{periodLabel}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2 tabular-nums">
              <dt className="text-content-strong">{t('adminAnalytics.servicesTotal')}</dt>
              <dd className="font-medium text-content dark:text-slate-50">
                {formatLocalizedAmount(data.periodFinance.servicesRevenue, i18n.language)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 tabular-nums">
              <dt className="text-content-strong">{t('adminAnalytics.tipsTotal')}</dt>
              <dd className="font-medium text-content dark:text-slate-50">
                {formatLocalizedAmount(data.periodFinance.tips, i18n.language)}
              </dd>
            </div>
            <div className="mt-3 flex justify-between gap-2 border-t border-line pt-3 tabular-nums ">
              <dt className="text-sm font-semibold text-content dark:text-slate-50">{t('adminAnalytics.totalIncome')}</dt>
              <dd className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                {formatLocalizedAmount(data.periodFinance.totalIncome, i18n.language)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="min-w-0 p-5">
          <h2 className="text-sm font-semibold text-content dark:text-slate-50">{t('adminAnalytics.expenses')}</h2>
          <p className="mt-1 text-xs text-content-strong">{periodLabel}</p>
          <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto text-sm">
            {data.periodFinance.expensesByCategory.length === 0 ? (
              <li className="text-content-strong">{t('adminAnalytics.noExpenses')}</li>
            ) : (
              data.periodFinance.expensesByCategory.map((row) => (
                <li
                  key={row.categoryId}
                  className="flex justify-between gap-2 border-b border-slate-100 pb-2 tabular-nums last:border-0 dark:border-slate-800/80"
                >
                  <span className="text-content-strong">{row.categoryName}</span>
                  <span className="font-medium text-content dark:text-slate-50">{formatLocalizedAmount(row.total, i18n.language)}</span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex justify-between gap-2 border-t border-line pt-3 tabular-nums ">
            <span className="text-sm font-semibold text-content dark:text-slate-50">{t('adminAnalytics.totalExpenses')}</span>
            <span className="text-lg font-semibold text-rose-700 dark:text-rose-400">
              {formatLocalizedAmount(data.periodFinance.totalExpenses, i18n.language)}
            </span>
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <h2 className="text-sm font-semibold text-content dark:text-slate-50">{t('adminAnalytics.profit')}</h2>
          <p className="mt-1 text-xs text-content-strong">{t('adminAnalytics.profitHint', { period: periodLabel })}</p>
          <p
            className={
              data.periodFinance.netProfit < 0
                ? 'mt-6 text-3xl font-semibold tabular-nums text-rose-600 dark:text-rose-400'
                : 'mt-6 text-3xl font-semibold tabular-nums text-content dark:text-slate-50'
            }
          >
            {formatLocalizedAmount(data.periodFinance.netProfit, i18n.language)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title={t('adminAnalytics.conversion')}
          value={data.conversionRate != null ? `${formatLocalizedNumber(data.conversionRate, i18n.language)}%` : '–'}
          hint={t('adminAnalytics.conversionHint', { completed: formatLocalizedNumber(data.totalCompleted, i18n.language), total: formatLocalizedNumber(data.totalPending + data.totalCompleted, i18n.language) })}
        />
        <StatCard title={t('adminAnalytics.completedReservations')} value={formatLocalizedNumber(data.totalCompleted, i18n.language)} />
        <StatCard title={t('adminAnalytics.pendingReservations')} value={formatLocalizedNumber(data.totalPending, i18n.language)} />
      </div>

      <Card className="min-w-0 p-5">
        <h2 className="mb-4 text-sm font-semibold text-content dark:text-slate-50">
          {t('adminAnalytics.monthlyChartTitle')}{' '}
          {data.fromDate && data.toDate
            ? t('adminAnalytics.monthlyChartRange', {
                from: formatDateOnlyLocale(data.fromDate, i18n.language),
                to: formatDateOnlyLocale(data.toDate, i18n.language),
              })
            : t('adminAnalytics.monthlyChartLast12')}
        </h2>
        <figure className="m-0">
        <div
          className="h-80 w-full min-w-0"
          role="img"
          aria-label={t('adminAnalytics.chartAriaLabel', chartSummary)}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--line))" strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} stroke="hsl(var(--text-muted-strong))" />
              <YAxis fontSize={12} stroke="hsl(var(--text-muted-strong))" tickFormatter={(v) => formatLocalizedAmount(v, i18n.language)} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--surface))', borderColor: 'hsl(var(--line))', color: 'hsl(var(--text))' }} labelStyle={{ color: 'hsl(var(--text))' }} itemStyle={{ color: 'hsl(var(--text))' }} formatter={(value: unknown) => formatLocalizedAmount(Number(value ?? 0), i18n.language)} />
              {/* Labels use content colour; series use existing semantic palette tokens. */}
              <Legend labelStyle={{ color: 'hsl(var(--text))' }} />
              <Bar dataKey="income" name={t('adminAnalytics.revenue')} fill="hsl(var(--ok-fg))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name={t('adminAnalytics.expenses')} fill="hsl(var(--bad-fg))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tips" name={t('adminAnalytics.tips')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* 1.1.1: ista informacija dostupna i kao tabela, ne samo kao graf */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-content-strong hover:text-content">
            {t('adminAnalytics.showDataTable')}
          </summary>
          <div className="app-table-wrap mt-3">
            <table className="app-table data-table w-full border-collapse">
              <caption className="sr-only">{t('adminAnalytics.chartTableCaption')}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-content-strong">
                  <th scope="col" className="py-2 pr-3 font-medium">{t('adminAnalytics.month')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">{t('adminAnalytics.revenue')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">{t('adminAnalytics.expenses')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">{t('adminAnalytics.tips')}</th>
                  <th scope="col" className="py-2 text-right font-medium">{t('adminAnalytics.net')}</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={`${row.year}-${row.month}`} className="border-b border-line">
                    <td data-label={t('adminAnalytics.month')} className="py-2 pr-3 font-medium">{row.label}</td>
                    <td data-label={t('adminAnalytics.revenue')} className="py-2 pr-3 text-right tabular-nums">{formatLocalizedAmount(Number(row.income ?? 0), i18n.language)}</td>
                    <td data-label={t('adminAnalytics.expenses')} className="py-2 pr-3 text-right tabular-nums">{formatLocalizedAmount(Number(row.expenses ?? 0), i18n.language)}</td>
                    <td data-label={t('adminAnalytics.tips')} className="py-2 pr-3 text-right tabular-nums">{formatLocalizedAmount(Number(row.tips ?? 0), i18n.language)}</td>
                    <td data-label={t('adminAnalytics.net')} className="py-2 text-right tabular-nums">{formatLocalizedAmount(Number(row.net ?? 0), i18n.language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
        </figure>
      </Card>

      <p className="text-sm text-content">{t('adminAnalytics.sourceNote')}</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 p-5">
          <h2 id="analytics-stylist-performance" className="mb-3 text-sm font-semibold text-content dark:text-slate-50">{t('adminAnalytics.stylistPerformance')}</h2>
          <div className="app-table-wrap">
            <table aria-labelledby="analytics-stylist-performance" className="app-table w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
                  <th scope="col" className="py-2 pr-3 font-medium">{t('adminAnalytics.stylist')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">{t('adminAnalytics.count')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">{t('adminAnalytics.revenueKm')}</th>
                  <th scope="col" className="py-2 text-right font-medium">{t('adminAnalytics.tipsKm')}</th>
                </tr>
              </thead>
              <tbody>
                {data.stylistPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-content-strong">
                      {t('adminAnalytics.noData')}
                    </td>
                  </tr>
                ) : (
                  data.stylistPerformance.map((s) => (
                    <tr key={s.stylistProfileId} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="py-2 pr-3">
                        <RouterLink
                          to={`/admin/analytics?${new URLSearchParams({ tab: 'stylists', stylistId: s.stylistProfileId, fromDate: data.fromDate, toDate: data.toDate })}`}
                          className="font-medium text-brand-gold-text hover:underline"
                        >
                          {s.stylistName}
                        </RouterLink>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatLocalizedNumber(s.completedCount, i18n.language)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatLocalizedNumber(s.revenue, i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="py-2 text-right tabular-nums">{formatLocalizedNumber(s.tips, i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <h2 id="analytics-top-services" className="mb-3 text-sm font-semibold text-content dark:text-slate-50">{t('adminAnalytics.topServices')}</h2>
          <div className="app-table-wrap">
            <table aria-labelledby="analytics-top-services" className="app-table w-full border-collapse">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
                  <th scope="col" className="py-2 pr-3 font-medium">{t('adminAnalytics.service')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">{t('adminAnalytics.count')}</th>
                  <th scope="col" className="py-2 text-right font-medium">{t('adminAnalytics.revenueKm')}</th>
                </tr>
              </thead>
              <tbody>
                {data.topServices.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-content-strong">
                      {t('adminAnalytics.noData')}
                    </td>
                  </tr>
                ) : (
                  data.topServices.map((s) => (
                    <tr key={s.serviceId} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="py-2 pr-3">{s.serviceName}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{formatLocalizedNumber(s.count, i18n.language)}</td>
                      <td className="py-2 text-right tabular-nums">{formatLocalizedAmount(s.revenue, i18n.language)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      </> : null}
    </div>
  )
}
