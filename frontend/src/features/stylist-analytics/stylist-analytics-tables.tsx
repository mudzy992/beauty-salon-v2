import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui/card'
import { formatLocalizedAmount, formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { StylistAnalyticsData } from './stylist-analytics-types'

type Props = { data: StylistAnalyticsData; formatDate: (value: string | null | undefined) => string }
export function StylistAnalyticsTables({ data, formatDate }: Props) {
  const { t, i18n } = useTranslation()
  const tablesId = useId()
  const topServicesLabelId = `${tablesId}-top-services`
  const recentEntriesLabelId = `${tablesId}-recent-entries`
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="min-w-0 p-5">
        <h2 id={topServicesLabelId} className="mb-3 text-sm font-semibold text-content">{t('stylistAnalytics.topServices')}</h2>
        <div className="app-table-wrap">
          <table aria-labelledby={topServicesLabelId} className="app-table w-full border-collapse">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
                <th scope="col" className="py-2 pr-3 font-medium">{t('stylistAnalytics.service')}</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">{t('stylistAnalytics.count')}</th>
                <th scope="col" className="py-2 text-right font-medium">{t('stylistAnalytics.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {data.topServices.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-4 text-content-strong">
                    {t('common.noData')}
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

      <Card className="min-w-0 p-5">
        <h2 id={recentEntriesLabelId} className="mb-3 text-sm font-semibold text-content">{t('stylistAnalytics.recentEntries')}</h2>
        <div className="app-table-wrap">
          <table aria-labelledby={recentEntriesLabelId} className="app-table w-full border-collapse">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
                <th scope="col" className="py-2 pr-3 font-medium">{t('common.date')}</th>
                <th scope="col" className="py-2 pr-3 font-medium">{t('stylistAnalytics.service')}</th>
                <th scope="col" className="py-2 pr-3 font-medium">{t('stylistAnalytics.client')}</th>
                <th scope="col" className="py-2 text-right font-medium">{t('stylistAnalytics.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-content-strong">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                data.recentEntries.map((e) => (
                  <tr key={e.id} className="border-b border-line">
                    <td className="py-2 pr-3">{formatDate(e.date)}</td>
                    <td className="py-2 pr-3">{e.serviceName ?? '-'}</td>
                    <td className="py-2 pr-3">{e.clientName ?? '-'}</td>
                    <td className="py-2 text-right tabular-nums">{formatLocalizedAmount(Number(e.actualPrice), i18n.language)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
