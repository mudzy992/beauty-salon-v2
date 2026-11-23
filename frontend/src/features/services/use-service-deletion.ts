import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import { useAuthStore } from '../../stores/auth.store'
import type { Category } from './service-catalog-types'
import type { Service } from './service-types'
import type { ServiceDeletionImpact, ServiceMutationAction } from './service-deletion-types'

type Dependencies = { categories: Category[]; loadData: () => void; showApiError: (err: unknown, fallbackKey: string) => void }
export function useServiceDeletion({ categories, loadData, showApiError }: Dependencies) {
  const { t } = useTranslation()
  const { success } = useAppToast()
  const [deletionOpen, setDeletionOpen] = useState(false)
  const [deletionLoading, setDeletionLoading] = useState(false)
  const [deletionSaving, setDeletionSaving] = useState(false)
  const [deletionLoadError, setDeletionLoadError] = useState(false)
  const [deletionService, setDeletionService] = useState<Service | null>(null)
  const [deletionImpact, setDeletionImpact] =
    useState<ServiceDeletionImpact | null>(null)
  const [deletionAction, setDeletionAction] = useState<ServiceMutationAction>(
    'DELETE_LINKED_RECORDS',
  )
  const [deletionTargetId, setDeletionTargetId] = useState('')
  const [deletionConfirmationName, setDeletionConfirmationName] = useState('')
  const deletionPreviewGeneration = useRef(0)
  const deletionDialogGeneration = useRef(0)
  const deletionOpenRef = useRef(false)
  const deletionMutationInFlight = useRef(false)
  const deletionRefreshPending = useRef(false)
  const deletionMounted = useRef(false)

  useEffect(() => {
    deletionMounted.current = true
    return () => {
      deletionMounted.current = false
      deletionPreviewGeneration.current += 1
      deletionDialogGeneration.current += 1
    }
  }, [])

  const invalidateDeletionPreview = () => {
    deletionPreviewGeneration.current += 1
    setDeletionImpact(null)
    setDeletionLoadError(false)
    setDeletionLoading(false)
  }

  const closeServiceDeletion = () => {
    deletionOpenRef.current = false
    deletionDialogGeneration.current += 1
    invalidateDeletionPreview()
    setDeletionOpen(false)
    // A previous mutation may have completed while a newer dialog was open.
    // Refresh only after it closes, so its contents and focus are not lost.
    if (deletionRefreshPending.current) {
      deletionRefreshPending.current = false
      loadData()
    }
  }

  const loadDeletionImpact = async (
    serviceId: string,
    targetServiceId?: string,
  ) => {
    const generation = ++deletionPreviewGeneration.current
    setDeletionLoading(true)
    setDeletionLoadError(false)
    try {
      const { data } = await api.get<ServiceDeletionImpact>(
        `/api/services/admin/services/${serviceId}/deletion-impact`,
        { params: targetServiceId ? { targetServiceId } : undefined },
      )
      if (generation !== deletionPreviewGeneration.current) return
      setDeletionImpact(data)
    } catch (err) {
      if (generation !== deletionPreviewGeneration.current) return
      setDeletionImpact(null)
      setDeletionLoadError(true)
      showApiError(err, 'services.errors.deleteServiceFailed')
    } finally {
      if (generation === deletionPreviewGeneration.current) setDeletionLoading(false)
    }
  }

  const openServiceDeletion = (service: Service) => {
    deletionOpenRef.current = true
    deletionDialogGeneration.current += 1
    setDeletionService(service)
    setDeletionAction('DELETE_LINKED_RECORDS')
    setDeletionTargetId('')
    setDeletionConfirmationName('')
    setDeletionImpact(null)
    setDeletionLoadError(false)
    setDeletionOpen(true)
    void loadDeletionImpact(service.id)
  }

  const handleServiceMutation = async () => {
    if (!deletionService || !deletionImpact || deletionMutationInFlight.current) return
    deletionMutationInFlight.current = true
    const dialogGeneration = deletionDialogGeneration.current
    const sessionVersion = useAuthStore.getState().sessionVersion
    const stillMountedInSession = () => deletionMounted.current && useAuthStore.getState().sessionVersion === sessionVersion
    const sameDialog = () => stillMountedInSession() && deletionOpenRef.current && deletionDialogGeneration.current === dialogGeneration
    setDeletionSaving(true)
    try {
      await api.delete(`/api/services/${deletionService.id}`, {
        data: {
          action: deletionAction,
          confirmationName: deletionConfirmationName,
          impactToken: deletionImpact.impactToken,
          ...(deletionAction === 'MERGE'
            ? { targetServiceId: deletionTargetId }
            : {}),
        },
      })
      if (!stillMountedInSession()) return
      success(t(deletionAction === 'MERGE' ? 'services.toast.serviceMerged' : 'services.toast.serviceDeleted'))
      if (sameDialog()) {
        deletionRefreshPending.current = false
        closeServiceDeletion()
        setDeletionService(null)
        loadData()
      } else if (deletionOpenRef.current) {
        deletionRefreshPending.current = true
      } else {
        loadData()
      }
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

  const availableMergeTargets = categories
    .flatMap((category) => category.subcategories ?? [])
    .flatMap((subcategory) => subcategory.services ?? [])
    .filter((service) => service.id !== deletionService?.id)
  const hasMergeConflicts = Object.values(
    deletionImpact?.mergeConflicts ?? {},
  ).some((count) => count > 0)
  const hasProcessingOutboxEvents =
    (deletionImpact?.mergeConflicts.processingOutboxEvents ?? 0) > 0

  return {
    deletionOpen, deletionService, deletionImpact, deletionAction, deletionTargetId, deletionConfirmationName,
    deletionSaving, deletionLoading, deletionLoadError, availableMergeTargets, hasMergeConflicts,
    hasProcessingOutboxEvents, closeServiceDeletion, selectDeletionAction, openServiceDeletion,
    setDeletionTargetId, invalidateDeletionPreview, loadDeletionImpact, setDeletionConfirmationName, handleServiceMutation,
  }
}
