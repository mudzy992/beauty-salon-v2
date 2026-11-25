import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import {
  emptyGalleryCategoryForm,
  type GalleryCategory,
  type GalleryCategoryForm,
  type GalleryImage,
} from './gallery-types'

/**
 * Kategorije i slike admin galerije — stanje i akcije (S9).
 *
 * Izdvojeno iz `pages/Gallery.tsx` bez promjene ponašanja: iste putanje API-ja,
 * isti redoslijed poziva (`loadImages` prije `loadCategories` poslije brisanja),
 * iste poruke i isti uslovi povratka. `loadImages` ostaje **jedini** put do
 * `selectedCatId` — tuđi test (`admin-gallery-keyboard.test.mjs`) to zaključuje
 * i ne smije se promijeniti.
 */
export function useGalleryCategories() {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()

  const [categories, setCategories] = useState<GalleryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)
  const [catImages, setCatImages] = useState<GalleryImage[]>([])
  const [imagesLoading, setImagesLoading] = useState(false)

  const [catOpen, setCatOpen] = useState(false)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState<GalleryCategoryForm>(emptyGalleryCategoryForm)

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
      setCatForm(emptyGalleryCategoryForm())
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

  const handleDeleteCat = (id: string) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('gallery.admin.deleteCategoryConfirm'),
      confirmLabel: t('common.delete'),
      action: async () => {
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
      },
    })
  }

  return {
    categories,
    loading,
    saving,
    selectedCatId,
    catImages,
    imagesLoading,
    catOpen,
    setCatOpen,
    editCatId,
    catForm,
    setCatForm,
    confirmRequest,
    setConfirmRequest,
    loadCategories,
    loadImages,
    openCatForm,
    handleSaveCat,
    handleDeleteCat,
  }
}
