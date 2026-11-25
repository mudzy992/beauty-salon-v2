import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { getErrorCode, getErrorMessage } from '../../api/error'
import { resolveAdminApiError } from '../admin/admin-api-error.mjs'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { UploadMeta } from './app-release-create-form'
import type { AppRelease } from './app-release-types'

/**
 * Stanje i akcije admin objava verzija (S9).
 *
 * Izdvojeno iz `pages/AppReleases.tsx` bez promjene: isti endpointi
 * (`/api/app-releases`, `/api/app-releases/upload`), isti `resolveAdminApiError`
 * mapiranje grešaka i iste poruke.
 */
export function useAppReleases() {
  const { t } = useTranslation()
  const { success, error } = useAppToast()

  const [rows, setRows] = useState<AppRelease[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadMeta, setUploadMeta] = useState<UploadMeta | null>(null)
  const [version, setVersion] = useState('')
  const [versionCode, setVersionCode] = useState('1')
  const [minSupported, setMinSupported] = useState('1')
  const [forceUpdate, setForceUpdate] = useState(false)
  const [notes, setNotes] = useState('')
  const [publishNow, setPublishNow] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    api
      .get<AppRelease[]>('/api/app-releases')
      .then((r) => setRows(Array.isArray(r.data) ? r.data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleUpload = async () => {
    if (!file) return
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post<UploadMeta>('/api/app-releases/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setUploadMeta(data)
      success(t('appReleases.uploadOk'))
    } catch (err) {
      const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'appReleases.uploadFail', getErrorCode(err))
      error(t(apiErr.key, apiErr.values))
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!uploadMeta) {
      error(t('appReleases.needUpload'))
      return
    }
    setSaving(true)
    try {
      await api.post('/api/app-releases', {
        version: version.trim(),
        versionCode: Number(versionCode),
        minSupportedVersionCode: Number(minSupported),
        forceUpdate,
        apkPath: uploadMeta.apkPath,
        apkSha256: uploadMeta.apkSha256,
        apkSizeBytes: uploadMeta.apkSizeBytes,
        releaseNotes: notes.trim() || undefined,
        publish: publishNow,
      })
      success(t('appReleases.createOk'))
      setFile(null)
      setUploadMeta(null)
      setVersion('')
      setNotes('')
      load()
    } catch (err) {
      const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'appReleases.createFail', getErrorCode(err))
      error(t(apiErr.key, apiErr.values))
    } finally {
      setSaving(false)
    }
  }

  const handlePublish = async (id: string) => {
    setSaving(true)
    try {
      await api.patch(`/api/app-releases/${id}`, { status: 'PUBLISHED' })
      success(t('appReleases.publishOk'))
      load()
    } catch (err) {
      const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'appReleases.createFail', getErrorCode(err))
      error(t(apiErr.key, apiErr.values))
    } finally {
      setSaving(false)
    }
  }

  return {
    rows,
    loading,
    saving,
    file,
    setFile,
    uploadMeta,
    setUploadMeta,
    version,
    setVersion,
    versionCode,
    setVersionCode,
    minSupported,
    setMinSupported,
    forceUpdate,
    setForceUpdate,
    notes,
    setNotes,
    publishNow,
    setPublishNow,
    load,
    handleUpload,
    handleCreate,
    handlePublish,
  }
}
