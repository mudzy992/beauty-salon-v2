import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { useAppToast } from '../lib/toast/useAppToast'
import { formatLocalizedNumber } from '../i18n/locale-utils.mjs'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import {
  AppReleaseCreateForm,
  type UploadMeta,
} from '../features/app-releases/app-release-create-form'

type ReleaseStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED'

interface AppRelease {
  id: string
  version: string
  versionCode: number
  minSupportedVersionCode: number
  forceUpdate: boolean
  apkSizeBytes: number
  releaseNotes: string | null
  status: ReleaseStatus
}

const statusVariant = (s: ReleaseStatus): 'warning' | 'success' | 'default' => {
  if (s === 'PUBLISHED') return 'success'
  if (s === 'DRAFT') return 'warning'
  return 'default'
}

export default function AppReleases() {
  const { t, i18n } = useTranslation()
  const { success, error } = useAppToast()
  const language = i18n.resolvedLanguage ?? i18n.language
  const statusLabels: Record<ReleaseStatus, string> = {
    DRAFT: t('appReleases.status.draft'),
    PUBLISHED: t('appReleases.status.published'),
    RETIRED: t('appReleases.status.retired'),
  }
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
      error(getErrorMessage(err, t('appReleases.uploadFail')))
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
      error(getErrorMessage(err, t('appReleases.createFail')))
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
      error(getErrorMessage(err, t('appReleases.createFail')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('appReleases.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('appReleases.subtitle')}</p>
      </div>
      <AppReleaseCreateForm
        file={file}
        uploadMeta={uploadMeta}
        version={version}
        versionCode={versionCode}
        minSupported={minSupported}
        forceUpdate={forceUpdate}
        publishNow={publishNow}
        notes={notes}
        saving={saving}
        onFileChange={(f) => {
          setFile(f)
          setUploadMeta(null)
        }}
        onVersionChange={setVersion}
        onVersionCodeChange={setVersionCode}
        onMinSupportedChange={setMinSupported}
        onForceChange={setForceUpdate}
        onPublishNowChange={setPublishNow}
        onNotesChange={setNotes}
        onUpload={handleUpload}
        onCreate={handleCreate}
      />
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t('appReleases.empty')}</p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {r.version} ({r.versionCode})
                    </span>
                    <Badge variant={statusVariant(r.status)}>{statusLabels[r.status]}</Badge>
                    {r.forceUpdate ? (
                      <Badge variant="danger">{t('appReleases.forceUpdate')}</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('appReleases.minSupportedValue', {
                      versionCode: r.minSupportedVersionCode,
                      size: formatLocalizedNumber(r.apkSizeBytes / (1024 * 1024), language, {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      }),
                    })}
                  </p>
                  {r.releaseNotes ? (
                    <p className="text-sm text-muted-foreground">{r.releaseNotes}</p>
                  ) : null}
                </div>
                {r.status !== 'PUBLISHED' ? (
                  <Button type="button" size="sm" disabled={saving} onClick={() => handlePublish(r.id)}>
                    {t('appReleases.publish')}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
