import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'
import { ServiceDeletionDialog } from '../features/services/service-deletion-dialog'
import { ServiceCatalog } from '../features/services/service-catalog'
import { useServiceCatalog } from '../features/services/use-service-catalog'
import { ErrorState } from '../features/shell/admin/ui/data-state'
import { ServiceEditorDialog } from '../features/services/service-editor-dialog'
import { useServiceEditor } from '../features/services/use-service-editor'
import { useServiceDeletion } from '../features/services/use-service-deletion'
import { useServiceCategoryDeletion } from '../features/services/use-service-category-deletion'

import { getErrorMessage, getErrorCode } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { useAppToast } from '../lib/toast/useAppToast'

import { AdminConfirmDialog, type AdminConfirmRequest } from '../features/shell/admin/ui/admin-confirm-dialog'
import { Button } from '../components/ui/button'

export default function Services() {
  const { t } = useTranslation()
  const { error } = useAppToast()
  const showApiError = useCallback(
    (err: unknown, fallbackKey: string) => {
      error(t(resolveAdminApiErrorKey(getErrorMessage(err, ''), fallbackKey, getErrorCode(err))))
    },
    [error, t],
  )

  const { categories, loading, loadError, loadData: loadCatalog } = useServiceCatalog({ showApiError })
  const pageRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const catalogReloadingRef = useRef(false)
  const loadData = useCallback(() => {
    const active = document.activeElement
    if ((active === document.body || pageRef.current?.contains(active)) && active !== headingRef.current) headingRef.current?.focus()
    catalogReloadingRef.current = true
    loadCatalog()
  }, [loadCatalog])
  useEffect(() => { if (!loading) catalogReloadingRef.current = false }, [loading])
  const editorOpener = useRef<HTMLElement | null>(null)
  const deletionOpener = useRef<HTMLElement | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)
  // A completed mutation invalidates every open catalog dialog, not only its own.
  // Keep its draft visible but prevent writes until the dialog closes and refresh completes.
  const [refreshRequested, setRefreshRequested] = useState(false)
  const refreshRequestedRef = useRef(false)
  const requestMutationRefresh = useCallback(() => {
    refreshRequestedRef.current = true
    setRefreshRequested(true)
  }, [])
  const isCatalogStale = useCallback(() => refreshRequestedRef.current, [])

  const {
    open, setOpen, modalMode, saving, catForm, subForm, svcForm, setCatForm, setSubForm, setSvcForm,
    svcFileRef, uploadingImg, getDialogTitle, openCategoryForm, openSubcategoryForm, openServiceForm,
    handleUploadHeroImage, handleSave,
  } = useServiceEditor({ loadData: requestMutationRefresh, showApiError, isCatalogStale })

  const { handleDeleteCategory, handleDeleteSubcategory } = useServiceCategoryDeletion({
    setConfirmRequest, requestMutationRefresh, showApiError,
  })

  const {
    deletionOpen, deletionService, deletionImpact, deletionAction, deletionTargetId, deletionConfirmationName,
    deletionSaving, deletionLoading, deletionLoadError, availableMergeTargets, hasMergeConflicts,
    hasProcessingOutboxEvents, closeServiceDeletion, selectDeletionAction, openServiceDeletion,
    setDeletionTargetId, invalidateDeletionPreview, loadDeletionImpact, setDeletionConfirmationName, handleServiceMutation,
  } = useServiceDeletion({ categories, loadData: requestMutationRefresh, showApiError, isCatalogStale })

  useEffect(() => {
    if (refreshRequested && refreshRequestedRef.current && !open && !deletionOpen && !confirmRequest) {
      refreshRequestedRef.current = false
      setRefreshRequested(false)
      loadData()
    }
  }, [refreshRequested, open, deletionOpen, confirmRequest, loadData])

  return (
    <div ref={pageRef}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold text-content">
          {t('nav.services')}
        </h1>
        {!loading && !loadError ? <Button type="button" onClick={(event) => { editorOpener.current = event.currentTarget; openCategoryForm() }}>
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
      <ServiceCatalog categories={categories} openCategoryForm={(category, opener) => { editorOpener.current = opener; openCategoryForm(category) }} openSubcategoryForm={(categoryId, subcategory, opener) => { editorOpener.current = opener; openSubcategoryForm(categoryId, subcategory) }}
        openServiceForm={(subcategoryId, service, opener) => { editorOpener.current = opener; openServiceForm(subcategoryId, service) }} handleDeleteCategory={handleDeleteCategory} handleDeleteSubcategory={handleDeleteSubcategory}
        openServiceDeletion={(service, opener) => {
          deletionOpener.current = opener
          openServiceDeletion(service)
        }} />

      <ServiceEditorDialog openerRef={editorOpener} fallbackFocusRef={headingRef} catalogReloadingRef={catalogReloadingRef} open={open} setOpen={setOpen} modalMode={modalMode} title={getDialogTitle()} saving={saving} catalogStale={refreshRequested}
        catForm={catForm} subForm={subForm} svcForm={svcForm} setCatForm={setCatForm} setSubForm={setSubForm} setSvcForm={setSvcForm}
        svcFileRef={svcFileRef} uploadingImg={uploadingImg} handleUploadHeroImage={handleUploadHeroImage} onSave={() => void handleSave()} />

      <ServiceDeletionDialog openerRef={deletionOpener} fallbackFocusRef={headingRef} catalogReloadingRef={catalogReloadingRef}
        catalogStale={refreshRequested}
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
      <AdminConfirmDialog fallbackFocusRef={headingRef} request={confirmRequest} onClose={() => setConfirmRequest(null)} blockedReason={refreshRequested ? t('services.catalogChanged') : undefined} shouldBlock={isCatalogStale} />
      </> : null}
    </div>
  )
}
