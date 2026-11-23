import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { formatLocalizedAmount } from '../../i18n/locale-utils.mjs'
import type { Dispatch, SetStateAction } from 'react'
import type { ClientDebtRow } from './client-analytics-types'
import type { DateFormatter } from './presentation-types'

type Props = {
  clientDebts: ClientDebtRow[]
  debtsLoading: boolean
  debtsError: boolean
  formatDateOnly: DateFormatter
  formatInstantDate: DateFormatter
  setRetryVersion: Dispatch<SetStateAction<number>>
}
export function ClientDebts({ clientDebts, debtsLoading, debtsError, formatDateOnly, formatInstantDate, setRetryVersion }: Props) {
  const { t, i18n } = useTranslation()
  return (
    <Card className="p-4">
      {debtsLoading ? (
        <p className="text-sm text-content-strong">{t('clientAnalyticsPage.loading')}</p>
      ) : debtsError ? (
        <div role="alert" className="space-y-3">
          <p>{t('clientAnalyticsPage.debtsLoadError')}</p>
          <Button type="button" variant="outline" onClick={() => setRetryVersion(value => value + 1)}>{t('common.retry')}</Button>
        </div>
      ) : clientDebts.length === 0 ? (
        <p className="text-sm text-content-strong">{t('common.noData')}</p>
      ) : (
        <div className="grid gap-2">
          {clientDebts.map((d) => {
            const stylistName = d.stylistProfile?.user
              ? `${d.stylistProfile.user.firstName ?? ''} ${d.stylistProfile.user.lastName ?? ''}`.trim() || d.stylistProfile.user.username
              : '—'
            const ref =
              d.reservation?.publicReferenceCode
                ? t('clientAnalyticsPage.reservationReference', { code: d.reservation.publicReferenceCode })
                : d.dailyLogEntry?.id
                  ? `${t('clientAnalyticsPage.dailyLog')}: ${formatDateOnly(d.dailyLogEntry.date)}`
                  : d.manualEntry?.id
                    ? `${t('clientAnalyticsPage.manualEntry')}: ${formatDateOnly(d.manualEntry.date)}`
                    : '—'
            return (
              <div
                key={d.id}
                className="rounded-md border border-line  p-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-content">
                    {d.service?.name ?? t('clientAnalyticsPage.debt')} · {formatLocalizedAmount(d.amount, i18n.language)}
                  </p>
                  <p className="text-xs text-content-strong ">
                    <span className="font-semibold">{t('clientAnalyticsPage.stylist')}:</span> {stylistName} · {ref}
                  </p>
                  <p className="text-xs text-content-strong mt-0.5">{formatInstantDate(d.createdAt)}</p>
                </div>
                <Badge variant={d.status === 'OPEN' ? 'warning' : 'success'} className="text-[10px]">
                  {d.status === 'OPEN' ? t('clientAnalyticsPage.open') : t('clientAnalyticsPage.closed')}
                </Badge>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
