import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import { Badge } from '../../components/ui/badge'
import { Card } from '../../components/ui/card'
import type { DailyLogEntry } from './types'
import { getStylistName } from './types'
import {
  getServiceAmount,
  getSettledDebtsSum,
  getServicesLabel,
  getTipAmount,
  getTotalAmount,
} from './amounts'
import {
  formatLocalizedAmount,
  formatLocalizedNumber,
} from '../../i18n/locale-utils.mjs'
import { DailyLogEntryActions } from './entry-table-actions'
import {
  formatDailyLogDate,
  formatMobileAmount,
  LoyaltyDiscountLine,
} from './entry-table-helpers'
import {
  getDailyLogStatusKey,
  getDailyLogStatusVariant,
} from './entry-status-label'

type Props = {
  entries: DailyLogEntry[]
  loading: boolean
  noDataLabel: string
  onView: (entry: DailyLogEntry) => void
  onEdit: (entry: DailyLogEntry) => void
  onComplete: (id: string) => void
  onDelete: (entry: DailyLogEntry) => void
  onRestore: (entry: DailyLogEntry) => void
}

export const DailyLogEntryTable = ({
  entries,
  loading,
  noDataLabel,
  onView,
  onEdit,
  onComplete,
  onDelete,
  onRestore,
}: Props) => {
  const { t, i18n } = useTranslation()
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <div className="flex justify-center p-10">
          <Loader2
            className="h-8 w-8 animate-spin text-slate-500"
            aria-hidden="true"
          />
        </div>
      </Card>
    )
  }
  const actions = { onView, onEdit, onComplete, onDelete, onRestore }
  const formatAmount = (amount: number) =>
    formatLocalizedNumber(amount, i18n.language, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  return (
    <Card className="overflow-hidden">
      <div className="space-y-3 p-3 lg:hidden">
        {entries.length === 0 ? (
          <p className="text-slate-500">{noDataLabel}</p>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className={`rounded-md border border-slate-200 p-3 dark:border-slate-800 ${
                e.deletedAt ? 'opacity-60 line-through' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900 dark:text-slate-50">
                  {e.publicReferenceCode ??
                    formatDailyLogDate(e.date, i18n.language)}
                </p>
                <Badge
                  variant={getDailyLogStatusVariant(e)}
                  className="text-[10px]"
                >
                  {t(getDailyLogStatusKey(e))}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">
                {formatDailyLogDate(e.date, i18n.language)}
              </p>
              <p className="text-sm">{getServicesLabel(e)}</p>
              {getSettledDebtsSum(e) > 0 ? (
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {t('dailyLog.table.mobile.debtCollection', {
                    amount: formatLocalizedAmount(
                      getSettledDebtsSum(e),
                      i18n.language,
                    ),
                  })}
                </p>
              ) : null}
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {getStylistName(e.stylistProfile)}
              </p>
              {e.deletedAt && e.deleteReason ? (
                <p className="mt-1 text-xs text-rose-600">
                  {t('dailyLog.table.mobile.reason')}: {e.deleteReason}
                </p>
              ) : null}
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-medium">
                  {formatMobileAmount(
                    e,
                    {
                      services: t('dailyLog.table.mobile.services'),
                      tip: t('dailyLog.table.mobile.tip'),
                      debts: t('dailyLog.table.mobile.debts'),
                    },
                    i18n.language,
                  )}
                </p>
                <DailyLogEntryActions entry={e} {...actions} />
              </div>
            </div>
          ))
        )}
      </div>
      <div className="hidden app-table-wrap lg:block">
        <table className="app-table w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left dark:border-slate-800">
              <th className="p-3 font-medium">{t('common.date')}</th>
              <th className="p-3 font-medium">
                {t('dailyLog.table.columns.reference')}
              </th>
              <th className="p-3 font-medium">
                {t('dailyLog.table.columns.stylist')}
              </th>
              <th className="p-3 font-medium">
                {t('dailyLog.table.columns.services')}
              </th>
              <th className="p-3 font-medium">
                {t('dailyLog.table.columns.client')}
              </th>
              <th className="p-3 text-right font-medium">
                {t('dailyLog.table.columns.serviceRevenue')}
              </th>
              <th className="p-3 text-right font-medium">
                {t('dailyLog.table.columns.debts')}
              </th>
              <th className="p-3 text-right font-medium">
                {t('dailyLog.table.columns.tip')}
              </th>
              <th className="p-3 text-right font-medium">
                {t('common.total')}
              </th>
              <th className="p-3 font-medium">
                {t('dailyLog.table.columns.source')}
              </th>
              <th className="p-3 font-medium">{t('common.status')}</th>
              <th className="p-3 text-right font-medium">
                {t('common.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-6 text-slate-500">
                  {noDataLabel}
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr
                  key={e.id}
                  className={`border-b border-slate-100 dark:border-slate-800/80 ${
                    e.deletedAt
                      ? 'bg-slate-50 opacity-70 dark:bg-slate-900/40'
                      : ''
                  }`}
                  title={e.deleteReason ?? undefined}
                >
                  <td className={`p-3 ${e.deletedAt ? 'line-through' : ''}`}>
                    {formatDailyLogDate(e.date, i18n.language)}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {e.publicReferenceCode ?? '—'}
                  </td>
                  <td className="p-3">
                    {e.stylistProfile?.id ? (
                      <RouterLink
                        to={`/admin/stylist-analytics?stylistId=${e.stylistProfile.id}`}
                        className="font-medium text-brand-gold-text hover:underline"
                      >
                        {getStylistName(e.stylistProfile)}
                      </RouterLink>
                    ) : (
                      getStylistName(e.stylistProfile)
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-col gap-0">
                      <span
                        title={e.items
                          ?.map((i) => i.service?.name)
                          .filter(Boolean)
                          .join(', ')}
                      >
                        {getServicesLabel(e)}
                      </span>
                      {getSettledDebtsSum(e) > 0 ? (
                        <span className="text-xs text-slate-500">
                          {t('dailyLog.table.mobile.debtCount', {
                            count: e.debtPaymentEntries?.length ?? 0,
                          })}
                        </span>
                      ) : null}
                      <LoyaltyDiscountLine entry={e} />
                      {e.deletedAt && e.deleteReason ? (
                        <span className="text-xs text-rose-600">
                          {t('dailyLog.table.mobile.reason')}: {e.deleteReason}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="p-3">
                    {e.client ? (
                      <RouterLink
                        to={`/admin/client-analytics?userId=${e.client.id}`}
                        className="text-brand-gold-text hover:underline"
                      >
                        {[e.client.firstName, e.client.lastName]
                          .filter(Boolean)
                          .join(' ') ||
                          e.client.user?.username ||
                          '-'}
                      </RouterLink>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums">
                    {formatAmount(getServiceAmount(e))}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {formatAmount(getSettledDebtsSum(e))}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {formatAmount(getTipAmount(e))}
                  </td>
                  <td className="p-3 text-right font-semibold tabular-nums">
                    {formatAmount(getTotalAmount(e))}
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={e.isManual ? 'warning' : 'secondary'}
                      className="text-[10px]"
                    >
                      {t(
                        e.isManual
                          ? 'dailyLog.table.sources.manual'
                          : 'dailyLog.table.sources.reservation',
                      )}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={getDailyLogStatusVariant(e)}
                      className="text-[10px]"
                    >
                      {t(getDailyLogStatusKey(e))}
                    </Badge>
                  </td>
                  <td className="p-3 text-right">
                    <DailyLogEntryActions entry={e} {...actions} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
