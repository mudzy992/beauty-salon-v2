import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { ServiceForm } from './service-form-types'

type Params = { setSvcForm: Dispatch<SetStateAction<ServiceForm>>; showApiError: (err: unknown, fallbackKey: string) => void }
export function useServiceImageUpload({ setSvcForm, showApiError }: Params) {
  const { t } = useTranslation()
  const { success } = useAppToast()
  const [uploadingImg, setUploadingImg] = useState(false)
  const svcFileRef = useRef<HTMLInputElement>(null)
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

  return { uploadingImg, svcFileRef, handleUploadHeroImage }
}
