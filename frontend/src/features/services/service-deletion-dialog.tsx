import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { ServiceDeletionOptions } from './service-deletion-options'
import { ServiceDeletionPreview } from './service-deletion-preview'
import type { ServiceDeletionImpact, ServiceMutationAction } from './service-deletion-types'
import type { Service } from './service-types'

type Props = {
  openerRef: RefObject<HTMLElement>
  fallbackFocusRef: RefObject<HTMLElement>
  catalogReloadingRef: RefObject<boolean>
  deletionOpen: boolean
  catalogStale: boolean
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
  openerRef, fallbackFocusRef, catalogReloadingRef, catalogStale, deletionOpen, deletionService, deletionImpact, deletionAction, deletionTargetId,
  deletionConfirmationName, deletionSaving, deletionLoading, deletionLoadError,
  availableMergeTargets, hasMergeConflicts, hasProcessingOutboxEvents,
  closeServiceDeletion, selectDeletionAction, onTargetChange, onConfirmationChange, onRetry, onConfirm,
}: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={deletionOpen} onOpenChange={(nextOpen) => {
      if (!nextOpen) closeServiceDeletion()
    }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onCloseAutoFocus={(event) => {
        const target = catalogReloadingRef.current ? fallbackFocusRef.current : (openerRef.current?.isConnected ? openerRef.current : fallbackFocusRef.current)
        if (target?.isConnected) { event.preventDefault(); target.focus() }
      }}>
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

            <ServiceDeletionOptions deletionSaving={deletionSaving} deletionAction={deletionAction} deletionTargetId={deletionTargetId}
              availableMergeTargets={availableMergeTargets} selectDeletionAction={selectDeletionAction} onTargetChange={onTargetChange} />

            <ServiceDeletionPreview deletionSaving={deletionSaving} deletionLoading={deletionLoading} deletionLoadError={deletionLoadError}
              deletionImpact={deletionImpact} deletionAction={deletionAction} hasMergeConflicts={hasMergeConflicts}
              hasProcessingOutboxEvents={hasProcessingOutboxEvents} onRetry={onRetry} />

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
        {catalogStale ? <p role="alert" className="text-sm text-content-strong">{t('services.catalogChanged')}</p> : null}
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
            aria-disabled={catalogStale || undefined}
            className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
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
