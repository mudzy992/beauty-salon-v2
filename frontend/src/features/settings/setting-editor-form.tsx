import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, X } from 'lucide-react'
import api from '../../api/client'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { MediaImage } from '../../components/media-image'
import { useAppToast } from '../../lib/toast/useAppToast'
import { getUploadUrl } from '../../utils/uploadUrl'
import { isSupportedHexColor } from '../../utils/brand-colors.mjs'
import type { AppSetting, SettingDef } from './types'

export function SettingEditorForm({
  def,
  setting,
  onSave,
  onCancel,
}: {
  def: SettingDef
  setting: AppSetting | undefined
  onSave: (key: string, value: string, desc: string) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const displayLabel = def.label ?? def.desc
  const { success, error } = useAppToast()
  const [value, setValue] = useState(setting?.value ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  useEffect(() => {
    setValue(setting?.value ?? '')
    setFile(null)
  }, [setting])
  const save = async () => {
    if (
      ['theme_primary', 'theme_accent'].includes(def.key) &&
      value.trim() &&
      !isSupportedHexColor(value)
    ) {
      error(t('adminSettings.editor.invalidHex'))
      return
    }

    setSaving(true)
    try {
      await onSave(def.key, value, def.desc)
    } finally {
      setSaving(false)
    }
  }
  const upload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('assetKind', 'brand')
      const { data } = await api.post<{ pathOriginal: string }>('/api/uploads/public', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (!data?.pathOriginal) throw new Error('fail')
      setValue(data.pathOriginal)
      setFile(null)
      success(t('adminSettings.editor.uploadSuccess'))
    } catch {
      error(t('adminSettings.editor.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }
  return (
    <Card className="border-2 border-brand-gold/40 p-4">
      <p className="text-sm font-semibold text-brand-gold-text">{displayLabel}</p>
      <p className="mb-3 font-mono text-xs text-slate-400">{def.key}</p>
      <div className="mb-3 space-y-2">
        {def.type === 'textarea' ? (
          <Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={def.placeholder} rows={3} />
        ) : def.type === 'select' ? (
          <select
            className="h-10 w-full max-w-md rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label={displayLabel}
          >
            {(def.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : def.type === 'color' ? (
          <div className="flex gap-2">
            <Input type="color" value={value || '#000000'} onChange={(e) => setValue(e.target.value)} className="h-10 w-12 p-1" />
            <Input value={value} onChange={(e) => setValue(e.target.value)} className="max-w-[180px] font-mono" />
          </div>
        ) : def.type === 'number' ? (
          <div className="flex items-center gap-2">
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} min={def.min} max={def.max} className="max-w-[150px]" />
            {def.suffix ? <span className="text-sm text-slate-500">{def.suffix}</span> : null}
          </div>
        ) : def.type === 'image' || def.type === 'url' ? (
          <div className="space-y-2">
            <Input type="url" value={value} onChange={(e) => setValue(e.target.value)} placeholder={def.placeholder} />
            {def.type === 'image' ? (
              <div className="flex flex-wrap items-center gap-2">
                <Input type="file" accept="image/*" className="max-w-xs" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <Button type="button" size="sm" variant="outline" onClick={() => void upload()} disabled={!file || uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-label={t('adminSettings.editor.uploading')} /> : t('adminSettings.editor.upload')}
                </Button>
                {value ? <MediaImage src={getUploadUrl(value)} alt="" className="max-h-24 w-auto rounded-md" /> : null}
              </div>
            ) : null}
          </div>
        ) : (
          <Input type={def.type === 'email' ? 'email' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} placeholder={def.placeholder} />
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          {t('common.cancel')}
        </Button>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          {t('common.save')}
        </Button>
      </div>
    </Card>
  )
}
