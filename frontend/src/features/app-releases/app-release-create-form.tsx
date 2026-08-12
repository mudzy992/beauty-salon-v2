import { Loader2, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'

export type UploadMeta = {
  apkPath: string
  apkSha256: string
  apkSizeBytes: number
}

type Props = {
  file: File | null
  uploadMeta: UploadMeta | null
  version: string
  versionCode: string
  minSupported: string
  forceUpdate: boolean
  publishNow: boolean
  notes: string
  saving: boolean
  onFileChange: (file: File | null) => void
  onVersionChange: (v: string) => void
  onVersionCodeChange: (v: string) => void
  onMinSupportedChange: (v: string) => void
  onForceChange: (v: boolean) => void
  onPublishNowChange: (v: boolean) => void
  onNotesChange: (v: string) => void
  onUpload: () => void
  onCreate: () => void
}

export const AppReleaseCreateForm = ({
  file,
  uploadMeta,
  version,
  versionCode,
  minSupported,
  forceUpdate,
  publishNow,
  notes,
  saving,
  onFileChange,
  onVersionChange,
  onVersionCodeChange,
  onMinSupportedChange,
  onForceChange,
  onPublishNowChange,
  onNotesChange,
  onUpload,
  onCreate,
}: Props) => {
  const { t } = useTranslation()
  return (
    <Card className="space-y-4 p-4">
      <h2 className="text-lg font-medium">{t('appReleases.newRelease')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="apk">{t('appReleases.apkFile')}</Label>
          <Input
            id="apk"
            type="file"
            accept=".apk,application/vnd.android.package-archive"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="secondary" disabled={!file || saving} onClick={onUpload}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {t('appReleases.upload')}
          </Button>
          {uploadMeta ? (
            <p className="break-all text-xs text-muted-foreground">
              SHA-256: {uploadMeta.apkSha256} · {(uploadMeta.apkSizeBytes / (1024 * 1024)).toFixed(1)} MB
            </p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="version">{t('appReleases.version')}</Label>
          <Input id="version" value={version} onChange={(e) => onVersionChange(e.target.value)} placeholder="1.0.1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="versionCode">{t('appReleases.versionCode')}</Label>
          <Input
            id="versionCode"
            type="number"
            min={1}
            value={versionCode}
            onChange={(e) => onVersionCodeChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minSupported">{t('appReleases.minSupported')}</Label>
          <Input
            id="minSupported"
            type="number"
            min={1}
            value={minSupported}
            onChange={(e) => onMinSupportedChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={forceUpdate} onCheckedChange={onForceChange} id="force" />
          <Label htmlFor="force">{t('appReleases.forceUpdate')}</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={publishNow} onCheckedChange={onPublishNowChange} id="publishNow" />
          <Label htmlFor="publishNow">{t('appReleases.publishNow')}</Label>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">{t('appReleases.notes')}</Label>
          <Textarea id="notes" value={notes} onChange={(e) => onNotesChange(e.target.value)} rows={3} />
        </div>
      </div>
      <Button type="button" disabled={saving || !uploadMeta || !version.trim()} onClick={onCreate}>
        {t('appReleases.create')}
      </Button>
    </Card>
  )
}
