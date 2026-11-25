import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { EligibleGalleryImage } from './gallery-types'

/**
 * Dodavanje fotografije u admin galeriju (S9).
 *
 * Dva puta dodavanja, oba zadržana bez promjene:
 *  1. upload fajla koji **nije** vezan za klijenta (uz potvrdu), i
 *  2. dodavanje već objavljene fotografije sa saglasnošću klijenta.
 *
 * Hook prima `selectedCatId`, `loadImages` i `loadCategories` iz
 * `use-gallery-categories.ts` da bi redoslijed poziva ostao isti kao prije
 * razbijanja (`loadImages` pa `loadCategories`).
 */
export function useGalleryImageUpload({
  selectedCatId,
  loadImages,
  loadCategories,
}: {
  selectedCatId: string | null
  loadImages: (categoryId: string) => Promise<void>
  loadCategories: () => void
}) {
  const { t } = useTranslation()
  const { success, error, warning } = useAppToast()

  const [addImageOpen, setAddImageOpen] = useState(false)
  const [eligibleImages, setEligibleImages] = useState<EligibleGalleryImage[]>([])
  const [eligibleLoading, setEligibleLoading] = useState(false)
  const [eligibleSelectedId, setEligibleSelectedId] = useState<string | null>(null)
  const [manualFile, setManualFile] = useState<File | null>(null)
  const [manualTitle, setManualTitle] = useState('')
  const [nonClientConfirmed, setNonClientConfirmed] = useState(false)
  const [addingImage, setAddingImage] = useState(false)

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

  return {
    addImageOpen,
    setAddImageOpen,
    eligibleImages,
    eligibleLoading,
    eligibleSelectedId,
    setEligibleSelectedId,
    manualFile,
    setManualFile,
    manualTitle,
    setManualTitle,
    nonClientConfirmed,
    setNonClientConfirmed,
    addingImage,
    openAddImage,
    handleAddConsentedImage,
    handleUploadNonClientImage,
  }
}
