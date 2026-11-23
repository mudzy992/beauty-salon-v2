import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'
import { ServiceDeletionDialog } from '../features/services/service-deletion-dialog'
import { ServiceCatalog } from '../features/services/service-catalog'
import type { Category, Subcategory } from '../features/services/service-catalog-types'
import { ServiceEditorDialog } from '../features/services/service-editor-dialog'
import { useServiceEditor } from '../features/services/use-service-editor'
import { useServiceDeletion } from '../features/services/use-service-deletion'
import type { Service } from '../features/services/service-types'

import api from '../api/client'
import { getErrorMessage, getErrorCode } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import {
  fetchAllAdminServiceCategories,
  fetchAllAdminServices,
  fetchAllAdminServiceSubcategories,
} from '../api/catalog'
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

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetchAllAdminServiceCategories<Category>(),
      fetchAllAdminServiceSubcategories<Subcategory>(),
      fetchAllAdminServices<Service>(),
    ])
      .then(([categoryList, subcategoryList, serviceList]) => {
        const subcategoriesById = new Map(
          subcategoryList.map((subcategory) => [
            subcategory.id,
            { ...subcategory, services: [] as Service[] },
          ]),
        )
        serviceList.forEach((service) => {
          subcategoriesById.get(service.subcategoryId)?.services.push(service)
        })
        setCategories(
          categoryList.map((category) => ({
            ...category,
            subcategories: subcategoryList
              .filter((subcategory) => subcategory.categoryId === category.id)
              .map(
                (subcategory) =>
                  subcategoriesById.get(subcategory.id) ?? subcategory,
              ),
          })),
        )
      })
      .catch((err) => {
        setCategories([])
        showApiError(err, 'services.errors.loadFailed')
      })
      .finally(() => setLoading(false))
  }, [showApiError])

  useEffect(() => {
    loadData()
  }, [loadData])

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

  if (loading) {
    return (
      <div className="flex justify-center p-10 text-content-muted">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }




  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-content">
          {t('nav.services')}
        </h1>
        <Button type="button" onClick={() => openCategoryForm()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('services.newCategory')}
        </Button>
      </div>

      <ServiceCatalog categories={categories} openCategoryForm={openCategoryForm} openSubcategoryForm={openSubcategoryForm}
        openServiceForm={openServiceForm} handleDeleteCategory={handleDeleteCategory} handleDeleteSubcategory={handleDeleteSubcategory}
        openServiceDeletion={openServiceDeletion} />

      <ServiceEditorDialog open={open} setOpen={setOpen} modalMode={modalMode} title={getDialogTitle()} saving={saving}
        catForm={catForm} subForm={subForm} svcForm={svcForm} setCatForm={setCatForm} setSubForm={setSubForm} setSvcForm={setSvcForm}
        svcFileRef={svcFileRef} uploadingImg={uploadingImg} handleUploadHeroImage={handleUploadHeroImage} onSave={() => void handleSave()} />

      <ServiceDeletionDialog
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
      <AdminConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  )
}
