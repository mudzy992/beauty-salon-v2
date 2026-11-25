import { useTranslation } from 'react-i18next'
import { TriangleAlert } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { ClientAnalyticsData } from './client-analytics-types'
import { AnalyticsTableRegion } from './analytics-table-region'
import { ClientAnalyticsStatCards } from './client-analytics-stat-cards'

type Props = {
  analytics: ClientAnalyticsData
  getUserName: (user: ClientAnalyticsData['user']) => string
  formatInstantDate: (value: string | null | undefined) => string
}

/**
 * Sažetak analitike klijenta: identitet, pokazatelji i najčešće usluge.
 */
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
              <p className="mt-1 text-sm text-rose-600 dark:text-rose-300">
                {t('clientAnalyticsPage.until')}: {formatInstantDate(analytics.penalty.penaltyUntil)}
              </p>
            </Card>
          ) : null}
        </div>
      </Card>

      <ClientAnalyticsStatCards
        stats={analytics.stats}
        penalty={analytics.penalty}
        language={i18n.language}
      />

      {analytics.topServices.length > 0 ? (
        <Card className="p-5 aurum-scroll-table-card">
          <p className="mb-3 font-semibold text-content">{t('clientAnalyticsPage.topServices')}</p>
          <AnalyticsTableRegion label={t('clientAnalyticsPage.servicesCaption')}>
            <table className="app-table data-table w-full border-collapse">
              <caption className="sr-only">{t('clientAnalyticsPage.servicesCaption')}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-content-strong">
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
