import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import { useAuthStore } from '../../stores/auth.store'
import type { Category } from './service-catalog-types'
import type { Service } from './service-types'
import type { ServiceMutationAction } from './service-deletion-types'
import {
  buildServiceDeletionRequest,
  hasMergeConflicts,
  hasProcessingOutboxEvents,
  mergeTargetsFor,
} from './service-deletion-plan'
import { useServiceDeletionPreview } from './use-service-deletion-preview'

type Dependencies = { categories: Category[]; loadData: () => void; showApiError: (err: unknown, fallbackKey: string) => void; isCatalogStale: () => boolean }
export function useServiceDeletion({ categories, loadData, showApiError, isCatalogStale }: Dependencies) {
  const { t } = useTranslation()
  const { success } = useAppToast()
  const [deletionOpen, setDeletionOpen] = useState(false)
  const [deletionSaving, setDeletionSaving] = useState(false)
  const [deletionService, setDeletionService] = useState<Service | null>(null)
  const [deletionAction, setDeletionAction] = useState<ServiceMutationAction>(
    'DELETE_LINKED_RECORDS',
  )
  const [deletionTargetId, setDeletionTargetId] = useState('')
  const [deletionConfirmationName, setDeletionConfirmationName] = useState('')
  const deletionDialogGeneration = useRef(0)
  const deletionOpenRef = useRef(false)
  const deletionMutationInFlight = useRef(false)
  const deletionMounted = useRef(false)

  const {
    impact: deletionImpact,
    loading: deletionLoading,
    loadError: deletionLoadError,
    load: loadDeletionImpact,
    invalidate: invalidateDeletionPreview,
  } = useServiceDeletionPreview({ showApiError })

  useEffect(() => {
    deletionMounted.current = true
    return () => {
      deletionMounted.current = false
      deletionDialogGeneration.current += 1
    }
  }, [])

  const closeServiceDeletion = () => {
    deletionOpenRef.current = false
    deletionDialogGeneration.current += 1
    invalidateDeletionPreview()
    setDeletionOpen(false)
  }

  const openServiceDeletion = (service: Service) => {
    deletionOpenRef.current = true
    deletionDialogGeneration.current += 1
    setDeletionService(service)
    setDeletionAction('DELETE_LINKED_RECORDS')
    setDeletionTargetId('')
    setDeletionConfirmationName('')
    invalidateDeletionPreview()
    setDeletionOpen(true)
    void loadDeletionImpact(service.id)
  }

  const handleServiceMutation = async () => {
    if (!deletionService || !deletionImpact || deletionMutationInFlight.current || isCatalogStale()) return
    deletionMutationInFlight.current = true
    const dialogGeneration = deletionDialogGeneration.current
    const sessionVersion = useAuthStore.getState().sessionVersion
    const stillMountedInSession = () => deletionMounted.current && useAuthStore.getState().sessionVersion === sessionVersion
    const sameDialog = () => stillMountedInSession() && deletionOpenRef.current && deletionDialogGeneration.current === dialogGeneration
    setDeletionSaving(true)
    try {
      const request = buildServiceDeletionRequest({
        serviceId: deletionService.id,
        action: deletionAction,
        confirmationName: deletionConfirmationName,
        impactToken: deletionImpact.impactToken,
        targetServiceId: deletionTargetId,
      })
      await api.delete(request.url, { data: request.data })
      if (!stillMountedInSession()) return
      success(t(deletionAction === 'MERGE' ? 'services.toast.serviceMerged' : 'services.toast.serviceDeleted'))
      if (sameDialog()) {
        closeServiceDeletion()
        setDeletionService(null)
      }
      loadData()
    } catch (err) {
      if (!stillMountedInSession()) return
      showApiError(err, 'services.errors.deleteServiceFailed')
      if (sameDialog()) {
        void loadDeletionImpact(
          deletionService.id,
          deletionAction === 'MERGE' ? deletionTargetId : undefined,
        )
      }
    } finally {
      deletionMutationInFlight.current = false
      if (deletionMounted.current) setDeletionSaving(false)
    }
  }

  const selectDeletionAction = (action: ServiceMutationAction) => {
    setDeletionAction(action)
    invalidateDeletionPreview()
    if (!deletionService) return
    if (action === 'MERGE') {
      if (deletionTargetId)
        void loadDeletionImpact(deletionService.id, deletionTargetId)
    } else {
      void loadDeletionImpact(deletionService.id)
    }
  }

  const availableMergeTargets = mergeTargetsFor(categories, deletionService?.id)

  return {
    deletionOpen, deletionService, deletionImpact, deletionAction, deletionTargetId, deletionConfirmationName,
    deletionSaving, deletionLoading, deletionLoadError, availableMergeTargets,
    hasMergeConflicts: hasMergeConflicts(deletionImpact),
    hasProcessingOutboxEvents: hasProcessingOutboxEvents(deletionImpact),
    closeServiceDeletion, selectDeletionAction, openServiceDeletion,
    setDeletionTargetId, invalidateDeletionPreview, loadDeletionImpact, setDeletionConfirmationName, handleServiceMutation,
  }
}
