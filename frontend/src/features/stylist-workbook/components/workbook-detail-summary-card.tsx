import { useTranslation } from 'react-i18next'

import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card } from '../../../components/ui/card'
import { Loader2 } from 'lucide-react'
import { formatDateOnlyLocale } from '../../../../../shared/business-date.mjs'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'
import { getCollectedTotal, getSettledDebtsSum } from '../workbook-display'
import type { DailyLogEntry } from '../types'

/**
 * Zbirni prikaz unosa (S10).
 *
 * Izdvojeno iz `pages/workbook-detail-page.tsx` **bez promjene**: ista usluge,
 * ista otplate duga, isti klijent, isti ukupno naplaćeno, iste bilješke i isti
 * statusni žeton.
 */

/**
 * Formatter iznosa. Ostaje **identičan** ranijem lokalnom helperu stranice
 * (`formatLocalizedAmount(Number(v || 0), language)`) — razlika u odnosu na
 * `workbook-amount.ts` je u tome što nevažeći unos daje `—` bez sufiksa ` KM`.
 */
const formatKm = (v: number, language: string) => formatLocalizedAmount(Number(v || 0), language)

export const WorkbookDetailSummaryCard = ({
  entry,
  language,
  locale,
  canComplete,
  acting,
  onRequestComplete,
}: {
  entry: DailyLogEntry
  language: string
  locale: string
  canComplete: boolean
  acting: boolean
  onRequestComplete: () => void
}) => {
  const { t } = useTranslation()

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3 w-full">
          <div>
            <p className="text-sm font-semibold text-content">
              {t('stylistWorkbook.detail.services')}
            </p>
            <ul className="mt-1 space-y-1">
              {(entry.items && entry.items.length > 0
                ? entry.items
                : entry.service
                  ? [{ serviceId: entry.serviceId, service: entry.service, unitPrice: entry.actualPrice }]
                  : []
              ).map((it) => (
                <li
                  key={it.serviceId}
                  className="flex justify-between text-sm text-content-strong"
                >
                  <span>{it.service?.name ?? t('stylistWorkbook.serviceFallback')}</span>
                  <span>{formatKm(Number(it.unitPrice ?? 0), language)}</span>
                </li>
              ))}
            </ul>
          </div>
          {(entry.debtPaymentEntries?.length ?? 0) > 0 ? (
            <div>
              <p className="text-sm font-semibold text-content">
                {t('stylistWorkbook.detail.debtPayments')}
              </p>
              <ul className="mt-1 space-y-1">
                {entry.debtPaymentEntries!.map((dp) => (
                  <li
                    key={dp.id}
                    className="flex justify-between text-sm text-content-strong"
                  >
                    <span>
                      {dp.debt?.service?.name ??
                        dp.service?.name ??
                        t('stylistWorkbook.detail.debtFallback')}
                      {dp.debt?.createdAt
                        ? ` · ${formatDateOnlyLocale(String(dp.debt.createdAt).slice(0, 10), locale)}`
                        : ''}
                    </span>
                    <span>{formatKm(Number(dp.actualPrice), language)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="text-sm text-content-strong">
            {t('stylistWorkbook.detail.client')}
            <span className="font-medium text-content">
              {entry.client
                ? [entry.client.firstName, entry.client.lastName].filter(Boolean).join(' ') ||
                  entry.client.user?.username ||
                  '—'
                : '—'}
            </span>
          </div>
          <div className="text-sm text-content-strong">
            {t('stylistWorkbook.detail.totalCollected')}
            <span className="font-semibold text-content">
              {formatKm(getCollectedTotal(entry), language)}
            </span>
            <span className="block text-xs mt-1">
              {t('stylistWorkbook.detail.servicesAmount', {
                amount: formatKm(Number(entry.actualPrice), language),
              })}
              {getSettledDebtsSum(entry) > 0
                ? ` · ${t('stylistWorkbook.detail.debtsAmount', {
                    amount: formatKm(getSettledDebtsSum(entry), language),
                  })}`
                : ''}
              {Number(entry.tipAmount) > 0
                ? ` · ${t('stylistWorkbook.detail.tipAmount', {
                    amount: formatKm(Number(entry.tipAmount), language),
                  })}`
                : ''}
            </span>
          </div>
          {entry.notes ? (
            <div className="text-sm text-content-strong">
              {t('stylistWorkbook.detail.notes')}:{' '}
              <span className="text-content">{entry.notes}</span>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={entry.status === 'COMPLETED' ? 'success' : 'warning'}>
            {entry.status === 'COMPLETED'
              ? t('stylistWorkbook.completed')
              : t('stylistWorkbook.pending')}
          </Badge>
          {canComplete ? (
            <Button
              type="button"
              onClick={onRequestComplete}
              disabled={acting}
              className="whitespace-nowrap"
            >
              {acting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  {t('stylistWorkbook.detail.finishing')}
                </>
              ) : entry.reservationId ? (
                t('stylistWorkbook.detail.finishWithReservation')
              ) : (
                t('stylistWorkbook.detail.finishEntry')
              )}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}
