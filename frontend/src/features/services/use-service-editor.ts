import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { Category, Subcategory } from './service-catalog-types'
import type { Service } from './service-types'
import type { ModalMode } from './service-form-types'
import { useServiceImageUpload } from './use-service-image-upload'
import { useAuthStore } from '../../stores/auth.store'

type Dependencies = { loadData: () => void; showApiError: (err: unknown, fallbackKey: string) => void }
export function useServiceEditor({ loadData, showApiError }: Dependencies) {
  const { t } = useTranslation()
  const { success } = useAppToast()
  const sessionVersion = useAuthStore(state => state.sessionVersion)
  const [saving, setSaving] = useState(false)
  const [open, setOpenState] = useState(false)
  const editorGeneration = useRef(0)
  const editorOpen = useRef(false)
  const saveSequence = useRef(0)
  const saveInFlight = useRef(false)
  const refreshPending = useRef(false)
  const mounted = useRef(false)
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
  const { uploadingImg, svcFileRef, handleUploadHeroImage, resetUploads, isUploading } = useServiceImageUpload({ setSvcForm, showApiError })
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; editorGeneration.current += 1; saveSequence.current += 1 }
  }, [])
  useEffect(() => {
    editorGeneration.current += 1
    saveSequence.current += 1
    editorOpen.current = false
    saveInFlight.current = false
    refreshPending.current = false
    setSaving(false)
    setOpenState(false)
  }, [sessionVersion])

  const setOpen = (next: boolean) => {
    if (!next) {
      editorGeneration.current += 1
      editorOpen.current = false
      resetUploads()
      setOpenState(false)
      if (refreshPending.current) { refreshPending.current = false; loadData() }
    } else {
      editorOpen.current = true
      setOpenState(true)
    }
  }
  const beginEditor = () => { editorGeneration.current += 1; resetUploads(); editorOpen.current = true }

  const getDialogTitle = () => {
    if (modalMode === 'category')
      return t(editId ? 'services.editCategory' : 'services.newCategory')
    if (modalMode === 'subcategory')
      return t(editId ? 'services.editSubcategory' : 'services.newSubcategory')
    return t(editId ? 'services.editService' : 'services.newService')
  }

  const openCategoryForm = (cat?: Category) => {
    beginEditor()
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
    beginEditor()
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
    beginEditor()
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

  const handleSave = async () => {
    if (!editorOpen.current || saveInFlight.current || isUploading()) return
    const generation = editorGeneration.current
    const request = ++saveSequence.current
    const session = useAuthStore.getState().sessionVersion
    const currentSession = () => mounted.current && useAuthStore.getState().sessionVersion === session
    const sameEditor = () => currentSession() && editorOpen.current && editorGeneration.current === generation
    saveInFlight.current = true
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
      if (!currentSession()) return
      success(t('services.toast.saved'))
      if (sameEditor()) {
        refreshPending.current = false
        setOpen(false)
        loadData()
      } else if (editorOpen.current) {
        refreshPending.current = true
      } else {
        loadData()
      }
    } catch (err) {
      if (currentSession()) showApiError(err, 'services.errors.saveFailed')
    } finally {
      if (mounted.current && saveSequence.current === request) {
        saveInFlight.current = false
        setSaving(false)
      }
    }
  }

  return {
    open, setOpen, modalMode, saving, catForm, subForm, svcForm, setCatForm, setSubForm, setSvcForm,
    svcFileRef, uploadingImg, getDialogTitle, openCategoryForm, openSubcategoryForm, openServiceForm,
    handleUploadHeroImage, handleSave,
  }
}
