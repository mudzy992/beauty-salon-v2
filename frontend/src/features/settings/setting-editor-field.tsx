import { type ChangeEvent } from 'react'
import { Loader2, Pencil, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import type { SettingDef } from './types'

/**
 * Polje jedne postavke (S9).
 *
 * Izdvojeno iz `setting-editor-form.tsx` bez promjene: isti `htmlFor`/`id`
 * (formular daje `inputId`), iste klase, isti `aria-invalid` /
 * `aria-describedby`, isti Aurum comment za color picker (bijela ploča zbog
 * kontrasta native pickera) i ista poruka greške (`role="alert"`).
 *
 * Zaglavlje (ikona + `Label` + pomoćni tekst) je **ovdje**, ne u formu,
 * jer `htmlFor`/`id` veza mora ostati u istom fajlu kao kontrola
 * (garancija `test:form-control-labels`).
 */
export function SettingEditorField({
  def,
  inputId,
  fileInputId,
  errorId,
  value,
  file,
  uploading,
  validationError,
  onUpdateValue,
  onSelectFile,
  onUpload,
}: {
  def: SettingDef
  inputId: string
  fileInputId: string
  errorId: string
  value: string
  file: File | null
  uploading: boolean
  validationError: string | null
  onUpdateValue: (nextValue: string) => void
  onSelectFile: (file: File | null) => void
  onUpload: () => void
}) {
  const { t } = useTranslation()
  const displayLabel = def.label ?? def.desc

  const inputProps = {
    'aria-invalid': Boolean(validationError),
    'aria-describedby': validationError ? errorId : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement>) => onUpdateValue(event.target.value),
  }

  const control = renderControl()

  return (
    <>
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-brand-rose-text shadow-sm">
          {def.type === 'image' ? <Upload className="h-4 w-4" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />}
        </span>
        <div className="min-w-0">
          <Label htmlFor={inputId} className="text-sm font-semibold text-content">{displayLabel}</Label>
          {def.helpText ? <p className="mt-1 text-xs leading-5 text-content-strong">{def.helpText}</p> : null}
        </div>
      </div>

      <div className="space-y-3">{control}</div>

      {validationError ? <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-danger">{validationError}</p> : null}
    </>
  )

  function renderControl() {
  if (def.type === 'textarea') {
    return (
      <Textarea
        id={inputId}
        value={value}
        onChange={(event) => onUpdateValue(event.target.value)}
        placeholder={def.placeholder}
        rows={4}
        aria-invalid={Boolean(validationError)}
        aria-describedby={validationError ? errorId : undefined}
        className="min-h-28 rounded-xl bg-surface"
      />
    )
  }

  if (def.type === 'select') {
    return (
      <Select
        id={inputId}
        className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-focus-ring"
        value={value}
        onChange={(event) => onUpdateValue(event.target.value)}
        aria-invalid={Boolean(validationError)}
        aria-describedby={validationError ? errorId : undefined}
      >
        {(def.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </Select>
    )
  }

  if (def.type === 'color') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {/* Aurum: color swatch namjerno ostaje bijel — kontrast za native color picker, nije površina teme. */}
        <Input
          type="color"
          aria-label={t('adminSettings.editor.colorPicker', { label: displayLabel })}
          value={value || '#000000'}
          onChange={(event) => onUpdateValue(event.target.value)}
          className="h-11 w-14 cursor-pointer rounded-xl bg-white p-1"
        />
        <Input id={inputId} value={value} {...inputProps} className="h-11 max-w-48 rounded-xl bg-surface font-mono" />
      </div>
    )
  }

  if (def.type === 'number') {
    return (
      <div className="flex items-center gap-3">
        <Input
          id={inputId}
          type="number"
          value={value}
          {...inputProps}
          min={def.min}
          max={def.max}
          className="h-11 max-w-48 rounded-xl bg-surface"
        />
        {def.suffix ? <span className="text-sm text-content-strong">{def.suffix}</span> : null}
      </div>
    )
  }

  if (def.type === 'image' || def.type === 'url') {
    return (
      <div className="space-y-3">
        <Input
          id={inputId}
          type="url"
          value={value}
          {...inputProps}
          placeholder={def.placeholder || 'https://'}
          className="h-11 rounded-xl bg-surface"
        />
        {def.type === 'image' ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-control-border bg-surface p-3">
            <div className="min-w-0 flex-1">
              <Label htmlFor={fileInputId} className="text-xs font-semibold text-content-strong">
                {t('adminSettings.editor.chooseImage')}
              </Label>
              <Input
                id={fileInputId}
                type="file"
                accept="image/*"
                className="mt-1 max-w-sm border-0 p-0 text-xs shadow-none"
                onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
              />
              {file ? <p className="mt-1 truncate text-xs text-content-strong">{file.name}</p> : null}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={onUpload} disabled={!file || uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Upload className="mr-2 h-4 w-4" aria-hidden="true" />}
              {uploading ? t('adminSettings.editor.uploading') : t('adminSettings.editor.upload')}
            </Button>
            {value ? <MediaImage src={getUploadUrl(value)} alt={displayLabel} className="h-16 max-w-28 rounded-lg border border-line object-cover" /> : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <Input
      id={inputId}
      type={def.type === 'email' ? 'email' : 'text'}
      value={value}
      {...inputProps}
      placeholder={def.placeholder}
      className="h-11 rounded-xl bg-surface"
    />
  )
  }
}
