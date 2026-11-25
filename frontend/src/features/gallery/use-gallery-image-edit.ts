import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import { emptyGalleryImageForm, type GalleryImage, type GalleryImageForm } from './gallery-types'

/**
 * Uređivanje i brisanje slike u admin galeriji (S9).
 *
 * Stanje (`imgOpen`, `editImgId`, `imgForm`) i tri akcije izdvojene su iz
 * `use-gallery-categories.ts` da oba hook-a stanu u okvir 100–150 linija.
 * Ponašanje je isto: `PATCH /api/gallery/images/:id`, pa `loadImages` izabrane
 * kategorije, pa `loadCategories`; brisanje pita potvrdu prije slanja.
 */
export function useGalleryImageEdit({
  selectedCatId,
  loadImages,
  loadCategories,
  setConfirmRequest,
}: {
  selectedCatId: string | null
  loadImages: (categoryId: string) => Promise<void>
  loadCategories: () => void
  setConfirmRequest: (request: AdminConfirmRequest | null) => void
}) {
  const { t } = useTranslation()
  const { success, error } = useAppToast()

  const [imgOpen, setImgOpen] = useState(false)
  const [editImgId, setEditImgId] = useState<string | null>(null)
  const [imgForm, setImgForm] = useState<GalleryImageForm>(emptyGalleryImageForm)
  const [saving, setSaving] = useState(false)

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

  const handleDeleteImg = (id: string) => {
    setConfirmRequest({
      title: t('common.confirmDestructiveTitle'),
      description: t('gallery.admin.deleteImageConfirm'),
      confirmLabel: t('common.delete'),
      action: async () => {
        try {
          await api.delete(`/api/gallery/images/${id}`)
          success(t('gallery.admin.imageDeleted'))
          if (selectedCatId) await loadImages(selectedCatId)
          loadCategories()
        } catch {
          error(t('gallery.admin.genericError'))
        }
      },
    })
  }

  return {
    imgOpen,
    setImgOpen,
    editImgId,
    imgForm,
    setImgForm,
    saving,
    openImgEdit,
    handleSaveImg,
    handleDeleteImg,
  }
}
