import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import { Loader2 } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import type { CampaignJobSummary } from './email-settings-types'

/**
 * Napredak kampanje (S9).
 *
 * Izdvojeno iz `email-campaigns-panel.tsx` bez promjene: isti `role="progressbar"`
 * sa `aria-valuenow`, isti `transition-[width] motion-reduce:transition-none` na
 * traci, ista lista neuspjelih primalaca (prvih 10) i iste akcije
 * otkazivanja/retry-ja.
 */
export function EmailCampaignProgress({
  job,
  loadFailed,
  actionBusy,
  onCancel,
  onRetry,
}: {
  job: CampaignJobSummary
  loadFailed: boolean
  actionBusy: boolean
  onCancel: () => void
  onRetry: () => void
}) {
  const { t, i18n } = useTranslation()

  const counts = job.counts
  const settled = counts.delivered + counts.skipped + counts.failed + counts.cancelled
  const percent = job.totalRecipients > 0
    ? Math.min(100, Math.round((settled / job.totalRecipients) * 100))
    : 100
  const active = job.status === 'QUEUED' || job.status === 'RUNNING'
  const failedRecipients = job.recipients
    .filter((recipient) => recipient.status === 'FAILED')
    .slice(0, 10)

  return (
    <Card className="space-y-3 p-4" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold text-content">
          {t('emailSettings.campaigns.progressHeading')}
        </h3>
        <Badge variant={active ? 'brand' : 'outline'}>
          {t(`emailSettings.campaigns.jobStatuses.${job.status}`, { defaultValue: job.status })}
        </Badge>
      </div>
      <p className="text-sm text-content-strong">
        {t('emailSettings.campaigns.counts', {
          pending: formatLocalizedNumber(counts.pending, i18n.language),
          processing: formatLocalizedNumber(counts.processing, i18n.language),
          delivered: formatLocalizedNumber(counts.delivered, i18n.language),
          skipped: formatLocalizedNumber(counts.skipped, i18n.language),
          failed: formatLocalizedNumber(counts.failed, i18n.language),
          cancelled: formatLocalizedNumber(counts.cancelled, i18n.language),
        })}
      </p>
      <div
        role="progressbar"
        aria-label={t('emailSettings.campaigns.progressHeading')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-surface-muted"
      >
        <div className="h-full rounded-full bg-ok-foreground transition-[width] motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
      {loadFailed ? (
        <p role="alert" className="text-sm text-danger">
          {t('emailSettings.campaigns.progressLoadFailed')}
        </p>
      ) : null}
      {failedRecipients.length > 0 ? (
        <div className="space-y-1">
          <p className="text-sm font-medium">{t('emailSettings.campaigns.recipientListHeading')}</p>
          <ul className="space-y-1 text-sm text-content-strong ">
            {failedRecipients.map((recipient) => (
              <li key={recipient.id} className="flex justify-between gap-3">
                <span>{recipient.username}</span>
                <span>{t(`emailSettings.campaigns.recipientStatuses.${recipient.status}`, { defaultValue: recipient.status })}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {active ? (
          <Button type="button" variant="outline" onClick={() => onCancel()} disabled={actionBusy}>
            {actionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
            {t('emailSettings.campaigns.cancelRemaining')}
          </Button>
        ) : null}
        {!active && counts.failed > 0 ? (
          <Button type="button" variant="outline" onClick={() => onRetry()} disabled={actionBusy}>
            {actionBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
            {t('emailSettings.campaigns.retryFailed')}
          </Button>
        ) : null}
      </div>
    </Card>
  )
}
