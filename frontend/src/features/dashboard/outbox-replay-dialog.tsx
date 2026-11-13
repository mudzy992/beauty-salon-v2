import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { formatLocalizedNumber } from '../../i18n/locale-utils.mjs'
import type { OutboxDiagnosticEvent } from './use-outbox'

type Props = {
  target: OutboxDiagnosticEvent | null
  loading: boolean
  failed: boolean
  onClose: () => void
  onConfirm: (target: OutboxDiagnosticEvent) => Promise<boolean>
}

/**
 * Potvrda ručnog replay-a. Isporuka je at-least-once, pa potvrda **nije**
 * običan „Da/Ne": traži se eksplicitan checkbox kojim operater priznaje rizik
 * duple isporuke prije nego se poziv uopšte pošalje.
 */
export const OutboxReplayDialog = ({ target, loading, failed, onClose, onConfirm }: Props) => {
  const { t, i18n } = useTranslation()
  const [replayAcknowledged, setReplayAcknowledged] = useState(false)

  useEffect(() => {
    if (!target) setReplayAcknowledged(false)
  }, [target])

  const attempts = formatLocalizedNumber(
    typeof target?.attempts === 'number' && Number.isSafeInteger(target.attempts) && target.attempts >= 0
      ? target.attempts
      : 0,
    i18n.language,
    { maximumFractionDigits: 0 },
  )

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (open || loading) return
        onClose()
      }}
    >
      <DialogContent data-dashboard-replay-dialog>
        <DialogHeader>
          <DialogTitle>{t('dashboard.outbox.replayDialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('dashboard.outbox.replayDialogDescription', {
              eventId: target?.id.slice(0, 8) ?? '',
              attempts,
            })}
          </DialogDescription>
        </DialogHeader>
        <Alert variant="warning">
          <AlertDescription>{t('dashboard.outbox.replayWarning')}</AlertDescription>
        </Alert>
        <label className="flex items-start gap-3 text-sm text-content">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-brand-rose"
            checked={replayAcknowledged}
            onChange={(event) => setReplayAcknowledged(event.target.checked)}
          />
          <span>{t('dashboard.outbox.replayAcknowledgment')}</span>
        </label>
        {failed ? (
          <Alert variant="destructive">
            <AlertDescription>{t('dashboard.outbox.replayFailed')}</AlertDescription>
          </Alert>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!replayAcknowledged || loading}
            aria-busy={loading}
            onClick={() => {
              if (target) void onConfirm(target).then((queued) => queued && onClose())
            }}
          >
            {loading
              ? t('dashboard.outbox.replaying')
              : t('dashboard.outbox.confirmReplay')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
