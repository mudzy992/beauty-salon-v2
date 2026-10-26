import { type ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { resolveAdminApiErrorKey } from '../features/admin/admin-api-error.mjs'
import { formatLocalizedNumber } from '../i18n/locale-utils.mjs'
import {
  fetchAllPublicServiceCategories,
  fetchAllPublicServices,
  fetchAllPublicServiceSubcategories,
} from '../api/catalog'
import { MediaImage } from '../components/media-image'
import { getUploadUrl } from '../utils/uploadUrl'
import { useAppToast } from '../lib/toast/useAppToast'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
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

  const [catForm, setCatForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true })
  const [subForm, setSubForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true })
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

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetchAllPublicServiceCategories<Category>(),
      fetchAllPublicServiceSubcategories<Subcategory>(),
      fetchAllPublicServices<Service>(),
    ])
      .then(([categoryList, subcategoryList, serviceList]) => {
        const subcategoriesById = new Map(
          subcategoryList.map((subcategory) => [subcategory.id, { ...subcategory, services: [] as Service[] }]),
        )
        serviceList.forEach((service) => {
          subcategoriesById.get(service.subcategoryId)?.services.push(service)
        })
        setCategories(
          categoryList.map((category) => ({
            ...category,
            subcategories: subcategoryList
              .filter((subcategory) => subcategory.categoryId === category.id)
              .map((subcategory) => subcategoriesById.get(subcategory.id) ?? subcategory),
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
    if (modalMode === 'category') return t(editId ? 'services.editCategory' : 'services.newCategory')
    if (modalMode === 'subcategory') return t(editId ? 'services.editSubcategory' : 'services.newSubcategory')
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
        if (editId) await api.patch(`/api/services/categories/${editId}`, catForm)
        else await api.post('/api/services/categories', catForm)
      } else if (modalMode === 'subcategory') {
        if (editId) await api.patch(`/api/services/subcategories/${editId}`, subForm)
        else await api.post('/api/services/subcategories', { ...subForm, categoryId: parentId })
      } else {
        if (editId) await api.patch(`/api/services/${editId}`, svcForm)
        else await api.post('/api/services', { ...svcForm, subcategoryId: parentId })
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

  const handleDeleteService = async (id: string) => {
    if (!window.confirm(t('services.confirmDeleteService'))) return
    try {
      await api.delete(`/api/services/${id}`)
      success(t('services.toast.serviceDeleted'))
      loadData()
    } catch (err) {
      showApiError(err, 'services.errors.deleteServiceFailed')
    }
  }

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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.services')}</h1>
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
                    <span className="truncate text-base font-semibold">{cat.name}</span>
                    <Badge variant={cat.isActive ? 'success' : 'secondary'} className="text-[10px]">
                      {cat.isActive ? t('services.status.categoryActive') : t('services.status.categoryInactive')}
                    </Badge>
                    {cat.description ? (
                      <span className="hidden truncate text-sm text-slate-500 md:block">— {cat.description}</span>
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
                              <p className="font-semibold text-slate-800 dark:text-slate-100">{sub.name}</p>
                              <Badge variant={sub.isActive ? 'success' : 'secondary'} className="text-[10px]">
                                {sub.isActive ? t('services.status.categoryActive') : t('services.status.categoryInactive')}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => openServiceForm(sub.id)}>
                                <Plus className="mr-2 h-4 w-4" />
                                {t('services.addService')}
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('services.aria.editSubcategory')} onClick={() => openSubcategoryForm(cat.id, sub)}>
                                <Pencil className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('services.aria.deleteSubcategory')} onClick={() => void handleDeleteSubcategory(sub.id)}>
                                <Trash2 className="h-4 w-4 text-rose-600" />
                              </Button>
                            </div>
                          </div>

                          {sub.services?.length ? (
                            <div className="app-table-wrap rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                              <table className="app-table w-full border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                                    <th className="p-3 font-medium">{t('services.table.service')}</th>
                                    <th className="hidden p-3 font-medium md:table-cell">{t('services.table.description')}</th>
                                    <th className="p-3 text-right font-medium">{t('services.table.duration')}</th>
                                    <th className="p-3 text-right font-medium">{t('services.table.price')}</th>
                                    <th className="p-3 font-medium">{t('services.table.gender')}</th>
                                    <th className="p-3 font-medium">{t('services.table.loyalty')}</th>
                                    <th className="p-3 font-medium">{t('services.table.status')}</th>
                                    <th className="p-3 text-right font-medium">{t('services.table.actions')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sub.services.map((s) => (
                                    <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/80">
                                      <td className="p-3 font-medium">{s.name}</td>
                                      <td className="hidden max-w-[260px] truncate p-3 text-slate-600 dark:text-slate-300 md:table-cell">
                                        {s.shortDescription ?? '-'}
                                      </td>
                                      <td className="p-3 text-right tabular-nums">{t('services.durationValue', { count: s.durationMinutes })}</td>
                                      <td className="p-3 text-right tabular-nums">{formatLocalizedNumber(s.price, i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                      <td className="p-3">
                                        <Badge variant={s.gender === 'MALE' ? 'secondary' : 'brand'} className="text-[10px]">
                                          {s.gender === 'MALE' ? t('users.gender.male') : t('users.gender.female')}
                                        </Badge>
                                      </td>
                                      <td className="p-3">
                                        {s.loyaltyEnabled ? (
                                          <Badge variant="brand" className="text-[10px]">
                                            {t('services.loyaltyDiscount', { percent: formatLocalizedNumber(s.loyaltyMaxDiscountPercent ?? 0, i18n.language) })}
                                          </Badge>
                                        ) : (
                                          <Badge variant="secondary" className="text-[10px]">
                                            {t('services.withoutLoyalty')}
                                          </Badge>
                                        )}
                                      </td>
                                      <td className="p-3">
                                        <Badge variant={s.isActive ? 'success' : 'secondary'} className="text-[10px]">
                                          {s.isActive ? t('services.status.serviceActive') : t('services.status.serviceInactive')}
                                        </Badge>
                                      </td>
                                      <td className="p-3 text-right">
                                        <div className="flex justify-end gap-1">
                                          <Button
                                            asChild
                                            type="button"
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            aria-label={t('services.aria.workGallery')}
                                          >
                                            <RouterLink to={`/admin/services/${s.id}/work-gallery`}>
                                              <Eye className="h-4 w-4 text-purple-600" />
                                            </RouterLink>
                                          </Button>
                                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('services.aria.editService')} onClick={() => openServiceForm(sub.id, s)}>
                                            <Pencil className="h-4 w-4 text-blue-600" />
                                          </Button>
                                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('services.aria.deleteService')} onClick={() => void handleDeleteService(s.id)}>
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
                            <p className="text-sm italic text-slate-500">{t('services.noServices')}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-slate-500">{t('services.noSubcategories')}</p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={modalMode === 'service' ? 'max-w-2xl' : 'max-w-lg'}>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>

          {modalMode === 'category' ? (
            <div className="space-y-4">
              <div>
                <Label>{t('common.name')}</Label>
                <Input className="mt-1" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
              </div>
              <div>
                <Label>{t('common.description')}</Label>
                <Textarea className="mt-1" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('services.sortOrder')}</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    value={catForm.sortOrder}
                    onChange={(e) => setCatForm({ ...catForm, sortOrder: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 md:pt-7">
                  <Label className="mb-0">{t('services.status.categoryActive')}</Label>
                  <Switch checked={catForm.isActive} onCheckedChange={(checked) => setCatForm({ ...catForm, isActive: checked })} />
                </div>
              </div>
            </div>
          ) : null}

          {modalMode === 'subcategory' ? (
            <div className="space-y-4">
              <div>
                <Label>{t('common.name')}</Label>
                <Input className="mt-1" value={subForm.name} onChange={(e) => setSubForm({ ...subForm, name: e.target.value })} />
              </div>
              <div>
                <Label>{t('common.description')}</Label>
                <Textarea className="mt-1" value={subForm.description} onChange={(e) => setSubForm({ ...subForm, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('services.sortOrder')}</Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min={0}
                    value={subForm.sortOrder}
                    onChange={(e) => setSubForm({ ...subForm, sortOrder: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 md:pt-7">
                  <Label className="mb-0">{t('services.status.categoryActive')}</Label>
                  <Switch checked={subForm.isActive} onCheckedChange={(checked) => setSubForm({ ...subForm, isActive: checked })} />
                </div>
              </div>
            </div>
          ) : null}

          {modalMode === 'service' ? (
            <div className="space-y-4">
              <div>
                <Label>{t('services.serviceName')}</Label>
                <Input className="mt-1" value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} />
              </div>
              <div>
                <Label>{t('services.shortDescription')}</Label>
                <Textarea className="mt-1" value={svcForm.shortDescription} onChange={(e) => setSvcForm({ ...svcForm, shortDescription: e.target.value })} rows={2} />
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
                  <Button type="button" size="sm" variant="outline" onClick={() => svcFileRef.current?.click()} disabled={uploadingImg}>
                    {uploadingImg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {svcForm.heroImage ? t('services.changeImage') : t('services.uploadImage')}
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
                    onChange={(e) => setSvcForm({ ...svcForm, durationMinutes: Number(e.target.value) || 15 })}
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
                    onChange={(e) => setSvcForm({ ...svcForm, price: Number(e.target.value) || 0 })}
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
                      setSvcForm({ ...svcForm, gender: e.target.value as 'MALE' | 'FEMALE' })
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
                    onChange={(e) => setSvcForm({ ...svcForm, sortOrder: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">{t('services.status.serviceActive')}</Label>
                  <Switch checked={svcForm.isActive} onCheckedChange={(checked) => setSvcForm({ ...svcForm, isActive: checked })} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Label className="mb-0">{t('services.loyalty')}</Label>
                  <Switch checked={svcForm.loyaltyEnabled} onCheckedChange={(checked) => setSvcForm({ ...svcForm, loyaltyEnabled: checked })} />
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
                        setSvcForm({ ...svcForm, loyaltyMaxDiscountPercent: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

