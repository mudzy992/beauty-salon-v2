import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/card'
import { cn } from '../../lib/cn'
import { formatLocalizedAmount, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { ClientAnalyticsData } from './client-analytics-types'

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
    <p className="text-xs font-medium text-content-strong">{title}</p>
    <p className="mt-1 text-2xl font-semibold text-content [overflow-wrap:anywhere]">{value}</p>
    {hint ? <p className="mt-1 text-xs text-content-strong">{hint}</p> : null}
  </Card>
)

type Props = {
  stats: ClientAnalyticsData['stats']
  penalty: ClientAnalyticsData['penalty']
  language: string
}

/**
 * Brojčani pokazatelji klijenta: posjete, potrošnja, penali i prosječna ocjena.
 *
 * Traka napretka koristi `bg-ok-foreground` (6.51:1), a ne zelenu `emerald`
 * varijantu (2.32:1) — WCAG 1.4.11.
 */
export function ClientAnalyticsStatCards({ stats, penalty, language }: Props) {
  const { t } = useTranslation()

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.reservations')}
          value={String(stats.totalReservations)}
          hint={t('clientAnalyticsPage.stats.completed', { count: stats.completedReservations })}
        />
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.cancelledNoShow')}
          value={`${stats.cancelledReservations} / ${stats.noShowCount}`}
          className="border-rose-100 dark:border-rose-900/30"
        />
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.manualEntries')}
          value={String(stats.manualEntryCount)}
          hint={formatLocalizedAmount(stats.manualSpent, language)}
        />
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.totalSpent')}
          value={formatLocalizedAmount(stats.totalSpent, language)}
          hint={t('clientAnalyticsPage.stats.reservationsPlusManual')}
        />
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.penalties')}
          value={t('clientAnalyticsPage.stats.cancellations', { count: penalty.cancellationCount })}
          hint={penalty.isPenalized ? t('clientAnalyticsPage.penalized') : t('clientAnalyticsPage.stats.ok')}
          className="border-rose-200 dark:border-rose-900/40"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SmallStatCard
          title={t('clientAnalyticsPage.stats.averageRating')}
          value={stats.avgServiceRating != null
            ? formatLocalizedNumber(stats.avgServiceRating, language, { maximumFractionDigits: 2 })
            : '-'}
          hint={t('clientAnalyticsPage.stats.reviewCount', { count: stats.reviewCount })}
        />
        {stats.totalReservations > 0 ? (
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-content">{t('clientAnalyticsPage.stats.completionRate')}</p>
              <p className="text-sm font-semibold text-content">
                {Math.round((stats.completedReservations / stats.totalReservations) * 100)}%
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-md bg-surface-muted">
              <div
                className="h-full rounded-md bg-ok-foreground"
                style={{ width: `${(stats.completedReservations / stats.totalReservations) * 100}%` }}
              />
            </div>
          </Card>
        ) : null}
      </div>
    </>
  )
}
