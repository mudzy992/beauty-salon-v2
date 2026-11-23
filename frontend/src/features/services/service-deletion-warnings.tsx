import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ServiceDeletionImpact, ServiceMutationAction } from './service-deletion-types'

export function ServiceDeletionWarnings({ impact, action, hasMergeConflicts, hasProcessingOutboxEvents }: {
  impact: ServiceDeletionImpact
  action: ServiceMutationAction
  hasMergeConflicts: boolean
  hasProcessingOutboxEvents: boolean
}) {
  const { t } = useTranslation()
  if (action === 'DELETE_LINKED_RECORDS') return (
    <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p>{t('services.deletion.permanentWarning')}</p>
        {hasProcessingOutboxEvents ? <p role="alert" className="mt-2 font-semibold">{t('services.deletion.processingOutboxWarning')}</p> : null}
      </div>
    </div>
  )
  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
      <p>{t('services.deletion.mergeSummary', { target: impact.target?.name ?? '', stylistDuplicates: impact.duplicateStylistLinks })}</p>
      {hasMergeConflicts ? (
        <div role="alert" className="flex gap-2 font-medium">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{t('services.deletion.mergeConflicts', { reservationItems: impact.mergeConflicts.reservationItems, dailyLogItems: impact.mergeConflicts.dailyLogItems, dailyLogReservations: impact.mergeConflicts.dailyLogReservations, reviews: impact.mergeConflicts.reviews, processingOutboxEvents: impact.mergeConflicts.processingOutboxEvents })}</span>
        </div>
      ) : null}
    </div>
  )
}
