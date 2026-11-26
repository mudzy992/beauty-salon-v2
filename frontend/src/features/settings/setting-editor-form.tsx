import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, X } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { SettingEditorField } from './setting-editor-field'
import type { AppSetting, SettingDef } from './types'
import { useSettingEditorUpload } from './use-setting-editor-upload'

/**
 * Urednik jedne postavke (S9).
 *
 * Ornkestrator: drži vrijednost, validaciju i akcije spremanja/uploada.
 * Render polja je u `setting-editor-field.tsx`, upload u
 * `use-setting-editor-upload.ts`.
 *
 */
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
  const [value, setValue] = useState(setting?.value ?? defaultValue)
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { uploading, upload } = useSettingEditorUpload()

  useEffect(() => {
    setValue(setting?.value ?? defaultValue)
    setFile(null)
    setValidationError(null)
  }, [setting?.key, setting?.value, defaultValue])

  const validate = (): string | null => {
    const normalizedValue = value.trim()
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

  const updateValue = (nextValue: string) => {
    setValue(nextValue)
    setValidationError(null)
  }

  const handleUpload = async () => {
    if (!file) return
    const path = await upload(file)
    if (!path) return
    setValue(path)
    setFile(null)
    setValidationError(null)
  }

  return (
    <Card className="rounded-xl border-line bg-surface-sunken p-4 shadow-none sm:p-5">
      <SettingEditorField
        def={def}
        inputId={inputId}
        fileInputId={fileInputId}
        errorId={errorId}
        value={value}
        file={file}
        uploading={uploading}
        validationError={validationError}
        onUpdateValue={updateValue}
        onSelectFile={setFile}
        onUpload={() => void handleUpload()}
      />

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={saving || uploading}>
          <X className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('common.cancel')}
        </Button>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving || uploading}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Check className="mr-2 h-4 w-4" aria-hidden="true" />}
          {saving ? t('common.saving') : t('common.save')}
        </Button>
      </div>
    </Card>
  )
}
