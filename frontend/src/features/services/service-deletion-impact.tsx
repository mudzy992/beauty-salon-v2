import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { ServiceDeletionImpact, ServiceMutationAction } from './service-deletion-types'
import { ServiceDeletionWarnings } from './service-deletion-warnings'

export function ServiceDeletionImpactView({ impact, action, hasMergeConflicts, hasProcessingOutboxEvents }: {
  impact: ServiceDeletionImpact
  action: ServiceMutationAction
  hasMergeConflicts: boolean
  hasProcessingOutboxEvents: boolean
}) {
  const { t, i18n } = useTranslation()
  const merge = action === 'MERGE'
  const rows: [string, number][] = [
    ['primaryReservations', impact.reservations.primary],
    ['additionalReservationItems', impact.reservations.additionalServiceItems],
    ['dailyLogs', impact.dailyLogs.primary],
    ['completedLogs', impact.dailyLogs.completed],
    ['additionalDailyLogItems', impact.dailyLogs.additionalServiceItems],
    ['debtPaymentEntries', impact.dailyLogs.debtPaymentEntries],
    ['automaticIncomeEntries', impact.income.automaticEntries],
    ['manualIncomeEntries', impact.income.manualEntries],
    ['debts', impact.debts.count],
    ['openDebts', impact.debts.openCount],
    ['reviews', impact.reviews],
    ['stylistLinks', impact.stylistLinks],
    ['serviceImage', impact.service.imageRetained ? 1 : 0],
    [merge ? 'dailyLogImagesMerge' : 'dailyLogImages', impact.images.dailyLogImages],
    ['imageConsentRecords', impact.images.consentRecordsRetained],
    ['pendingOutboxEvents', impact.pendingOutboxEvents],
  ]
  const number = (value: number) => formatLocalizedNumber(value, i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <section aria-labelledby="service-deletion-impact-title" className="space-y-3 rounded-xl border border-line p-4">
      <h3 id="service-deletion-impact-title" className="text-sm font-semibold text-content">{t('services.deletion.impactTitle')}</h3>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-3">
            <dt>{t(`services.deletion.${key}`)}</dt><dd className="font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-lg bg-surface-muted p-3 text-sm">
        <p>{t(merge ? 'services.deletion.automaticIncomeSummaryMerge' : 'services.deletion.automaticIncomeSummary', { revenue: number(impact.income.automaticRevenue), tips: number(impact.income.automaticTips) })}</p>
        <p className="mt-1">{t(merge ? 'services.deletion.manualIncomeSummaryMerge' : 'services.deletion.manualIncomeSummary', { revenue: number(impact.income.manualRevenue), tips: number(impact.income.manualTips) })}</p>
        <p className="mt-1">{t(merge ? 'services.deletion.totalDebtAmountMerge' : 'services.deletion.totalDebtAmount', { amount: number(impact.debts.amount) })}</p>
        <p className="mt-1 font-medium">{t(merge ? 'services.deletion.openDebtAmountMerge' : 'services.deletion.openDebtAmount', { amount: number(impact.debts.openAmount) })}</p>
      </div>
      <ServiceDeletionWarnings impact={impact} action={action} hasMergeConflicts={hasMergeConflicts} hasProcessingOutboxEvents={hasProcessingOutboxEvents} />
    </section>
  )
}
