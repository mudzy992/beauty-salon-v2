import { useTranslation } from 'react-i18next'

import { Badge } from '../../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Drawer, DrawerContent } from '../../components/ui/drawer'
import { useIsMobile } from '../../hooks/use-is-mobile'
import {
  getServiceAmount,
  getSettledDebtsSum,
  getTipAmount,
  getTotalAmount,
} from './amounts'
import {
  clientLabel,
  formatDetailKm,
  getDailyLogDetailStatusKey,
  serviceRows,
} from './entry-detail-helpers'
import { formatDailyLogDate, LoyaltyDiscountLine } from './entry-table-helpers'
import { getDailyLogStatusVariant } from './entry-status-label'
import type { DailyLogEntry } from './types'
import { getStylistName } from './types'

type Props = {
  entry: DailyLogEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DailyLogEntryDetailDialog = ({
  entry,
  open,
  onOpenChange,
}: Props) => {
  const isMobile = useIsMobile()
  const { t, i18n } = useTranslation()
  if (!entry) return null

  const title =
    entry.publicReferenceCode ??
    (entry.date
      ? formatDailyLogDate(entry.date, i18n.language)
      : t('dailyLog.detail.title'))
  const services = serviceRows(entry, t('dailyLog.detail.serviceFallback'))
  const debts = entry.debtPaymentEntries ?? []
  const tip = getTipAmount(entry)
  const serviceAmt = getServiceAmount(entry)
  const debtsSum = getSettledDebtsSum(entry)
  const total = getTotalAmount(entry)

  const body = (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={getDailyLogStatusVariant(entry)}
          className="text-[10px]"
        >
          {t(getDailyLogDetailStatusKey(entry))}
        </Badge>
        <Badge
          variant={entry.isManual ? 'warning' : 'secondary'}
          className="text-[10px]"
        >
          {t(
            entry.isManual
              ? 'dailyLog.table.sources.manual'
              : 'dailyLog.table.sources.reservation',
          )}
        </Badge>
      </div>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-slate-500">{t('common.date')}</dt>
          <dd className="font-medium text-slate-900 dark:text-slate-50">
            {formatDailyLogDate(entry.date, i18n.language)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">
            {t('dailyLog.table.columns.stylist')}
          </dt>
          <dd className="font-medium text-slate-900 dark:text-slate-50">
            {getStylistName(entry.stylistProfile)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">
            {t('dailyLog.table.columns.client')}
          </dt>
          <dd className="font-medium text-slate-900 dark:text-slate-50">
            {clientLabel(entry)}
          </dd>
        </div>
        {entry.publicReferenceCode ? (
          <div>
            <dt className="text-xs text-slate-500">
              {t('dailyLog.table.columns.reference')}
            </dt>
            <dd className="font-mono text-xs font-medium text-slate-900 dark:text-slate-50">
              {entry.publicReferenceCode}
            </dd>
          </div>
        ) : null}
      </dl>
      <div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
          {t('dailyLog.table.columns.services')}
        </p>
        {services.length === 0 ? (
          <p className="mt-1 text-slate-500">—</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {services.map((row) => (
              <li
                key={row.key}
                className="flex justify-between gap-3 text-slate-700 dark:text-slate-200"
              >
                <span>{row.name}</span>
                <span className="tabular-nums shrink-0">
                  {formatDetailKm(row.price, i18n.language)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <LoyaltyDiscountLine entry={entry} />
      </div>
      {debts.length > 0 ? (
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {t('dailyLog.detail.debtCollection')}
          </p>
          <ul className="mt-1 space-y-1">
            {debts.map((payment) => (
              <li
                key={payment.id}
                className="flex justify-between gap-3 text-slate-700 dark:text-slate-200"
              >
                <span>
                  {payment.debt?.service?.name ??
                    payment.service?.name ??
                    t('dailyLog.detail.debtFallback')}
                  {payment.debt?.createdAt
                    ? ` · ${formatDailyLogDate(String(payment.debt.createdAt), i18n.language)}`
                    : ''}
                </span>
                <span className="tabular-nums shrink-0">
                  {formatDetailKm(
                    Number(payment.actualPrice ?? 0),
                    i18n.language,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
        <div className="flex justify-between tabular-nums">
          <span className="text-slate-600 dark:text-slate-300">
            {t('dailyLog.table.columns.serviceRevenue')}
          </span>
          <span>{formatDetailKm(serviceAmt, i18n.language)}</span>
        </div>
        {debtsSum > 0 ? (
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="text-slate-600 dark:text-slate-300">
              {t('dailyLog.table.columns.debts')}
            </span>
            <span>{formatDetailKm(debtsSum, i18n.language)}</span>
          </div>
        ) : null}
        {tip > 0 ? (
          <div className="mt-1 flex justify-between tabular-nums">
            <span className="text-slate-600 dark:text-slate-300">
              {t('dailyLog.table.columns.tip')}
            </span>
            <span>{formatDetailKm(tip, i18n.language)}</span>
          </div>
        ) : null}
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold tabular-nums dark:border-slate-800">
          <span>{t('common.total')}</span>
          <span>{formatDetailKm(total, i18n.language)}</span>
        </div>
      </div>
      {entry.notes ? (
        <div>
          <p className="text-xs text-slate-500">{t('dailyLog.detail.notes')}</p>
          <p className="mt-0.5 text-slate-900 dark:text-slate-50">
            {entry.notes}
          </p>
        </div>
      ) : null}
      {entry.deletedAt && entry.deleteReason ? (
        <p className="text-xs text-rose-600">
          {t('dailyLog.detail.deleteReason')}: {entry.deleteReason}
        </p>
      ) : null}
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent side="right" className="max-w-lg overflow-y-auto p-4">
          <h2 className="mb-4 text-lg font-semibold">{title}</h2>
          {body}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
