import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import { useAuthStore } from '../../stores/auth.store'
import type { ServiceForm } from './service-form-types'

type Params = { setSvcForm: Dispatch<SetStateAction<ServiceForm>>; showApiError: (err: unknown, fallbackKey: string) => void }
export function useServiceImageUpload({ setSvcForm, showApiError }: Params) {
  const { t } = useTranslation()
  const { success } = useAppToast()
  const sessionVersion = useAuthStore(state => state.sessionVersion)
  const [uploadingImg, setUploadingImg] = useState(false)
  const svcFileRef = useRef<HTMLInputElement>(null)
  const sequence = useRef(0)
  const inFlight = useRef(false)
  const mounted = useRef(false)
  const resetUploads = useCallback(() => {
    sequence.current += 1
    inFlight.current = false
    setUploadingImg(false)
    if (svcFileRef.current) svcFileRef.current.value = ''
  }, [])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; sequence.current += 1; inFlight.current = false }
  }, [])
  useEffect(() => { resetUploads() }, [sessionVersion, resetUploads])

  const handleUploadHeroImage = async (file: File) => {
    if (inFlight.current) return
    const request = ++sequence.current
    const session = useAuthStore.getState().sessionVersion
    const current = () => mounted.current && request === sequence.current && useAuthStore.getState().sessionVersion === session
    inFlight.current = true
    setUploadingImg(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('assetKind', 'service')
      const { data } = await api.post('/api/uploads/public', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (!current()) return
      const path = data.pathMedium || data.pathOriginal || ''
      setSvcForm((prev) => ({ ...prev, heroImage: path }))
      success(t('services.toast.imageUploaded'))
    } catch (err) {
      if (current()) showApiError(err, 'services.errors.uploadFailed')
    } finally {
      if (current()) {
        inFlight.current = false
        setUploadingImg(false)
        if (svcFileRef.current) svcFileRef.current.value = ''
      }
    }
  }

  return { uploadingImg, svcFileRef, handleUploadHeroImage, resetUploads, isUploading: () => inFlight.current }
}
