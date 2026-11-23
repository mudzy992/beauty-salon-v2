import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { ServiceDeletionDialog } from '../features/services/service-deletion-dialog'
import { ServiceTable } from '../features/services/service-table'
import { ServiceEditorDialog } from '../features/services/service-editor-dialog'
import type { ModalMode } from '../features/services/service-form-types'
import type { Service } from '../features/services/service-types'
import type { ServiceDeletionImpact, ServiceMutationAction } from '../features/services/service-deletion-types'

import api from '../api/client'
import { getErrorMessage, getErrorCode } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import {
  fetchAllAdminServiceCategories,
  fetchAllAdminServices,
  fetchAllAdminServiceSubcategories,
} from '../api/catalog'
import { useAppToast } from '../lib/toast/useAppToast'
import { useAuthStore } from '../stores/auth.store'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion'
import { AdminConfirmDialog, type AdminConfirmRequest } from '../features/shell/admin/ui/admin-confirm-dialog'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

interface Subcategory {
  id: string
  categoryId: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  services?: Service[]
}

interface Category {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  subcategories?: Subcategory[]
}



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
  const [saving, setSaving] = useState(false)
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)

  const [open, setOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('category')
  const [editId, setEditId] = useState<string | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)

  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  })
  const [subForm, setSubForm] = useState({
    name: '',
    description: '',
    sortOrder: 0,
    isActive: true,
  })
  const [svcForm, setSvcForm] = useState({
    name: '',
    shortDescription: '',
    durationMinutes: 30,
    price: 0,
    gender: 'FEMALE' as 'MALE' | 'FEMALE',
    sortOrder: 0,
    isActive: true,
    heroImage: '',
    loyaltyEnabled: false,
    loyaltyMaxDiscountPercent: 0,
  })
  const [uploadingImg, setUploadingImg] = useState(false)
  const svcFileRef = useRef<HTMLInputElement>(null)
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

  const getDialogTitle = () => {
    if (modalMode === 'category')
      return t(editId ? 'services.editCategory' : 'services.newCategory')
    if (modalMode === 'subcategory')
      return t(editId ? 'services.editSubcategory' : 'services.newSubcategory')
    return t(editId ? 'services.editService' : 'services.newService')
  }

  const openCategoryForm = (cat?: Category) => {
    setModalMode('category')
    setParentId(null)
    if (cat) {
      setEditId(cat.id)
      setCatForm({
        name: cat.name,
        description: cat.description ?? '',
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
      })
    } else {
      setEditId(null)
      setCatForm({ name: '', description: '', sortOrder: 0, isActive: true })
    }
    setOpen(true)
  }

  const openSubcategoryForm = (categoryId: string, sub?: Subcategory) => {
    setModalMode('subcategory')
    setParentId(categoryId)
    if (sub) {
      setEditId(sub.id)
      setSubForm({
        name: sub.name,
        description: sub.description ?? '',
        sortOrder: sub.sortOrder,
        isActive: sub.isActive,
      })
    } else {
      setEditId(null)
      setSubForm({ name: '', description: '', sortOrder: 0, isActive: true })
    }
    setOpen(true)
  }

  const openServiceForm = (subcategoryId: string, svc?: Service) => {
    setModalMode('service')
    setParentId(subcategoryId)
    if (svc) {
      setEditId(svc.id)
      setSvcForm({
        name: svc.name,
        shortDescription: svc.shortDescription ?? '',
        durationMinutes: svc.durationMinutes,
        price: Number(svc.price),
        gender: svc.gender ?? 'FEMALE',
        sortOrder: svc.sortOrder,
        isActive: svc.isActive,
        heroImage: svc.heroImage ?? '',
        loyaltyEnabled: svc.loyaltyEnabled ?? false,
        loyaltyMaxDiscountPercent: svc.loyaltyMaxDiscountPercent ?? 0,
      })
    } else {
      setEditId(null)
      setSvcForm({
        name: '',
        shortDescription: '',
        durationMinutes: 30,
        price: 0,
        gender: 'FEMALE',
        sortOrder: 0,
        isActive: true,
        heroImage: '',
        loyaltyEnabled: false,
        loyaltyMaxDiscountPercent: 0,
      })
    }
    setOpen(true)
  }

  const handleUploadHeroImage = async (file: File) => {
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('assetKind', 'service')
      const { data } = await api.post('/api/uploads/public', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const path = data.pathMedium || data.pathOriginal || ''
      setSvcForm((prev) => ({ ...prev, heroImage: path }))
      success(t('services.toast.imageUploaded'))
    } catch (err) {
      showApiError(err, 'services.errors.uploadFailed')
    } finally {
      setUploadingImg(false)
      if (svcFileRef.current) svcFileRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (modalMode === 'category') {
        if (editId)
          await api.patch(`/api/services/categories/${editId}`, catForm)
        else await api.post('/api/services/categories', catForm)
      } else if (modalMode === 'subcategory') {
        if (editId)
          await api.patch(`/api/services/subcategories/${editId}`, subForm)
        else
          await api.post('/api/services/subcategories', {
            ...subForm,
            categoryId: parentId,
          })
      } else {
        if (editId) await api.patch(`/api/services/${editId}`, svcForm)
        else
          await api.post('/api/services', {
            ...svcForm,
            subcategoryId: parentId,
          })
      }
      success(t('services.toast.saved'))
      loadData()
      setOpen(false)
    } catch (err) {
      showApiError(err, 'services.errors.saveFailed')
    } finally {
      setSaving(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex justify-center p-10 text-content-muted">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  const disambiguatedName = <T extends { id: string; name: string }>(item: T, all: T[]) => {
    const matches = all.filter(candidate => candidate.name === item.name)
    return matches.length > 1 ? `${item.name} (${matches.findIndex(candidate => candidate.id === item.id) + 1})` : item.name
  }
  const allSubcategories = categories.flatMap(category => category.subcategories ?? [])
  const allServices = allSubcategories.flatMap(subcategory => subcategory.services ?? [])
  const serviceAccessibleName = (service: Service) => disambiguatedName(service, allServices)



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

      {categories.length === 0 ? (
        <p className="text-sm text-content-muted">{t('common.noData')}</p>
      ) : (
        <Card className="overflow-hidden">
          <Accordion type="multiple" className="w-full">
            {categories.map((cat) => (
              <AccordionItem key={cat.id} value={cat.id} className="px-4">
                <AccordionTrigger>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="truncate text-base font-semibold">
                      {cat.name}
                    </span>
                    <Badge
                      variant={cat.isActive ? 'success' : 'secondary'}
                      className="text-[10px]"
                    >
                      {cat.isActive
                        ? t('services.status.categoryActive')
                        : t('services.status.categoryInactive')}
                    </Badge>
                    {cat.description ? (
                      <span className="hidden truncate text-sm text-content-muted md:block">
                        — {cat.description}
                      </span>
                    ) : null}
                  </div>
                  {/* Omotač samo zaustavlja propagaciju klika, ne vrši akciju; pravi
                      interaktivni elementi su dugmad unutar njega i ona su fokusabilna,
                      pa ni 2.1.1 ni 4.1.2 nisu prekršeni. */}
                  {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
                  <div
                    className="mr-2 flex shrink-0 items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t('services.aria.addSubcategory', { name: disambiguatedName(cat, categories) })}
                      onClick={() => openSubcategoryForm(cat.id)}
                    >
                      <Plus className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t('services.aria.editCategory', { name: disambiguatedName(cat, categories) })}
                      onClick={() => openCategoryForm(cat)}
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t('services.aria.deleteCategory', { name: disambiguatedName(cat, categories) })}
                      onClick={() => void handleDeleteCategory(cat.id)}
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  {cat.subcategories?.length ? (
                    <div className="space-y-6">
                      {cat.subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="rounded-md border-l-4 border-l-brand-gold bg-surface-muted p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-content">
                                {sub.name}
                              </p>
                              <Badge
                                variant={sub.isActive ? 'success' : 'secondary'}
                                className="text-[10px]"
                              >
                                {sub.isActive
                                  ? t('services.status.categoryActive')
                                  : t('services.status.categoryInactive')}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openServiceForm(sub.id)}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                {t('services.addService')}
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                aria-label={t('services.aria.editSubcategory', { name: disambiguatedName(sub, allSubcategories) })}
                                onClick={() => openSubcategoryForm(cat.id, sub)}
                              >
                                <Pencil className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                aria-label={t(
                                  'services.aria.deleteSubcategory', { name: disambiguatedName(sub, allSubcategories) },
                                )}
                                onClick={() =>
                                  void handleDeleteSubcategory(sub.id)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            </div>
                          </div>

                          {sub.services?.length ? (
                            <div className="app-table-wrap rounded-md border border-line bg-surface  ">
                              <ServiceTable
                                rows={sub.services}
                                serviceAccessibleName={serviceAccessibleName}
                                onEdit={(service) => openServiceForm(sub.id, service)}
                                onDelete={openServiceDeletion}
                              />
                            </div>
                          ) : (
                            <p className="text-sm italic text-content-muted">
                              {t('services.noServices')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-content-muted">
                      {t('services.noSubcategories')}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}

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
