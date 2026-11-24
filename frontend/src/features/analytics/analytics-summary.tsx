import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/card'
import { formatLocalizedAmount, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { AnalyticsDashboard } from './analytics-dashboard-types'

const StatCard = ({ title, value, hint }: { title: string; value: string; hint?: string }) => (
  <Card className="min-w-0 p-5">
    <p className="text-xs font-medium uppercase tracking-wide text-content-strong">{title}</p>
    <p className="mt-2 text-3xl font-semibold text-content">{value}</p>
    {hint ? <p className="mt-2 text-sm text-content-strong">{hint}</p> : null}
  </Card>
)

export function AnalyticsSummary({ data, periodLabel }: { data: AnalyticsDashboard; periodLabel: string }) {
  const { t, i18n } = useTranslation()
  return (
    <>
      <p className="text-sm text-content">{t('adminAnalytics.financePeriodNote')}</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 p-5">
          <h2 className="text-sm font-semibold text-content">{t('adminAnalytics.revenue')}</h2>
          <p className="mt-1 text-xs text-content-strong">{periodLabel}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2 tabular-nums">
              <dt className="text-content-strong">{t('adminAnalytics.servicesTotal')}</dt>
              <dd className="font-medium text-content">
                {formatLocalizedAmount(data.periodFinance.servicesRevenue, i18n.language)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 tabular-nums">
              <dt className="text-content-strong">{t('adminAnalytics.tipsTotal')}</dt>
              <dd className="font-medium text-content">
                {formatLocalizedAmount(data.periodFinance.tips, i18n.language)}
              </dd>
            </div>
            <div className="mt-3 flex justify-between gap-2 border-t border-line pt-3 tabular-nums ">
              <dt className="text-sm font-semibold text-content">{t('adminAnalytics.totalIncome')}</dt>
              <dd className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                {formatLocalizedAmount(data.periodFinance.totalIncome, i18n.language)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="min-w-0 p-5">
          <h2 className="text-sm font-semibold text-content">{t('adminAnalytics.expenses')}</h2>
          <p className="mt-1 text-xs text-content-strong">{periodLabel}</p>
          <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto text-sm">
            {data.periodFinance.expensesByCategory.length === 0 ? (
              <li className="text-content-strong">{t('adminAnalytics.noExpenses')}</li>
            ) : (
              data.periodFinance.expensesByCategory.map((row) => (
                <li
                  key={row.categoryId}
                  className="flex justify-between gap-2 border-b border-line pb-2 tabular-nums last:border-0"
                >
                  <span className="text-content-strong">{row.categoryName}</span>
                  <span className="font-medium text-content">{formatLocalizedAmount(row.total, i18n.language)}</span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex justify-between gap-2 border-t border-line pt-3 tabular-nums ">
            <span className="text-sm font-semibold text-content">{t('adminAnalytics.totalExpenses')}</span>
            <span className="text-lg font-semibold text-rose-700 dark:text-rose-400">
              {formatLocalizedAmount(data.periodFinance.totalExpenses, i18n.language)}
            </span>
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <h2 className="text-sm font-semibold text-content">{t('adminAnalytics.profit')}</h2>
          <p className="mt-1 text-xs text-content-strong">{t('adminAnalytics.profitHint', { period: periodLabel })}</p>
          <p
            className={
              data.periodFinance.netProfit < 0
                ? 'mt-6 text-3xl font-semibold tabular-nums text-rose-600 dark:text-rose-400'
                : 'mt-6 text-3xl font-semibold tabular-nums text-content'
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

    </>
  )
}
