import { Bar, CartesianGrid, ComposedChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useTranslation } from 'react-i18next'
import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'
import { formatLocalizedAmount } from '../../i18n/locale-utils.mjs'
import { Card } from '../../components/ui/card'
import type { AnalyticsDashboard } from './analytics-dashboard-types'

type ChartRow = AnalyticsDashboard['monthlyFinance'][number] & { net: number }
type ChartSummary = { months: number; revenue: string; expenses: string; tips: string }

export function AnalyticsFinanceChart({ data, chartData, chartSummary }: { data: AnalyticsDashboard; chartData: ChartRow[]; chartSummary: ChartSummary }) {
  const { t, i18n } = useTranslation()
  return (
      <Card className="min-w-0 p-5">
        <h2 className="mb-4 text-sm font-semibold text-content">
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

  )
}
