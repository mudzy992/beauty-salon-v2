import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Eye, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { formatLocalizedNumber } from '../i18n/locale-utils.mjs'
import {
  fetchAllAdminServiceCategories,
  fetchAllAdminServices,
  fetchAllAdminServiceSubcategories,
} from '../api/catalog'
import { MediaImage } from '../components/media-image'
import { getUploadUrl } from '../utils/uploadUrl'
import { useAppToast } from '../lib/toast/useAppToast'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Textarea } from '../components/ui/textarea'

interface Service {
  id: string
  subcategoryId: string
  name: string
  shortDescription: string | null
  heroImage: string | null
  durationMinutes: number
  price: number | string
  isActive: boolean
  sortOrder: number
  gender: 'MALE' | 'FEMALE'
  loyaltyEnabled?: boolean
  loyaltyMaxDiscountPercent?: number
}

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

interface ServiceDeletionImpact {
  service: { id: string; name: string; imageRetained: boolean }
  target: { id: string; name: string } | null
  reservations: { primary: number; additionalServiceItems: number }
  dailyLogs: {
    primary: number
    completed: number
    additionalServiceItems: number
    debtPaymentEntries: number
  }
  income: {
    automaticEntries: number
    automaticRevenue: number
    automaticTips: number
    manualEntries: number
    manualRevenue: number
    manualTips: number
  }
  debts: {
    count: number
    openCount: number
    amount: number
    openAmount: number
  }
  images: { dailyLogImages: number; consentRecordsRetained: number }
  pendingOutboxEvents: number
  reviews: number
  stylistLinks: number
  mergeConflicts: {
    reservationItems: number
    dailyLogItems: number
    dailyLogReservations: number
    reviews: number
    processingOutboxEvents: number
  }
  duplicateStylistLinks: number
  impactToken: string
}

type ServiceMutationAction = 'DELETE_LINKED_RECORDS' | 'MERGE'
type ModalMode = 'category' | 'subcategory' | 'service'

const selectClass =
  'flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 dark:focus-visible:ring-offset-slate-950'

