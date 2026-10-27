import { useCallback, useEffect, useState } from 'react'
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
  <Card className="p-5">
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
    <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
    {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
  </Card>
)

export default function Analytics() {
  const { t, i18n } = useTranslation()
  const [data, setData] = useState<AnalyticsDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodPreset>('12')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = getPresetParams(period, customFrom, customTo)
    api
      .get<AnalyticsDashboard>('/api/analytics/dashboard', { params })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [period, customFrom, customTo])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center p-10 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-sm text-rose-600">{t('adminAnalytics.loadFailed')}</p>
      </div>
    )
  }

  const chartData = data.monthlyFinance.map((m) => ({
    ...m,
    label: new Intl.DateTimeFormat(getIntlLocale(i18n.language), {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(m.year, m.month - 1, 1))),
    net: m.income - m.expenses,
  }))

  const periodLabel =
    data.fromDate && data.toDate
      ? t('adminAnalytics.periodLabel', {
          from: formatDateOnlyLocale(data.fromDate, i18n.language),
          to: formatDateOnlyLocale(data.toDate, i18n.language),
        })
      : t('adminAnalytics.description')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('adminAnalytics.title')}</h1>

      <div className="flex flex-col flex-wrap items-stretch gap-4 md:flex-row md:items-end">
        <div className="w-full md:w-auto md:min-w-[220px]">
          <Label htmlFor="analytics-period" className="text-sm">
            {t('adminAnalytics.period')}
          </Label>
          <select
            id="analytics-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
            className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950 md:max-w-[220px]"
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
            <Button type="button" onClick={load} disabled={!customFrom || !customTo} className="md:mb-0.5">
              {t('adminAnalytics.apply')}
            </Button>
          </>
        ) : (
          <p className="pb-1 text-sm text-slate-600 dark:text-slate-300 md:self-center">{periodLabel}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('adminAnalytics.revenue')}</h2>
          <p className="mt-1 text-xs text-slate-500">{periodLabel}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2 tabular-nums">
              <dt className="text-slate-600 dark:text-slate-400">{t('adminAnalytics.servicesTotal')}</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-50">
                {formatLocalizedAmount(data.periodFinance.servicesRevenue, i18n.language)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 tabular-nums">
              <dt className="text-slate-600 dark:text-slate-400">{t('adminAnalytics.tipsTotal')}</dt>
              <dd className="font-medium text-slate-900 dark:text-slate-50">
                {formatLocalizedAmount(data.periodFinance.tips, i18n.language)}
              </dd>
            </div>
            <div className="mt-3 flex justify-between gap-2 border-t border-slate-200 pt-3 tabular-nums dark:border-slate-800">
              <dt className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('adminAnalytics.totalIncome')}</dt>
              <dd className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                {formatLocalizedAmount(data.periodFinance.totalIncome, i18n.language)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('adminAnalytics.expenses')}</h2>
          <p className="mt-1 text-xs text-slate-500">{periodLabel}</p>
          <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto text-sm">
            {data.periodFinance.expensesByCategory.length === 0 ? (
              <li className="text-slate-500">{t('adminAnalytics.noExpenses')}</li>
            ) : (
              data.periodFinance.expensesByCategory.map((row) => (
                <li
                  key={row.categoryId}
                  className="flex justify-between gap-2 border-b border-slate-100 pb-2 tabular-nums last:border-0 dark:border-slate-800/80"
                >
                  <span className="text-slate-600 dark:text-slate-400">{row.categoryName}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-50">{formatLocalizedAmount(row.total, i18n.language)}</span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex justify-between gap-2 border-t border-slate-200 pt-3 tabular-nums dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('adminAnalytics.totalExpenses')}</span>
            <span className="text-lg font-semibold text-rose-700 dark:text-rose-400">
              {formatLocalizedAmount(data.periodFinance.totalExpenses, i18n.language)}
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('adminAnalytics.profit')}</h2>
          <p className="mt-1 text-xs text-slate-500">{t('adminAnalytics.profitHint', { period: periodLabel })}</p>
          <p
            className={
              data.periodFinance.netProfit < 0
                ? 'mt-6 text-3xl font-semibold tabular-nums text-rose-600 dark:text-rose-400'
                : 'mt-6 text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-50'
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

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-50">
          {t('adminAnalytics.monthlyChartTitle')}{' '}
          {data.fromDate && data.toDate
            ? t('adminAnalytics.monthlyChartRange', {
                from: formatDateOnlyLocale(data.fromDate, i18n.language),
                to: formatDateOnlyLocale(data.toDate, i18n.language),
              })
            : t('adminAnalytics.monthlyChartLast12')}
        </h2>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => formatLocalizedAmount(v, i18n.language)} />
              <Tooltip formatter={(value: unknown) => [formatLocalizedAmount(Number(value ?? 0), i18n.language), '']} />
              <Legend />
              <Bar dataKey="income" name={t('adminAnalytics.revenue')} fill="#38A169" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name={t('adminAnalytics.expenses')} fill="#E53E3E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tips" name={t('adminAnalytics.tips')} fill="#D69E2E" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">{t('adminAnalytics.stylistPerformance')}</h2>
          <div className="app-table-wrap">
            <table className="app-table w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">{t('adminAnalytics.stylist')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('adminAnalytics.count')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('adminAnalytics.revenueKm')}</th>
                  <th className="py-2 text-right font-medium">{t('adminAnalytics.tipsKm')}</th>
                </tr>
              </thead>
              <tbody>
                {data.stylistPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-slate-500">
                      {t('adminAnalytics.noData')}
                    </td>
                  </tr>
                ) : (
                  data.stylistPerformance.map((s) => (
                    <tr key={s.stylistProfileId} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="py-2 pr-3">
                        <RouterLink
                          to={`/admin/stylist-analytics?stylistId=${s.stylistProfileId}`}
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

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">{t('adminAnalytics.topServices')}</h2>
          <div className="app-table-wrap">
            <table className="app-table w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="py-2 pr-3 font-medium">{t('adminAnalytics.service')}</th>
                  <th className="py-2 pr-3 text-right font-medium">{t('adminAnalytics.count')}</th>
                  <th className="py-2 text-right font-medium">{t('adminAnalytics.revenueKm')}</th>
                </tr>
              </thead>
              <tbody>
                {data.topServices.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-slate-500">
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
    </div>
  )
}
