import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'

/**
 * Upload slike u editoru postavke (S9).
 *
 * Izdvojeno iz `setting-editor-form.tsx` bez promjene: isti endpoint
 * (`/api/uploads/public`), isti `assetKind=brand`, isti `FormData` i iste
 * poruke o uspjehu/grešci. Vraća **putanju** slike — formu pretvara u
 * `value`.
 */
export function useSettingEditorUpload() {
  const { t } = useTranslation()
  const { success, error } = useAppToast()
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File): Promise<string | null> => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('assetKind', 'brand')
      const { data } = await api.post<{ pathOriginal: string }>('/api/uploads/public', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (!data?.pathOriginal) throw new Error('Upload response did not include an asset path')
      success(t('adminSettings.editor.uploadSuccess'))
      return data.pathOriginal
    } catch {
      error(t('adminSettings.editor.uploadFailed'))
      return null
    } finally {
      setUploading(false)
    }
  }

  return { uploading, upload }
}
