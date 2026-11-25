import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { Category, Subcategory } from './service-catalog-types'
import type { Service } from './service-types'
import type { ModalMode } from './service-form-types'
import { useServiceImageUpload } from './use-service-image-upload'
import { useAuthStore } from '../../stores/auth.store'
import {
  categoryFormFrom,
  emptyCategoryForm,
  emptyServiceForm,
  serviceFormFrom,
  subcategoryFormFrom,
} from './service-editor-forms'
import { buildServiceEditorRequest } from './service-editor-request'
import { serviceEditorTitle } from './service-editor-title'

type Dependencies = { loadData: () => void; showApiError: (err: unknown, fallbackKey: string) => void; isCatalogStale: () => boolean }
export function useServiceEditor({ loadData, showApiError, isCatalogStale }: Dependencies) {
  const { t } = useTranslation()
  const { success } = useAppToast()
  const sessionVersion = useAuthStore(state => state.sessionVersion)
  const [saving, setSaving] = useState(false)
  const [open, setOpenState] = useState(false)
  const editorGeneration = useRef(0)
  const editorOpen = useRef(false)
  const saveSequence = useRef(0)
  const saveInFlight = useRef(false)
  const mounted = useRef(false)
  const [modalMode, setModalMode] = useState<ModalMode>('category')
  const [editId, setEditId] = useState<string | null>(null)
  const [parentId, setParentId] = useState<string | null>(null)

  const [catForm, setCatForm] = useState(emptyCategoryForm)
  const [subForm, setSubForm] = useState(emptyCategoryForm)
  const [svcForm, setSvcForm] = useState(emptyServiceForm)
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
    setSaving(false)
    setOpenState(false)
  }, [sessionVersion])

  const setOpen = (next: boolean) => {
    if (!next) {
      editorGeneration.current += 1
      editorOpen.current = false
      resetUploads()
      setOpenState(false)
    } else {
      editorOpen.current = true
      setOpenState(true)
    }
  }
  const beginEditor = () => { editorGeneration.current += 1; resetUploads(); editorOpen.current = true }

  const getDialogTitle = () => serviceEditorTitle(modalMode, editId, t)

  const openCategoryForm = (cat?: Category) => {
    beginEditor()
    setModalMode('category')
    setParentId(null)
    if (cat) {
      setEditId(cat.id)
      setCatForm(categoryFormFrom(cat))
    } else {
      setEditId(null)
      setCatForm(emptyCategoryForm())
    }
    setOpen(true)
  }

  const openSubcategoryForm = (categoryId: string, sub?: Subcategory) => {
    beginEditor()
    setModalMode('subcategory')
    setParentId(categoryId)
    if (sub) {
      setEditId(sub.id)
      setSubForm(subcategoryFormFrom(sub))
    } else {
      setEditId(null)
      setSubForm(emptyCategoryForm())
    }
    setOpen(true)
  }

  const openServiceForm = (subcategoryId: string, svc?: Service) => {
    beginEditor()
    setModalMode('service')
    setParentId(subcategoryId)
    if (svc) {
      setEditId(svc.id)
      setSvcForm(serviceFormFrom(svc))
    } else {
      setEditId(null)
      setSvcForm(emptyServiceForm())
    }
    setOpen(true)
  }

  const handleSave = async () => {
    if (!editorOpen.current || saveInFlight.current || isUploading() || isCatalogStale()) return
    const generation = editorGeneration.current
    const request = ++saveSequence.current
    const session = useAuthStore.getState().sessionVersion
    const currentSession = () => mounted.current && useAuthStore.getState().sessionVersion === session
    const sameEditor = () => currentSession() && editorOpen.current && editorGeneration.current === generation
    saveInFlight.current = true
    setSaving(true)
    try {
      const request = buildServiceEditorRequest({
        mode: modalMode,
        editId,
        parentId,
        categoryForm: catForm,
        subcategoryForm: subForm,
        serviceForm: svcForm,
      })
      if (request.method === 'patch') await api.patch(request.url, request.body)
      else await api.post(request.url, request.body)
      if (!currentSession()) return
      success(t('services.toast.saved'))
      if (sameEditor()) setOpen(false)
      loadData()
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
    handleUploadHeroImage: async (file: File) => { if (!isCatalogStale()) await handleUploadHeroImage(file) }, handleSave,
  }
}
