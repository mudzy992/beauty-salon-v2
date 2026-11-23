import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { AnalyticsTableRegion } from './analytics-table-region'
import type { ClientAnalyticsData } from './client-analytics-types'
import type { DateFormatter, StylistFormatter } from './presentation-types'

type Props = {
  analytics: ClientAnalyticsData
  formatDateOnly: DateFormatter
  getStylistName: StylistFormatter
}
export function ClientManualEntriesTable({ analytics, formatDateOnly, getStylistName }: Props) {
  const { t, i18n } = useTranslation()
  return (
    <Card className="overflow-hidden aurum-scroll-table-card">
      <AnalyticsTableRegion label={t('clientAnalyticsPage.manualEntriesCaption')}>
        <table className="app-table data-table w-full border-collapse">
          <caption className="sr-only">{t('clientAnalyticsPage.manualEntriesCaption')}</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
              <th scope="col" className="py-3 pl-4 pr-3 font-medium">{t('clientAnalyticsPage.date')}</th>
              <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.service')}</th>
              <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.stylist')}</th>
              <th scope="col" className="py-3 pr-3 text-right font-medium">{t('clientAnalyticsPage.price')} (KM)</th>
              <th scope="col" className="py-3 pr-3 text-right font-medium">{t('clientAnalyticsPage.tip')} (KM)</th>
              <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.source')}</th>
              <th scope="col" className="py-3 pr-4 font-medium">{t('clientAnalyticsPage.note')}</th>
            </tr>
          </thead>
          <tbody>
            {analytics.manualEntries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-content-strong">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              analytics.manualEntries.map((e) => (
                <tr key={e.id} className="border-b border-line">
                  <td data-label={t('clientAnalyticsPage.date')} className="py-3 pl-4 pr-3">{formatDateOnly(e.date)}</td>
                  <td data-label={t('clientAnalyticsPage.service')} className="py-3 pr-3">{e.service?.name ?? '-'}</td>
                  <td data-label={t('clientAnalyticsPage.stylist')} className="py-3 pr-3">{getStylistName(e.stylistProfile)}</td>
                  <td data-label={t('clientAnalyticsPage.price')} className="py-3 pr-3 text-right font-medium tabular-nums">{formatLocalizedNumber(Number(e.actualPrice), i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td data-label={t('clientAnalyticsPage.tip')} className="py-3 pr-3 text-right tabular-nums">{formatLocalizedNumber(Number(e.tipAmount), i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td data-label={t('clientAnalyticsPage.source')} className="py-3 pr-3">
                    <Badge variant={e.isManual ? 'brand' : 'secondary'} className="text-[10px]">
                      {e.isManual ? t('clientAnalyticsPage.manual') : t('clientAnalyticsPage.reservation')}
                    </Badge>
                  </td>
                  <td data-label={t('clientAnalyticsPage.note')} className="max-w-xs py-3 pr-4">
                    <p data-analytics-manual-note className="truncate text-xs text-content-strong ">{e.notes ?? '-'}</p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AnalyticsTableRegion>
    </Card>
  )
}
