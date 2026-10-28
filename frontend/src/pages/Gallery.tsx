import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

import api from '../api/client'
import { formatDateOnlyLocale } from '../../../shared/business-date.mjs'
import { getIntlLocale } from '../i18n/locale-utils.mjs'
import { MediaImage } from '../components/media-image'
import { getUploadUrl } from '../utils/uploadUrl'
import { useAppToast } from '../lib/toast/useAppToast'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'

interface GalleryImage {
  id: string
  title: string | null
  description: string | null
  sortOrder: number
  uploadId?: string
  upload?: { pathOriginal: string; pathThumb: string | null; pathMedium: string | null }
}

interface GalleryCategory {
  id: string
  name: string
  description: string | null
  sortOrder: number
  autoPublishConsentedPairs: boolean
  _count?: { images: number }
  images?: GalleryImage[]
}

interface EligibleGalleryImage {
  imageId: string
  uploadId: string
  consentId: string
  isBefore: boolean
  isAfter: boolean
  serviceName: string
  serviceDate: string
  previewUrl: string
}

export default function Gallery() {
  const { t, i18n } = useTranslation()
  const { success, error, warning } = useAppToast()

  const [categories, setCategories] = useState<GalleryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [catImages, setCatImages] = useState<GalleryImage[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)

  const [catOpen, setCatOpen] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    sortOrder: 0,
    autoPublishConsentedPairs: false,
  })

  const [addImageOpen, setAddImageOpen] = useState(false)
  const [eligibleImages, setEligibleImages] = useState<EligibleGalleryImage[]>([])
  const [eligibleLoading, setEligibleLoading] = useState(false)
  const [eligibleSelectedId, setEligibleSelectedId] = useState<string | null>(null)
  const [manualFile, setManualFile] = useState<File | null>(null)
  const [manualTitle, setManualTitle] = useState('')
  const [nonClientConfirmed, setNonClientConfirmed] = useState(false)
  const [addingImage, setAddingImage] = useState(false)

  const [imgOpen, setImgOpen] = useState(false)
  const [editImgId, setEditImgId] = useState<string | null>(null)
  const [imgForm, setImgForm] = useState({ title: '', description: '', sortOrder: 0 })

  const loadCategories = useCallback(() => {
    setLoading(true)
    api
      .get<GalleryCategory[]>('/api/gallery/categories')
      .then((r) => setCategories(Array.isArray(r.data) ? r.data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const loadImages = useCallback(async (catId: string) => {
    setSelectedCatId(catId)
    setImagesLoading(true)
    try {
      const { data } = await api.get<GalleryCategory>(`/api/gallery/categories/${catId}`)
      setCatImages(data.images ?? [])
    } catch {
      setCatImages([])
    } finally {
      setImagesLoading(false)
    }
  }, [])

  const openCatForm = (c?: GalleryCategory) => {
    if (c) {
      setEditCatId(c.id)
      setCatForm({
        name: c.name,
        description: c.description ?? '',
        sortOrder: c.sortOrder,
        autoPublishConsentedPairs: c.autoPublishConsentedPairs,
      })
    } else {
      setEditCatId(null)
      setCatForm({
        name: '',
        description: '',
        sortOrder: 0,
        autoPublishConsentedPairs: false,
      })
    }
    setCatOpen(true)
  }

  const handleSaveCat = async () => {
    if (!catForm.name.trim()) {
      warning(t('gallery.admin.categoryNameRequired'))
      return
    }
    const activeAutoCategory = categories.find(
      (category) => category.autoPublishConsentedPairs && category.id !== editCatId,
    )
    if (catForm.autoPublishConsentedPairs && activeAutoCategory) {
      warning(
        t('gallery.admin.duplicateAutoCategory', { name: activeAutoCategory.name }),
      )
      return
    }
    setSaving(true)
    try {
      if (editCatId) await api.patch(`/api/gallery/categories/${editCatId}`, catForm)
      else await api.post('/api/gallery/categories', catForm)
      success(t('gallery.admin.saved'))
      loadCategories()
      setCatOpen(false)
    } catch (err: any) {
      const message = err?.response?.data?.message
      error(Array.isArray(message) ? message.join(' ') : message || t('gallery.admin.genericError'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCat = async (id: string) => {
    if (!window.confirm(t('gallery.admin.deleteCategoryConfirm'))) return
    try {
      await api.delete(`/api/gallery/categories/${id}`)
      success(t('gallery.admin.categoryDeleted'))
      if (selectedCatId === id) {
        setSelectedCatId(null)
        setCatImages([])
      }
      loadCategories()
    } catch {
      error(t('gallery.admin.genericError'))
    }
  }

  const openImgEdit = (img: GalleryImage) => {
    setEditImgId(img.id)
    setImgForm({ title: img.title ?? '', description: img.description ?? '', sortOrder: img.sortOrder })
    setImgOpen(true)
  }

  const handleSaveImg = async () => {
    if (!editImgId) return
    setSaving(true)
    try {
      await api.patch(`/api/gallery/images/${editImgId}`, imgForm)
      success(t('gallery.admin.saved'))
      if (selectedCatId) await loadImages(selectedCatId)
      setImgOpen(false)
    } catch {
      error(t('gallery.admin.genericError'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteImg = async (id: string) => {
    if (!window.confirm(t('gallery.admin.deleteImageConfirm'))) return
    try {
      await api.delete(`/api/gallery/images/${id}`)
      success(t('gallery.admin.imageDeleted'))
      if (selectedCatId) await loadImages(selectedCatId)
      loadCategories()
    } catch {
      error(t('gallery.admin.genericError'))
    }
  }

  const openAddImage = async () => {
    if (!selectedCatId) {
      warning(t('gallery.admin.selectCategoryFirst'))
      return
    }
    setAddImageOpen(true)
    setEligibleLoading(true)
    setEligibleSelectedId(null)
    setManualFile(null)
    setManualTitle('')
    setNonClientConfirmed(false)
    try {
      const { data } = await api.get<EligibleGalleryImage[]>(
        '/api/gallery/eligible-consented-images',
      )
      setEligibleImages(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setEligibleImages([])
      const message = err?.response?.data?.message
      error(Array.isArray(message) ? message.join(' ') : message || t('gallery.admin.eligibleImagesLoadFailed'))
    } finally {
      setEligibleLoading(false)
    }
  }

  const handleAddConsentedImage = async () => {
    const selected = eligibleImages.find((image) => image.imageId === eligibleSelectedId)
    if (!selected || !selectedCatId) return
    setAddingImage(true)
    try {
      await api.post('/api/gallery/images', {
        categoryId: selectedCatId,
        uploadId: selected.uploadId,
      })
      success(t('gallery.admin.consentedImageAdded'))
      await loadImages(selectedCatId)
      loadCategories()
      setAddImageOpen(false)
    } catch (err: any) {
      const message = err?.response?.data?.message
      error(Array.isArray(message) ? message.join(' ') : message || t('gallery.admin.consentedImageAddFailed'))
    } finally {
      setAddingImage(false)
    }
  }

  const handleUploadNonClientImage = async () => {
    if (!manualFile || !selectedCatId || !nonClientConfirmed) return
    setAddingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', manualFile)
      formData.append('nonClientAssetConfirmed', 'true')
      if (manualTitle.trim()) formData.append('title', manualTitle.trim())
      await api.post(
        `/api/gallery/categories/${selectedCatId}/images/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      )
      success(t('gallery.admin.nonClientImageAdded'))
      await loadImages(selectedCatId)
      loadCategories()
      setAddImageOpen(false)
    } catch (err: any) {
      const message = err?.response?.data?.message
      error(Array.isArray(message) ? message.join(' ') : message || t('gallery.admin.nonClientImageUploadFailed'))
    } finally {
      setAddingImage(false)
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.gallery')}</h1>
        <Button type="button" onClick={() => openCatForm()}>
          <Plus className="mr-2 h-4 w-4" />
          {t('gallery.admin.newCategory')}
        </Button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="w-full lg:w-[300px] lg:min-w-[280px]">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-500">{t('common.noData')}</p>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => (
                <Card
                  key={c.id}
                  className={[
                    'cursor-pointer p-4 transition-shadow hover:shadow-md',
                    selectedCatId === c.id ? 'border-brand-gold-ring bg-brand-champagne/10' : '',
                  ].join(' ')}
                  onClick={() => void loadImages(c.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 dark:text-slate-50">{c.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {c.autoPublishConsentedPairs
                          ? t('gallery.admin.autoCategorySummary', { count: c._count?.images ?? 0 })
                          : t('gallery.admin.imageCount', { count: c._count?.images ?? 0 })}{' '}
                        | {t('gallery.admin.sortOrderValue', { value: c.sortOrder })}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('gallery.admin.edit')} onClick={() => openCatForm(c)}>
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('gallery.admin.delete')} onClick={() => void handleDeleteCat(c.id)}>
                        <Trash2 className="h-4 w-4 text-rose-600" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          {!selectedCatId ? (
            <Card className="p-6">
              <p className="text-sm text-slate-500">{t('gallery.admin.selectCategoryPrompt')}</p>
            </Card>
          ) : (
            <Card className="p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {t('gallery.admin.selectedImageCount', { count: catImages.length })}
                  </Badge>
                  {categories.find((category) => category.id === selectedCatId)?.autoPublishConsentedPairs ? (
                    <Badge variant="outline" className="text-[10px]">
                      {t('gallery.admin.autoPairsBadge')}
                    </Badge>
                  ) : null}
                  {imagesLoading ? <span className="text-xs text-slate-500">{t('gallery.admin.loadingImages')}</span> : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500 sm:max-w-md">
                    {t('gallery.admin.addImageGuidance')}
                  </p>
                  <Button type="button" size="sm" onClick={() => void openAddImage()}>
                    <Plus className="mr-2 h-4 w-4" /> {t('gallery.admin.addPhoto')}
                  </Button>
                </div>
              </div>

              {imagesLoading ? (
                <div className="flex justify-center py-10 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
                </div>
              ) : catImages.length === 0 ? (
                <p className="text-sm text-slate-500">{t('common.noData')}</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {catImages.map((img) => {
                    const src =
                      img.upload?.pathMedium || img.upload?.pathThumb || img.upload?.pathOriginal
                        ? getUploadUrl(img.upload?.pathMedium || img.upload?.pathThumb || img.upload?.pathOriginal)
                        : undefined
                    return (
                      <div key={img.id} className="group overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="relative aspect-[4/3] bg-slate-50 dark:bg-slate-900/40">
                          <MediaImage src={src} alt={img.title ?? t('gallery.admin.galleryImageAlt')} className="h-full w-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/40 p-2 opacity-100">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-white">{img.title ?? t('gallery.admin.untitled')}</p>
                              <p className="truncate text-[10px] text-white/80">{t('gallery.admin.sortOrderValue', { value: img.sortOrder })}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" aria-label={t('gallery.admin.edit')} onClick={() => openImgEdit(img)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" aria-label={t('gallery.admin.delete')} onClick={() => void handleDeleteImg(img.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editCatId ? t('gallery.admin.editCategoryTitle') : t('gallery.admin.newCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('gallery.admin.name')}</Label>
              <Input className="mt-1" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
            </div>
            <div>
              <Label>{t('gallery.admin.description')}</Label>
              <Textarea className="mt-1" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
            </div>
            <div>
              <Label>{t('gallery.admin.sortOrder')}</Label>
              <Input className="mt-1" type="number" min={0} value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: Number(e.target.value) || 0 })} />
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={catForm.autoPublishConsentedPairs}
                onChange={(event) =>
                  setCatForm({ ...catForm, autoPublishConsentedPairs: event.target.checked })
                }
                className="mt-1 h-4 w-4 accent-amber-700"
              />
              <span>
                <span className="font-semibold">{t('gallery.admin.autoPublishPairs')}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  {t('gallery.admin.autoPublishPairsHint')}
                </span>
              </span>
            </label>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setCatOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSaveCat()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addImageOpen} onOpenChange={setAddImageOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('gallery.admin.addImageTitle')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 md:grid-cols-2">
            <section className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div>
                <h3 className="font-semibold text-slate-900">{t('gallery.admin.nonClientSectionTitle')}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {t('gallery.admin.nonClientSectionGuidance')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gallery-manual-file">{t('gallery.admin.photo')}</Label>
                <input
                  id="gallery-manual-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => setManualFile(event.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gallery-manual-title">{t('gallery.admin.optionalTitle')}</Label>
                <Input
                  id="gallery-manual-title"
                  value={manualTitle}
                  onChange={(event) => setManualTitle(event.target.value)}
                  maxLength={200}
                />
              </div>
              <label className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                <input
                  type="checkbox"
                  checked={nonClientConfirmed}
                  onChange={(event) => setNonClientConfirmed(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-amber-700"
                />
                <span>{t('gallery.admin.nonClientConfirmation')}</span>
              </label>
              <Button
                type="button"
                size="sm"
                disabled={!manualFile || !nonClientConfirmed || addingImage}
                onClick={() => void handleUploadNonClientImage()}
              >
                {addingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {t('gallery.admin.uploadNonClientPhoto')}
              </Button>
            </section>

            <section className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div>
                <h3 className="font-semibold text-slate-900">{t('gallery.admin.consentedSectionTitle')}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  {t('gallery.admin.consentedSectionGuidance')}
                </p>
              </div>
              {eligibleLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('gallery.admin.loadingEligibleImages')}
                </div>
              ) : eligibleImages.length === 0 ? (
                <p className="text-sm text-slate-500">{t('gallery.admin.noEligibleImages')}</p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {eligibleImages.map((image) => (
                    <label
                      key={image.imageId}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-2 hover:bg-slate-50"
                    >
                      <input
                        type="radio"
                        name="eligible-gallery-image"
                        checked={eligibleSelectedId === image.imageId}
                        onChange={() => setEligibleSelectedId(image.imageId)}
                        className="h-4 w-4 accent-amber-700"
                      />
                      <MediaImage
                        src={getUploadUrl(image.previewUrl)}
                        alt=""
                        className="h-14 w-14 rounded-md object-cover"
                      />
                      <span className="min-w-0 text-xs text-slate-700">
                        <span className="block font-semibold">{image.isBefore ? t('gallery.admin.before') : t('gallery.admin.after')} · {image.serviceName}</span>
                        <span className="block text-slate-500">{formatDateOnlyLocale(image.serviceDate.slice(0, 10), getIntlLocale(i18n.language), { dateStyle: 'medium' })}</span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!eligibleSelectedId || eligibleLoading || addingImage}
                onClick={() => void handleAddConsentedImage()}
              >
                {addingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('gallery.admin.addConsentedPhoto')}
              </Button>
            </section>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAddImageOpen(false)}>
              {t('gallery.admin.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('gallery.admin.editImageTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('gallery.admin.title')}</Label>
              <Input className="mt-1" value={imgForm.title} onChange={(e) => setImgForm({ ...imgForm, title: e.target.value })} />
            </div>
            <div>
              <Label>{t('gallery.admin.description')}</Label>
              <Textarea className="mt-1" value={imgForm.description} onChange={(e) => setImgForm({ ...imgForm, description: e.target.value })} />
            </div>
            <div>
              <Label>{t('gallery.admin.sortOrder')}</Label>
              <Input className="mt-1" type="number" min={0} value={imgForm.sortOrder} onChange={(e) => setImgForm({ ...imgForm, sortOrder: Number(e.target.value) || 0 })} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setImgOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="button" onClick={() => void handleSaveImg()} disabled={saving || !editImgId}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

