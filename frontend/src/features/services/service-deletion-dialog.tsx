import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { ServiceDeletionImpactView } from './service-deletion-impact'
import type { ServiceDeletionImpact, ServiceMutationAction } from './service-deletion-types'
import type { Service } from './service-types'

type Props = {
  deletionOpen: boolean
  deletionService: Service | null
  deletionImpact: ServiceDeletionImpact | null
  deletionAction: ServiceMutationAction
  deletionTargetId: string
  deletionConfirmationName: string
  deletionSaving: boolean
  deletionLoading: boolean
  deletionLoadError: boolean
  availableMergeTargets: Service[]
  hasMergeConflicts: boolean
  hasProcessingOutboxEvents: boolean
  closeServiceDeletion: () => void
  selectDeletionAction: (action: ServiceMutationAction) => void
  onTargetChange: (target: string) => void
  onConfirmationChange: (value: string) => void
  onRetry: () => void
  onConfirm: () => void
}

export function ServiceDeletionDialog({
  deletionOpen, deletionService, deletionImpact, deletionAction, deletionTargetId,
  deletionConfirmationName, deletionSaving, deletionLoading, deletionLoadError,
  availableMergeTargets, hasMergeConflicts, hasProcessingOutboxEvents,
  closeServiceDeletion, selectDeletionAction, onTargetChange, onConfirmationChange, onRetry, onConfirm,
}: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={deletionOpen} onOpenChange={(nextOpen) => {
      if (!nextOpen) closeServiceDeletion()
    }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('services.deletion.title')}</DialogTitle>
        </DialogHeader>
        {deletionService ? (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-content-strong ">
              {t('services.deletion.description', {
                service: deletionService.name,
              })}
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={deletionSaving}
                aria-pressed={deletionAction === 'DELETE_LINKED_RECORDS'}
                onClick={() => selectDeletionAction('DELETE_LINKED_RECORDS')}
                className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring ${deletionAction === 'DELETE_LINKED_RECORDS' ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30' : 'border-line'}`}
              >
                <span className="block text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {t('services.deletion.deleteMode')}
                </span>
                <span className="mt-1 block text-xs leading-5 text-content-strong ">
                  {t('services.deletion.deleteModeDescription')}
                </span>
              </button>
              <button
                type="button"
                disabled={deletionSaving}
                aria-pressed={deletionAction === 'MERGE'}
                onClick={() => selectDeletionAction('MERGE')}
                className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring ${deletionAction === 'MERGE' ? 'border-brand-gold-ring bg-amber-50 dark:bg-amber-950/20' : 'border-line'}`}
              >
                <span className="block text-sm font-semibold text-content">
                  {t('services.deletion.mergeMode')}
                </span>
                <span className="mt-1 block text-xs leading-5 text-content-strong ">
                  {t('services.deletion.mergeModeDescription')}
                </span>
              </button>
            </div>

            {deletionAction === 'MERGE' ? (
              <div>
                <Label htmlFor="service-merge-target">
                  {t('services.deletion.targetService')}
                </Label>
                <Select
                  id="service-merge-target"
                  disabled={deletionSaving}
                  className="mt-1"
                  value={deletionTargetId}
                  onChange={(event) => onTargetChange(event.target.value)}
                >
                  <option value="">
                    {t('services.deletion.chooseTarget')}
                  </option>
                  {availableMergeTargets.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

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

            <div>
              <Label htmlFor="service-delete-confirmation">
                {t('services.deletion.confirmNameLabel')}
              </Label>
              <Input
                id="service-delete-confirmation"
                disabled={deletionSaving}
                className="mt-1"
                autoComplete="off"
                value={deletionConfirmationName}
                onChange={(event) => onConfirmationChange(event.target.value)}
                placeholder={t('services.deletion.confirmNamePlaceholder', {
                  service: deletionService.name,
                })}
              />
            </div>
          </div>
        ) : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={closeServiceDeletion}
          >
              {t(deletionSaving ? 'common.close' : 'common.cancel')}
            </Button>
            <Button
            type="button"
            variant={
              deletionAction === 'DELETE_LINKED_RECORDS'
                ? 'danger'
                : 'default'
            }
            onClick={onConfirm}
            disabled={
              deletionSaving ||
              deletionLoading ||
              !deletionImpact ||
              deletionConfirmationName.trim() !== deletionService?.name ||
              (deletionAction === 'MERGE' &&
                (!deletionTargetId || hasMergeConflicts)) ||
              (deletionAction === 'DELETE_LINKED_RECORDS' &&
                hasProcessingOutboxEvents)
            }
          >
            {deletionSaving ? (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {deletionAction === 'MERGE'
              ? t('services.deletion.confirmMerge')
              : t('services.deletion.confirmDelete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
