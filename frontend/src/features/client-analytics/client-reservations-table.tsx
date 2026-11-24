import { useTranslation } from 'react-i18next'
import { Eye } from 'lucide-react'
import { Badge, type BadgeProps } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { AnalyticsTableRegion } from './analytics-table-region'
import type { ClientAnalyticsData } from './client-analytics-types'
import type { DateFormatter, StylistFormatter } from './presentation-types'

type Props = {
  analytics: ClientAnalyticsData
  formatDateOnly: DateFormatter
  getStylistName: StylistFormatter
  getReservationStatusLabel: (status: string) => string
  statusBadgeVariant: Record<string, NonNullable<BadgeProps['variant']>>
  openReservationDetail: (reservation: ClientAnalyticsData['reservations'][number], trigger: HTMLElement | null) => void
}
export function ClientReservationsTable({ analytics, formatDateOnly, getStylistName, getReservationStatusLabel, statusBadgeVariant, openReservationDetail }: Props) {
  const { t, i18n } = useTranslation()
  return (
    <Card className="overflow-hidden aurum-scroll-table-card">
      <AnalyticsTableRegion label={t('clientAnalyticsPage.reservationsCaption')}>
        <table className="app-table data-table w-full border-collapse">
          <caption className="sr-only">{t('clientAnalyticsPage.reservationsCaption')}</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-content-strong ">
              <th scope="col" className="py-3 pl-4 pr-3 font-medium">{t('clientAnalyticsPage.date')}</th>
              <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.time')}</th>
              <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.service')}</th>
              <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.stylist')}</th>
              <th scope="col" className="py-3 pr-3 text-right font-medium">{t('clientAnalyticsPage.price')}</th>
              <th scope="col" className="py-3 pr-3 font-medium">{t('clientAnalyticsPage.status')}</th>
              <th scope="col" className="py-3 pr-4 text-right font-medium">{t('clientAnalyticsPage.details')}</th>
            </tr>
          </thead>
          <tbody>
            {analytics.reservations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-content-strong">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              analytics.reservations.map((r, index) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-line hover:bg-surface-muted"
                  // 4.1.2: red je bio fokusabilan (tabIndex + onKeyDown) ali bez
                  // role koja kaže da je aktivabilan — AT najavi samo "red". Pristupačni
                  // put je dugme "Detalji" u zadnjoj koloni, isto kao u Reservations.tsx
                  // i Stylists.tsx, pa red ostaje klikabilan samo mišem (zgodna prečica).
                  onClick={(event) => openReservationDetail(r, event.currentTarget.querySelector('button'))}
                >
                  <td data-label={t('clientAnalyticsPage.date')} className="py-3 pl-4 pr-3">{formatDateOnly(r.reservationDate)}</td>
                  <td data-label={t('clientAnalyticsPage.time')} className="py-3 pr-3">
                    {r.startTime} - {r.endTime}
                  </td>
                  <td data-label={t('clientAnalyticsPage.service')} className="py-3 pr-3">{r.service?.name ?? '-'}</td>
                  <td data-label={t('clientAnalyticsPage.stylist')} className="py-3 pr-3">{getStylistName(r.confirmedStylist)}</td>
                  <td data-label={t('clientAnalyticsPage.price')} className="py-3 pr-3 text-right tabular-nums">{formatLocalizedNumber(Number(r.service?.price ?? 0), i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td data-label={t('clientAnalyticsPage.status')} className="py-3 pr-3">
                    <Badge variant={statusBadgeVariant[r.status] ?? 'secondary'} className="text-[10px]">
                      {getReservationStatusLabel(r.status)}
                    </Badge>
                  </td>
                  <td data-label={t('clientAnalyticsPage.details')} className="py-3 pr-4 text-right">
                    <Button type="button" size="icon" variant="ghost" aria-label={t('clientAnalyticsPage.reservationDetailsAction', {
                      service: r.service?.name ?? '-', date: formatDateOnly(r.reservationDate),
                      time: `${r.startTime} - ${r.endTime}`, number: index + 1,
                    })} onClick={(e) => {
                      e.stopPropagation()
                      openReservationDetail(r, e.currentTarget)
                    }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
