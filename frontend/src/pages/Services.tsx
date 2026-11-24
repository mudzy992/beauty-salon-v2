import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'
import { ServiceDeletionDialog } from '../features/services/service-deletion-dialog'
import { ServiceCatalog } from '../features/services/service-catalog'
import { useServiceCatalog } from '../features/services/use-service-catalog'
import { ErrorState } from '../features/shell/admin/ui/data-state'
import { ServiceEditorDialog } from '../features/services/service-editor-dialog'
import { useServiceEditor } from '../features/services/use-service-editor'
import { useServiceDeletion } from '../features/services/use-service-deletion'

import api from '../api/client'
import { getErrorMessage, getErrorCode } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { useAppToast } from '../lib/toast/useAppToast'

import { AdminConfirmDialog, type AdminConfirmRequest } from '../features/shell/admin/ui/admin-confirm-dialog'
import { Button } from '../components/ui/button'

export default function Services() {
  const { t } = useTranslation()
  const { success, error } = useAppToast()
  const showApiError = useCallback(
    (err: unknown, fallbackKey: string) => {
      error(t(resolveAdminApiErrorKey(getErrorMessage(err, ''), fallbackKey, getErrorCode(err))))
    },
    [error, t],
  )

  const { categories, loading, loadError, loadData: loadCatalog } = useServiceCatalog({ showApiError })
  const pageRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const loadData = useCallback(() => {
    if (pageRef.current?.contains(document.activeElement) && document.activeElement !== headingRef.current) headingRef.current?.focus()
    loadCatalog()
  }, [loadCatalog])
  const editorOpener = useRef<HTMLElement | null>(null)
  const deletionOpener = useRef<HTMLElement | null>(null)
  const rememberEditorOpener = () => {
    editorOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
  }
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)

  const {
    open, setOpen, modalMode, saving, catForm, subForm, svcForm, setCatForm, setSubForm, setSvcForm,
    svcFileRef, uploadingImg, getDialogTitle, openCategoryForm, openSubcategoryForm, openServiceForm,
    handleUploadHeroImage, handleSave,
  } = useServiceEditor({ loadData, showApiError })

  const handleDeleteCategory = (id: string) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('services.confirmDeleteCategory'),
      confirmLabel: t('common.delete'),
      action: async () => {
        try {
          await api.delete(`/api/services/categories/${id}`)
          success(t('services.toast.categoryDeleted'))
          loadData()
        } catch (err) {
          showApiError(err, 'services.errors.deleteCategoryFailed')
        }
      },
    })
  }

  const handleDeleteSubcategory = (id: string) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('services.confirmDeleteSubcategory'),
      confirmLabel: t('common.delete'),
      action: async () => {
        try {
          await api.delete(`/api/services/subcategories/${id}`)
          success(t('services.toast.subcategoryDeleted'))
          loadData()
        } catch (err) {
          showApiError(err, 'services.errors.deleteSubcategoryFailed')
        }
      },
    })
  }

  const {
    deletionOpen, deletionService, deletionImpact, deletionAction, deletionTargetId, deletionConfirmationName,
    deletionSaving, deletionLoading, deletionLoadError, availableMergeTargets, hasMergeConflicts,
    hasProcessingOutboxEvents, closeServiceDeletion, selectDeletionAction, openServiceDeletion,
    setDeletionTargetId, invalidateDeletionPreview, loadDeletionImpact, setDeletionConfirmationName, handleServiceMutation,
  } = useServiceDeletion({ categories, loadData, showApiError })

  return (
    <div ref={pageRef}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-content">
          {t('nav.services')}
        </h1>
        {!loading && !loadError ? <Button type="button" onClick={() => { rememberEditorOpener(); openCategoryForm() }}>
          <Plus className="mr-2 h-4 w-4" />
          {t('services.newCategory')}
        </Button> : null}
      </div>

      {loading ? <div role="status" className="flex justify-center p-10 text-content-muted">
        <span className="sr-only">{t('common.loading')}</span>
        <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div> : null}
      {loadError && !loading ? <ErrorState description={t('services.errors.loadFailed')} onRetry={loadData} /> : null}
      {!loading && !loadError ? <>
      <ServiceCatalog categories={categories} openCategoryForm={(category) => { rememberEditorOpener(); openCategoryForm(category) }} openSubcategoryForm={(categoryId, subcategory) => { rememberEditorOpener(); openSubcategoryForm(categoryId, subcategory) }}
        openServiceForm={(subcategoryId, service) => { rememberEditorOpener(); openServiceForm(subcategoryId, service) }} handleDeleteCategory={handleDeleteCategory} handleDeleteSubcategory={handleDeleteSubcategory}
        openServiceDeletion={(service) => {
          deletionOpener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          openServiceDeletion(service)
        }} />

      <ServiceEditorDialog openerRef={editorOpener} fallbackFocusRef={headingRef} open={open} setOpen={setOpen} modalMode={modalMode} title={getDialogTitle()} saving={saving}
        catForm={catForm} subForm={subForm} svcForm={svcForm} setCatForm={setCatForm} setSubForm={setSubForm} setSvcForm={setSvcForm}
        svcFileRef={svcFileRef} uploadingImg={uploadingImg} handleUploadHeroImage={handleUploadHeroImage} onSave={() => void handleSave()} />

      <ServiceDeletionDialog openerRef={deletionOpener} fallbackFocusRef={headingRef}
        deletionOpen={deletionOpen}
        deletionService={deletionService}
        deletionImpact={deletionImpact}
        deletionAction={deletionAction}
        deletionTargetId={deletionTargetId}
        deletionConfirmationName={deletionConfirmationName}
        deletionSaving={deletionSaving}
        deletionLoading={deletionLoading}
        deletionLoadError={deletionLoadError}
        availableMergeTargets={availableMergeTargets}
        hasMergeConflicts={hasMergeConflicts}
        hasProcessingOutboxEvents={hasProcessingOutboxEvents}
        closeServiceDeletion={closeServiceDeletion}
        selectDeletionAction={selectDeletionAction}
        onTargetChange={(targetId) => {
          setDeletionTargetId(targetId)
          invalidateDeletionPreview()
          if (targetId && deletionService) void loadDeletionImpact(deletionService.id, targetId)
        }}
        onConfirmationChange={setDeletionConfirmationName}
        onRetry={() => {
          if (deletionService) void loadDeletionImpact(deletionService.id, deletionAction === 'MERGE' ? deletionTargetId : undefined)
        }}
        onConfirm={() => void handleServiceMutation()}
      />
      <AdminConfirmDialog fallbackFocusRef={headingRef} request={confirmRequest} onClose={() => setConfirmRequest(null)} />
      </> : null}
    </div>
  )
}
