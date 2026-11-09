import { useEffect, useId, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Pencil, Upload, X } from 'lucide-react'
import api from '../../api/client'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { MediaImage } from '../../components/media-image'
import { useAppToast } from '../../lib/toast/useAppToast'
import { getUploadUrl } from '../../utils/uploadUrl'
import { isSupportedHexColor } from '../../utils/brand-colors.mjs'
import type { AppSetting, SettingDef } from './types'

export function SettingEditorForm({
  def,
  setting,
  defaultValue = '',
  onSave,
  onCancel,
}: {
  def: SettingDef
  setting: AppSetting | undefined
  defaultValue?: string
  onSave: (key: string, value: string, desc: string) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const inputId = useId()
  const fileInputId = `${inputId}-file`
  const errorId = `${inputId}-error`
  const displayLabel = def.label ?? def.desc
  const { success, error } = useAppToast()
  const [value, setValue] = useState(setting?.value ?? defaultValue)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    setValue(setting?.value ?? defaultValue)
    setFile(null)
    setValidationError(null)
  }, [setting?.key, setting?.value, defaultValue])

  const validate = (): string | null => {
    const normalizedValue = value.trim()
    if (['theme_primary', 'theme_accent'].includes(def.key) && normalizedValue && !isSupportedHexColor(normalizedValue)) {
      return t('adminSettings.editor.invalidHex')
    }
    if (def.type === 'number') {
      const numberValue = Number(normalizedValue)
      if (!normalizedValue || !Number.isFinite(numberValue)) return t('adminSettings.editor.invalidNumber')
      if ((def.min !== undefined && numberValue < def.min) || (def.max !== undefined && numberValue > def.max)) {
        return t('adminSettings.editor.numberRange', {
          min: def.min ?? '−∞',
          max: def.max ?? '∞',
        })
      }
    }
    if (def.type === 'email' && normalizedValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)) {
      return t('adminSettings.editor.invalidEmail')
    }
    if (def.type === 'url' && normalizedValue) {
      try {
        const parsed = new URL(normalizedValue)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Invalid URL protocol')
      } catch {
        return t('adminSettings.editor.invalidUrl')
      }
    }
    if (def.type === 'select' && def.options?.length && !def.options.some((option) => option.value === value)) {
      return t('adminSettings.editor.invalidSelection')
    }
    return null
  }

  const save = async () => {
    const nextError = validate()
    setValidationError(nextError)
    if (nextError) return

    setSaving(true)
    try {
      await onSave(def.key, value, def.desc)
    } catch {
      // The settings hook already reports a localized save error.
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
      if (!data?.pathOriginal) throw new Error('Upload response did not include an asset path')
      setValue(data.pathOriginal)
      setFile(null)
      setValidationError(null)
      success(t('adminSettings.editor.uploadSuccess'))
    } catch {
      error(t('adminSettings.editor.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const updateValue = (nextValue: string) => {
    setValue(nextValue)
    setValidationError(null)
  }
  const inputProps = {
    'aria-invalid': Boolean(validationError),
    'aria-describedby': validationError ? errorId : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement>) => updateValue(event.target.value),
  }

  return (
    <Card className="rounded-xl border-slate-200 bg-slate-50/60 p-4 shadow-none sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-rose-text shadow-sm">
          {def.type === 'image' ? <Upload className="h-4 w-4" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <Label htmlFor={inputId} className="text-sm font-semibold text-slate-900">{displayLabel}</Label>
          {def.helpText ? <p className="mt-1 text-xs leading-5 text-slate-500">{def.helpText}</p> : null}
        </div>
      </div>

      <div className="space-y-3">
        {def.type === 'textarea' ? (
          <Textarea
            id={inputId}
            value={value}
            onChange={(event) => updateValue(event.target.value)}
            placeholder={def.placeholder}
            rows={4}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? errorId : undefined}
            className="min-h-28 rounded-xl bg-white"
          />
        ) : def.type === 'select' ? (
          <select
            id={inputId}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-focus-ring"
            value={value}
            onChange={(event) => updateValue(event.target.value)}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? errorId : undefined}
          >
            {(def.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : def.type === 'color' ? (
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="color"
              aria-label={t('adminSettings.editor.colorPicker', { label: displayLabel })}
              value={value || '#000000'}
              onChange={(event) => updateValue(event.target.value)}
              className="h-11 w-14 cursor-pointer rounded-xl bg-white p-1"
            />
            <Input id={inputId} value={value} {...inputProps} className="h-11 max-w-48 rounded-xl bg-white font-mono" />
          </div>
        ) : def.type === 'number' ? (
          <div className="flex items-center gap-3">
            <Input
              id={inputId}
              type="number"
              value={value}
              {...inputProps}
              min={def.min}
              max={def.max}
              className="h-11 max-w-48 rounded-xl bg-white"
            />
            {def.suffix ? <span className="text-sm text-slate-500">{def.suffix}</span> : null}
          </div>
        ) : def.type === 'image' || def.type === 'url' ? (
          <div className="space-y-3">
            <Input
              id={inputId}
              type="url"
              value={value}
              {...inputProps}
              placeholder={def.placeholder || 'https://'}
              className="h-11 rounded-xl bg-white"
            />
            {def.type === 'image' ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <Label htmlFor={fileInputId} className="text-xs font-semibold text-slate-700">
                    {t('adminSettings.editor.chooseImage')}
                  </Label>
                  <Input
                    id={fileInputId}
                    type="file"
                    accept="image/*"
                    className="mt-1 max-w-sm border-0 p-0 text-xs shadow-none"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                  {file ? <p className="mt-1 truncate text-xs text-slate-500">{file.name}</p> : null}
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => void upload()} disabled={!file || uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="mr-2 h-4 w-4" aria-hidden="true" />}
                  {uploading ? t('adminSettings.editor.uploading') : t('adminSettings.editor.upload')}
                </Button>
                {value ? <MediaImage src={getUploadUrl(value)} alt={displayLabel} className="h-16 max-w-28 rounded-lg border border-slate-200 object-cover" /> : null}
              </div>
            ) : null}
          </div>
        ) : (
          <Input
            id={inputId}
            type={def.type === 'email' ? 'email' : 'text'}
            value={value}
            {...inputProps}
            placeholder={def.placeholder}
            className="h-11 rounded-xl bg-white"
          />
        )}
      </div>

      {validationError ? <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-rose-700">{validationError}</p> : null}

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving || uploading}>
          <X className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('common.cancel')}
        </Button>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving || uploading}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="mr-2 h-4 w-4" aria-hidden="true" />}
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </Card>
  )
}