export default function Services() {
  const { t, i18n } = useTranslation()
  const { success, error } = useAppToast()
  const showApiError = useCallback(
    (err: unknown, fallbackKey: string) => {
      error(t(resolveAdminApiErrorKey(getErrorMessage(err, ''), fallbackKey)))
    },
    [error, t],
  )

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm(t('services.confirmDeleteCategory'))) return
    try {
      await api.delete(`/api/services/categories/${id}`)
      success(t('services.toast.categoryDeleted'))
      loadData()
    } catch (err) {
      showApiError(err, 'services.errors.deleteCategoryFailed')
    }
  }

  const handleDeleteSubcategory = async (id: string) => {
    if (!window.confirm(t('services.confirmDeleteSubcategory'))) return
    try {
      await api.delete(`/api/services/subcategories/${id}`)
      success(t('services.toast.subcategoryDeleted'))
      loadData()
    } catch (err) {
      showApiError(err, 'services.errors.deleteSubcategoryFailed')
    }
  }

  const loadDeletionImpact = async (
    serviceId: string,
    targetServiceId?: string,
  ) => {
    setDeletionLoading(true)
    setDeletionLoadError(false)
    try {
      const { data } = await api.get<ServiceDeletionImpact>(
        `/api/services/admin/services/${serviceId}/deletion-impact`,
        { params: targetServiceId ? { targetServiceId } : undefined },
      )
      setDeletionImpact(data)
    } catch (err) {
      setDeletionImpact(null)
      setDeletionLoadError(true)
      showApiError(err, 'services.errors.deleteServiceFailed')
    } finally {
      setDeletionLoading(false)
    }
  }

  const openServiceDeletion = (service: Service) => {
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
    if (!deletionService || !deletionImpact) return
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
      success(
        t(
          deletionAction === 'MERGE'
            ? 'services.toast.serviceMerged'
            : 'services.toast.serviceDeleted',
        ),
      )
      setDeletionOpen(false)
      setDeletionService(null)
      setDeletionImpact(null)
      loadData()
    } catch (err) {
      showApiError(err, 'services.errors.deleteServiceFailed')
      if (deletionService) {
        void loadDeletionImpact(
          deletionService.id,
          deletionAction === 'MERGE' ? deletionTargetId : undefined,
        )
      }
    } finally {
      setDeletionSaving(false)
    }
  }

  const selectDeletionAction = (action: ServiceMutationAction) => {
    setDeletionAction(action)
    setDeletionImpact(null)
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
      <div className="flex justify-center p-10 text-slate-500">
        <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
          {t('nav.services')}
        </h1>
        <Button type="button" onClick={() => openCategoryForm()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('services.newCategory')}
        </Button>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">{t('common.noData')}</p>
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
                      <span className="hidden truncate text-sm text-slate-500 md:block">
                        — {cat.description}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="mr-2 flex shrink-0 items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t('services.aria.addSubcategory')}
                      onClick={() => openSubcategoryForm(cat.id)}
                    >
                      <Plus className="h-4 w-4 text-emerald-600" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t('services.aria.editCategory')}
                      onClick={() => openCategoryForm(cat)}
                    >
                      <Pencil className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t('services.aria.deleteCategory')}
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
                          className="rounded-md border-l-4 border-l-brand-gold bg-slate-50 p-4 dark:bg-slate-900/40"
                        >
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-800 dark:text-slate-100">
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
                                aria-label={t('services.aria.editSubcategory')}
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
                                  'services.aria.deleteSubcategory',
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
                            <div className="app-table-wrap rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                              <table className="app-table data-table w-full border-collapse">
                                <caption className="sr-only">{t('services.tableCaption')}</caption>
                                <thead>
                                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                                    <th scope="col" className="p-3 font-medium">
                                      {t('services.table.service')}
                                    </th>
                                    <th scope="col" className="hidden p-3 font-medium md:table-cell">
                                      {t('services.table.description')}
                                    </th>
                                    <th scope="col" className="p-3 text-right font-medium">
                                      {t('services.table.duration')}
                                    </th>
                                    <th scope="col" className="p-3 text-right font-medium">
                                      {t('services.table.price')}
                                    </th>
                                    <th scope="col" className="p-3 font-medium">
                                      {t('services.table.gender')}
                                    </th>
                                    <th scope="col" className="p-3 font-medium">
                                      {t('services.table.loyalty')}
                                    </th>
                                    <th scope="col" className="p-3 font-medium">
                                      {t('services.table.status')}
                                    </th>
                                    <th scope="col" className="p-3 text-right font-medium">
                                      {t('services.table.actions')}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sub.services.map((s) => (
                                    <tr
                                      key={s.id}
                                      className="border-b border-slate-100 dark:border-slate-800/80"
                                    >
                                      <td data-label={t('services.table.service')} className="p-3 font-medium">
                                        {s.name}
                                      </td>
                                      <td data-label={t('services.table.description')} className="hidden max-w-[260px] truncate p-3 text-slate-600 dark:text-slate-300 md:table-cell">
                                        {s.shortDescription ?? '-'}
                                      </td>
                                      <td data-label={t('services.table.duration')} className="p-3 text-right tabular-nums">
                                        {t('services.durationValue', {
                                          count: s.durationMinutes,
                                        })}
                                      </td>
                                      <td data-label={t('services.table.price')} className="p-3 text-right tabular-nums">
                                        {formatLocalizedNumber(
                                          s.price,
                                          i18n.language,
                                          {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          },
                                        )}
                                      </td>
                                      <td data-label={t('services.table.gender')} className="p-3">
                                        <Badge
                                          variant={
                                            s.gender === 'MALE'
                                              ? 'secondary'
                                              : 'brand'
                                          }
                                          className="text-[10px]"
                                        >
                                          {s.gender === 'MALE'
                                            ? t('users.gender.male')
                                            : t('users.gender.female')}
                                        </Badge>
                                      </td>
                                      <td data-label={t('services.table.loyalty')} className="p-3">
                                        {s.loyaltyEnabled ? (
                                          <Badge
                                            variant="brand"
                                            className="text-[10px]"
                                          >
                                            {t('services.loyaltyDiscount', {
                                              percent: formatLocalizedNumber(
                                                s.loyaltyMaxDiscountPercent ??
                                                  0,
                                                i18n.language,
                                              ),
                                            })}
                                          </Badge>
                                        ) : (
                                          <Badge
                                            variant="secondary"
                                            className="text-[10px]"
                                          >
                                            {t('services.withoutLoyalty')}
                                          </Badge>
                                        )}
                                      </td>
                                      <td data-label={t('services.table.status')} className="p-3">
                                        <Badge
                                          variant={
                                            s.isActive ? 'success' : 'secondary'
                                          }
                                          className="text-[10px]"
                                        >
                                          {s.isActive
                                            ? t('services.status.serviceActive')
                                            : t(
                                                'services.status.serviceInactive',
                                              )}
                                        </Badge>
                                      </td>
                                      <td data-label={t('services.table.actions')} className="p-3 text-right">
                                        <div className="flex justify-end gap-1">
                                          <Button
                                            asChild
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            aria-label={t(
                                              'services.aria.workGallery',
                                            )}
                                          >
                                            <RouterLink
                                              to={`/admin/services/${s.id}/work-gallery`}
                                            >
                                              <Eye className="h-4 w-4 text-purple-600" />
                                            </RouterLink>
                                          </Button>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            aria-label={t(
                                              'services.aria.editService',
                                            )}
                                            onClick={() =>
                                              openServiceForm(sub.id, s)
                                            }
                                          >
                                            <Pencil className="h-4 w-4 text-blue-600" />
                                          </Button>
                                          <Button
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            aria-label={t(
                                              'services.aria.deleteService',
                                            )}
                                            onClick={() =>
                                              openServiceDeletion(s)
                                            }
                                          >
                                            <Trash2 className="h-4 w-4 text-rose-600" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-sm italic text-slate-500">
                              {t('services.noServices')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-slate-500">
                      {t('services.noSubcategories')}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className={modalMode === 'service' ? 'max-w-2xl' : 'max-w-lg'}
        >
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>

          {modalMode === 'category' ? (
            <div className="space-y-4">
              <div>
                <Label>{t('common.name')}</Label>
                <Input
                  className="mt-1"
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({ ...catForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('common.description')}</Label>
                <Textarea
                  className="mt-1"
                  value={catForm.description}
                  onChange={(e) =>
                    setCatForm({ ...catForm, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('services.sortOrder')}</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    value={catForm.sortOrder}
                    onChange={(e) =>
                      setCatForm({
                        ...catForm,
                        sortOrder: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3 md:pt-7">
                  <Label className="mb-0">
                    {t('services.status.categoryActive')}
                  </Label>
                  <Switch
                    aria-label={t('services.aria.categoryActiveToggle')}
                    checked={catForm.isActive}
                    onCheckedChange={(checked) =>
                      setCatForm({ ...catForm, isActive: checked })
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {modalMode === 'subcategory' ? (
            <div className="space-y-4">
              <div>
                <Label>{t('common.name')}</Label>
                <Input
                  className="mt-1"
                  value={subForm.name}
                  onChange={(e) =>
                    setSubForm({ ...subForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('common.description')}</Label>
                <Textarea
                  className="mt-1"
                  value={subForm.description}
                  onChange={(e) =>
                    setSubForm({ ...subForm, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('services.sortOrder')}</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    value={subForm.sortOrder}
                    onChange={(e) =>
                      setSubForm({
                        ...subForm,
                        sortOrder: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3 md:pt-7">
                  <Label className="mb-0">
                    {t('services.status.categoryActive')}
                  </Label>
                  <Switch
                    aria-label={t('services.aria.subcategoryActiveToggle')}
                    checked={subForm.isActive}
                    onCheckedChange={(checked) =>
                      setSubForm({ ...subForm, isActive: checked })
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {modalMode === 'service' ? (
            <div className="space-y-4">
              <div>
                <Label>{t('services.serviceName')}</Label>
                <Input
                  className="mt-1"
                  value={svcForm.name}
                  onChange={(e) =>
                    setSvcForm({ ...svcForm, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('services.shortDescription')}</Label>
                <Textarea
                  className="mt-1"
                  value={svcForm.shortDescription}
                  onChange={(e) =>
                    setSvcForm({ ...svcForm, shortDescription: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div>
                <Label>{t('services.heroImage')}</Label>
                <MediaImage
                  src={getUploadUrl(svcForm.heroImage)}
                  alt={t('services.heroImage')}
                  className="mt-2 max-h-32 w-full rounded-md object-cover"
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={svcFileRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleUploadHeroImage(file)
                  }}
                />
                <div className="mt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => svcFileRef.current?.click()}
                    disabled={uploadingImg}
                  >
                    {uploadingImg ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {svcForm.heroImage
                      ? t('services.changeImage')
                      : t('services.uploadImage')}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('services.duration')}</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={5}
                    max={480}
                    step={5}
                    value={svcForm.durationMinutes}
                    onChange={(e) =>
                      setSvcForm({
                        ...svcForm,
                        durationMinutes: Number(e.target.value) || 15,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>{t('services.price')}</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    step={0.5}
                    value={svcForm.price}
                    onChange={(e) =>
                      setSvcForm({
                        ...svcForm,
                        price: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('services.gender')}</Label>
                  <select
                    className={`${selectClass} mt-1`}
                    value={svcForm.gender}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      setSvcForm({
                        ...svcForm,
                        gender: e.target.value as 'MALE' | 'FEMALE',
                      })
                    }
                  >
                    <option value="FEMALE">{t('users.gender.female')}</option>
                    <option value="MALE">{t('users.gender.male')}</option>
                  </select>
                </div>
                <div>
                  <Label>{t('services.sortOrder')}</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    value={svcForm.sortOrder}
                    onChange={(e) =>
                      setSvcForm({
                        ...svcForm,
                        sortOrder: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">
                    {t('services.status.serviceActive')}
                  </Label>
                  <Switch
                    aria-label={t('services.aria.serviceActiveToggle')}
                    checked={svcForm.isActive}
                    onCheckedChange={(checked) =>
                      setSvcForm({ ...svcForm, isActive: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">{t('services.loyalty')}</Label>
                  <Switch
                    aria-label={t('services.aria.loyaltyToggle')}
                    checked={svcForm.loyaltyEnabled}
                    onCheckedChange={(checked) =>
                      setSvcForm({ ...svcForm, loyaltyEnabled: checked })
                    }
                  />
                </div>
              </div>

              {svcForm.loyaltyEnabled ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label>{t('services.maxDiscount')}</Label>
                    <Input
                      className="mt-1"
                      type="number"
                      min={0}
                      max={100}
                      value={svcForm.loyaltyMaxDiscountPercent}
                      onChange={(e) =>
                        setSvcForm({
                          ...svcForm,
                          loyaltyMaxDiscountPercent:
                            Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deletionOpen} onOpenChange={setDeletionOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('services.deletion.title')}</DialogTitle>
          </DialogHeader>
          {deletionService ? (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t('services.deletion.description', {
                  service: deletionService.name,
                })}
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={deletionAction === 'DELETE_LINKED_RECORDS'}
                  onClick={() => selectDeletionAction('DELETE_LINKED_RECORDS')}
                  className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring ${deletionAction === 'DELETE_LINKED_RECORDS' ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <span className="block text-sm font-semibold text-rose-700 dark:text-rose-300">
                    {t('services.deletion.deleteMode')}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {t('services.deletion.deleteModeDescription')}
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={deletionAction === 'MERGE'}
                  onClick={() => selectDeletionAction('MERGE')}
                  className={`rounded-xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring ${deletionAction === 'MERGE' ? 'border-brand-gold-ring bg-amber-50 dark:bg-amber-950/20' : 'border-slate-200 dark:border-slate-700'}`}
                >
                  <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {t('services.deletion.mergeMode')}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {t('services.deletion.mergeModeDescription')}
                  </span>
                </button>
              </div>

              {deletionAction === 'MERGE' ? (
                <div>
                  <Label htmlFor="service-merge-target">
                    {t('services.deletion.targetService')}
                  </Label>
                  <select
                    id="service-merge-target"
                    className={`${selectClass} mt-1`}
                    value={deletionTargetId}
                    onChange={(event) => {
                      const targetId = event.target.value
                      setDeletionTargetId(targetId)
                      setDeletionImpact(null)
                      if (targetId)
                        void loadDeletionImpact(deletionService.id, targetId)
                    }}
                  >
                    <option value="">
                      {t('services.deletion.chooseTarget')}
                    </option>
                    {availableMergeTargets.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {deletionLoading ? (
                <div
                  role="status"
                  aria-live="polite"
                  className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
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
                    onClick={() =>
                      void loadDeletionImpact(
                        deletionService.id,
                        deletionAction === 'MERGE'
                          ? deletionTargetId
                          : undefined,
                      )
                    }
                  >
                    {t('services.deletion.retryImpact')}
                  </Button>
                </div>
              ) : deletionImpact ? (
                <section
                  aria-labelledby="service-deletion-impact-title"
                  className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <h3
                    id="service-deletion-impact-title"
                    className="text-sm font-semibold text-slate-900 dark:text-slate-50"
                  >
                    {t('services.deletion.impactTitle')}
                  </h3>
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.primaryReservations')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.reservations.primary}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>
                        {t('services.deletion.additionalReservationItems')}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.reservations.additionalServiceItems}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.dailyLogs')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.dailyLogs.primary}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.completedLogs')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.dailyLogs.completed}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.additionalDailyLogItems')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.dailyLogs.additionalServiceItems}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.debtPaymentEntries')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.dailyLogs.debtPaymentEntries}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.automaticIncomeEntries')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.income.automaticEntries}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.manualIncomeEntries')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.income.manualEntries}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.debts')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.debts.count}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.openDebts')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.debts.openCount}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.reviews')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.reviews}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.stylistLinks')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.stylistLinks}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.serviceImage')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.service.imageRetained ? 1 : 0}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>
                        {t(
                          deletionAction === 'MERGE'
                            ? 'services.deletion.dailyLogImagesMerge'
                            : 'services.deletion.dailyLogImages',
                        )}
                      </dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.images.dailyLogImages}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.imageConsentRecords')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.images.consentRecordsRetained}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>{t('services.deletion.pendingOutboxEvents')}</dt>
                      <dd className="font-semibold tabular-nums">
                        {deletionImpact.pendingOutboxEvents}
                      </dd>
                    </div>
                  </dl>

                  <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900">
                    <p>
                      {t(
                        deletionAction === 'MERGE'
                          ? 'services.deletion.automaticIncomeSummaryMerge'
                          : 'services.deletion.automaticIncomeSummary',
                        {
                          revenue: formatLocalizedNumber(
                            deletionImpact.income.automaticRevenue,
                            i18n.language,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          ),
                          tips: formatLocalizedNumber(
                            deletionImpact.income.automaticTips,
                            i18n.language,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          ),
                        },
                      )}
                    </p>
                    <p className="mt-1">
                      {t(
                        deletionAction === 'MERGE'
                          ? 'services.deletion.manualIncomeSummaryMerge'
                          : 'services.deletion.manualIncomeSummary',
                        {
                          revenue: formatLocalizedNumber(
                            deletionImpact.income.manualRevenue,
                            i18n.language,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          ),
                          tips: formatLocalizedNumber(
                            deletionImpact.income.manualTips,
                            i18n.language,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          ),
                        },
                      )}
                    </p>
                    <p className="mt-1">
                      {t(
                        deletionAction === 'MERGE'
                          ? 'services.deletion.totalDebtAmountMerge'
                          : 'services.deletion.totalDebtAmount',
                        {
                          amount: formatLocalizedNumber(
                            deletionImpact.debts.amount,
                            i18n.language,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          ),
                        },
                      )}
                    </p>
                    <p className="mt-1 font-medium">
                      {t(
                        deletionAction === 'MERGE'
                          ? 'services.deletion.openDebtAmountMerge'
                          : 'services.deletion.openDebtAmount',
                        {
                          amount: formatLocalizedNumber(
                            deletionImpact.debts.openAmount,
                            i18n.language,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          ),
                        },
                      )}
                    </p>
                  </div>

                  {deletionAction === 'DELETE_LINKED_RECORDS' ? (
                    <div className="flex gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-100">
                      <AlertTriangle
                        className="mt-0.5 h-5 w-5 shrink-0"
                        aria-hidden="true"
                      />
                      <div>
                        <p>{t('services.deletion.permanentWarning')}</p>
                        {hasProcessingOutboxEvents ? (
                          <p role="alert" className="mt-2 font-semibold">
                            {t('services.deletion.processingOutboxWarning')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
                      <p>
                        {t('services.deletion.mergeSummary', {
                          target: deletionImpact.target?.name ?? '',
                          stylistDuplicates:
                            deletionImpact.duplicateStylistLinks,
                        })}
                      </p>
                      {hasMergeConflicts ? (
                        <div role="alert" className="flex gap-2 font-medium">
                          <AlertTriangle
                            className="h-5 w-5 shrink-0"
                            aria-hidden="true"
                          />
                          <span>
                            {t('services.deletion.mergeConflicts', {
                              reservationItems:
                                deletionImpact.mergeConflicts.reservationItems,
                              dailyLogItems:
                                deletionImpact.mergeConflicts.dailyLogItems,
                              dailyLogReservations:
                                deletionImpact.mergeConflicts
                                  .dailyLogReservations,
                              reviews: deletionImpact.mergeConflicts.reviews,
                              processingOutboxEvents:
                                deletionImpact.mergeConflicts
                                  .processingOutboxEvents,
                            })}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>
              ) : null}

              <div>
                <Label htmlFor="service-delete-confirmation">
                  {t('services.deletion.confirmNameLabel')}
                </Label>
                <Input
                  id="service-delete-confirmation"
                  className="mt-1"
                  autoComplete="off"
                  value={deletionConfirmationName}
                  onChange={(event) =>
                    setDeletionConfirmationName(event.target.value)
                  }
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
              onClick={() => setDeletionOpen(false)}
              disabled={deletionSaving}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant={
                deletionAction === 'DELETE_LINKED_RECORDS'
                  ? 'destructive'
                  : 'default'
              }
              onClick={() => void handleServiceMutation()}
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
    </div>
  )
}
