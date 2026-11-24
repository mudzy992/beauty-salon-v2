import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/card'
import { formatLocalizedAmount, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { AnalyticsDashboard } from './analytics-dashboard-types'

export function AnalyticsPerformanceTables({ data }: { data: AnalyticsDashboard }) {
  const { t, i18n } = useTranslation()
  return (
    <>
      <p className="text-sm text-content">{t('adminAnalytics.sourceNote')}</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="min-w-0 p-5">
          <h2 id="analytics-stylist-performance" className="mb-3 text-sm font-semibold text-content">{t('adminAnalytics.stylistPerformance')}</h2>
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
                    <tr key={s.stylistProfileId} className="border-b border-line">
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
          <h2 id="analytics-top-services" className="mb-3 text-sm font-semibold text-content">{t('adminAnalytics.topServices')}</h2>
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
                    <tr key={s.serviceId} className="border-b border-line">
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
    </>
  )
}
