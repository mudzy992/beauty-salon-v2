import type { RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { Label } from '../../components/ui/label'
import { WORK_GALLERY_MAX_PHOTO_BYTES, WORK_GALLERY_PHOTO_MIMES } from './work-gallery-upload-types.mjs'

type PhotoFieldProps = {
  side: 'before' | 'after'
  label: string
  rejection: 'size' | 'type' | null
  disabled: boolean
  inputRef: RefObject<HTMLInputElement>
  onSelect: (file: File | null) => void
}

/**
 * Jedno polje za fotografiju („prije" ili „poslije").
 *
 * Prihvaćuju se samo JPEG/PNG/WebP/GIF do 10 MiB; sve ostalo se odbija
 * prije slanja, a odluka se prikazuje uz polje (ne samo u fokusu).
 */
export function WorkGalleryPhotoField({
  side,
  label,
  rejection,
  disabled,
  inputRef,
  onSelect,
}: PhotoFieldProps) {
  const { t } = useTranslation()
  const inputId = `work-gallery-pair-${side}`

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={inputId}>{label}</Label>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={WORK_GALLERY_PHOTO_MIMES.join(',')}
        aria-describedby="work-gallery-pair-help"
        aria-invalid={rejection ? true : undefined}
        disabled={disabled}
        onChange={event => onSelect(event.target.files?.[0] ?? null)}
        className="w-full rounded-md border border-input-border bg-surface px-3 py-2 text-sm text-content file:border-0 file:bg-transparent file:text-sm file:font-medium"
      />
      {rejection ? (
        <p role="alert" className="text-sm text-content-strong">
          {rejection === 'size'
            ? t('admin.serviceWorkGallery.pairPhotoTooLarge', { size: Math.round(WORK_GALLERY_MAX_PHOTO_BYTES / (1024 * 1024)) })
            : t('admin.serviceWorkGallery.pairPhotoTypeInvalid')}
        </p>
      ) : null}
    </div>
  )
}
