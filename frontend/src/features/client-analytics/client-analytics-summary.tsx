import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'
import { cn } from '../../lib/cn'
import { formatLocalizedAmount, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { ClientAnalyticsData } from './client-analytics-types'
import { AnalyticsTableRegion } from './analytics-table-region'

const SmallStatCard = ({
  title,
  value,
  hint,
  className,
}: {
  title: string
  value: string
  hint?: string
  className?: string
}) => (
  <Card className={cn('p-4', className)}>
    <p className="text-xs text-content-strong">{title}</p>
    <p className="mt-1 text-2xl font-semibold text-content [overflow-wrap:anywhere]">{value}</p>
    {hint ? <p className="mt-1 text-xs text-content-strong">{hint}</p> : null}
  </Card>
)

type Props = {
  analytics: ClientAnalyticsData
  getUserName: (user: ClientAnalyticsData['user']) => string
  formatInstantDate: (value: string | null | undefined) => string
}
export function ClientAnalyticsSummary({ analytics, getUserName, formatInstantDate }: Props) {
  const { t, i18n } = useTranslation()
  return (
    <>
      <p className="text-sm text-content">{t('clientAnalyticsPage.sourceNote')}</p>
      <Card className="p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-content">{getUserName(analytics.user)}</h2>
            <p className="text-sm text-content-strong">{analytics.user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-sm text-content-strong">{t('clientAnalyticsPage.phone')}: {analytics.user.phone ?? '-'}</p>
              <Badge variant={analytics.user.isActive ? 'success' : 'danger'} className="text-[10px]">
                {analytics.user.isActive ? t('clientAnalyticsPage.active') : t('clientAnalyticsPage.inactive')}
              </Badge>
              {analytics.user.userRoles?.map((r) => (
                <Badge key={r.role.name} variant="secondary" className="text-[10px]">
                  {r.role.name}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-content-strong">{t('clientAnalyticsPage.registered')}: {formatInstantDate(analytics.user.createdAt)}</p>
          </div>

          {analytics.penalty.isPenalized ? (
            <Card className="border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-950/30">
              <div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-200">
                <TriangleAlert className="h-4 w-4" aria-hidden="true" />
                {t('clientAnalyticsPage.penalized').toLocaleUpperCase(i18n.language)}
              </div>
              <p className="mt-1 text-sm text-rose-600 dark:text-rose-200">
                {t('clientAnalyticsPage.until')}: {formatInstantDate(analytics.penalty.penaltyUntil)}
              </p>
            </Card>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.reservations')}
          value={String(analytics.stats.totalReservations)}
          hint={t('clientAnalyticsPage.stats.completed', { count: analytics.stats.completedReservations })}
        />
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.cancelledNoShow')}
          value={`${analytics.stats.cancelledReservations} / ${analytics.stats.noShowCount}`}
          className="border-rose-100 dark:border-rose-900/30"
        />
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.manualEntries')}
          value={String(analytics.stats.manualEntryCount)}
          hint={formatLocalizedAmount(analytics.stats.manualSpent, i18n.language)}
        />
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.totalSpent')}
          value={formatLocalizedAmount(analytics.stats.totalSpent, i18n.language)}
          hint={t('clientAnalyticsPage.stats.reservationsPlusManual')}
        />
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.penalties')}
          value={t('clientAnalyticsPage.stats.cancellations', { count: analytics.penalty.cancellationCount })}
          hint={analytics.penalty.isPenalized ? t('clientAnalyticsPage.penalized') : t('clientAnalyticsPage.stats.ok')}
          className={analytics.penalty.isPenalized ? 'border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20' : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.averageRating')}
          value={analytics.stats.avgServiceRating != null
            ? formatLocalizedNumber(analytics.stats.avgServiceRating, i18n.language, { maximumFractionDigits: 2 })
            : '-'}
          hint={t('clientAnalyticsPage.stats.reviewCount', { count: analytics.stats.reviewCount })}
        />
        {analytics.stats.totalReservations > 0 ? (
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-content">{t('clientAnalyticsPage.stats.completionRate')}</p>
              <p className="text-sm font-semibold text-content">
                {Math.round((analytics.stats.completedReservations / analytics.stats.totalReservations) * 100)}%
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-md bg-surface-muted">
              <div
                className="h-full rounded-md bg-ok-foreground"
                style={{ width: `${(analytics.stats.completedReservations / analytics.stats.totalReservations) * 100}%` }}
              />
            </div>
          </Card>
        ) : null}
      </div>

      {analytics.topServices.length > 0 ? (
        <Card className="p-5 aurum-scroll-table-card">
          <p className="mb-3 font-semibold text-content">{t('clientAnalyticsPage.topServices')}</p>
          <AnalyticsTableRegion label={t('clientAnalyticsPage.servicesCaption')}>
            <table className="app-table data-table w-full border-collapse">
              <caption className="sr-only">{t('clientAnalyticsPage.servicesCaption')}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
                  <th scope="col" className="py-2 pr-3 font-medium">{t('clientAnalyticsPage.service')}</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">{t('clientAnalyticsPage.visitCount')}</th>
                  <th scope="col" className="py-2 text-right font-medium">{t('clientAnalyticsPage.total')} (KM)</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topServices.map((s, i) => (
                  <tr key={`${s.name}-${i}`} className="border-b border-line">
                    <td data-label={t('clientAnalyticsPage.service')} className="py-2 pr-3 font-medium">{s.name}</td>
                    <td data-label={t('clientAnalyticsPage.visitCount')} className="py-2 pr-3 text-right tabular-nums">{s.count}</td>
                    <td data-label={t('clientAnalyticsPage.total')} className="py-2 text-right tabular-nums">{formatLocalizedNumber(s.totalSpent, i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AnalyticsTableRegion>
        </Card>
      ) : null}
    </>
  )
}
