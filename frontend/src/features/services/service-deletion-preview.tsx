import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ServiceDeletionImpactView } from './service-deletion-impact'
import type { ServiceDeletionImpact, ServiceMutationAction } from './service-deletion-types'

type Props = {
  deletionSaving: boolean; deletionLoading: boolean; deletionLoadError: boolean
  deletionImpact: ServiceDeletionImpact | null; deletionAction: ServiceMutationAction
  hasMergeConflicts: boolean; hasProcessingOutboxEvents: boolean; onRetry: () => void
}
export function ServiceDeletionPreview({ deletionSaving, deletionLoading, deletionLoadError, deletionImpact, deletionAction, hasMergeConflicts, hasProcessingOutboxEvents, onRetry }: Props) {
  const { t } = useTranslation()
  return (<>
              {deletionSaving ? <p role="status" aria-live="polite">{t('services.deletion.mutationPending')}</p> : null}

            {deletionLoading ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-xl border border-line p-4 text-sm text-content-strong "
              >
                <Loader2
                  className="mr-2 inline h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
                {t('services.deletion.loadingImpact')}
              </div>
            ) : deletionLoadError ? (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
              >
                <p>{t('services.deletion.impactFailed')}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={onRetry}
                >
                  {t('services.deletion.retryImpact')}
                </Button>
              </div>
            ) : deletionImpact ? (
              <ServiceDeletionImpactView
                impact={deletionImpact}
                action={deletionAction}
                hasMergeConflicts={hasMergeConflicts}
                hasProcessingOutboxEvents={hasProcessingOutboxEvents}
              />
            ) : null}

  </>)
}
