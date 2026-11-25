import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { MediaImage } from '../../components/media-image'
import { Button } from '../../components/ui/button'
import { getUploadUrl } from '../../utils/uploadUrl'

/**
 * Polje za upload slike u blog formi (S9).
 *
 * Izdvojeno iz `blog-post-form-dialog.tsx` bez promjene: isti `role="group"`
 * sa `aria-labelledby` + `aria-describedby`, isti skriveni `<input type="file">`
 * i isti redoslijed dugmeta (promijeni / učitaj / učitavanje).
 */
export function BlogPostImageUpload({
  label,
  value,
  uploading,
  onPick,
  hint,
}: {
  label: string
  value: string
  uploading: boolean
  onPick: (file: File) => void
  hint?: string
}) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const labelId = useId()
  const hintId = useId()
  return (
    <div role="group" aria-labelledby={labelId} className="space-y-2">
      <p id={labelId} className="text-sm font-medium leading-none text-content-strong">
        {label}
      </p>
      <MediaImage src={value ? getUploadUrl(value) : ''} alt={label} className="h-[120px] w-full rounded-md object-cover" />
      <input
        type="file"
        accept="image/*"
        ref={(node) => {
          inputRef.current = node
        }}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          e.target.value = ''
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        aria-describedby={hint ? hintId : undefined}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading
          ? t('blog.admin.imageUploading')
          : value
            ? t('blog.admin.changeImage')
            : t('blog.admin.uploadImage')}
      </Button>
      {hint ? (
        <p id={hintId} className="text-xs text-content-strong">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
