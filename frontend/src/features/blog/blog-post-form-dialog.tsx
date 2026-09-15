import { useRef, useState, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { getErrorMessage } from '../../api/error'
import { MediaImage } from '../../components/media-image'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'
import { getUploadUrl } from '../../utils/uploadUrl'
import { BlogPostSeoFields } from './blog-post-seo-fields'
import type { BlogPostFormValues } from './types'

type Props = {
  open: boolean
  editId: string | null
  form: BlogPostFormValues
  saving: boolean
  onOpenChange: (open: boolean) => void
  onChange: (patch: Partial<BlogPostFormValues>) => void
  onSave: () => void
  onError: (message: string) => void
  onUploaded: (message: string) => void
}

export function BlogPostFormDialog({
  open,
  editId,
  form,
  saving,
  onOpenChange,
  onChange,
  onSave,
  onError,
  onUploaded,
}: Props) {
  const { t } = useTranslation()
  const heroFileRef = useRef<HTMLInputElement>(null)
  const ogFileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<'hero' | 'og' | null>(null)

  const uploadImage = async (file: File, field: 'heroImage' | 'ogImage') => {
    setUploading(field === 'heroImage' ? 'hero' : 'og')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('entity', 'blog')
      const { data } = await api.post('/api/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange({ [field]: data.pathMedium || data.pathOriginal || '' })
      onUploaded('Slika je uploadovana')
    } catch (err) {
      onError(getErrorMessage(err))
    } finally {
      setUploading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editId ? 'Uredi članak' : 'Novi članak'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blog-title">Naslov</Label>
            <Input id="blog-title" value={form.title} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-slug">Slug (URL)</Label>
            <Input
              id="blog-slug"
              value={form.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              placeholder="automatski iz naslova ako ostane prazno"
            />
            <p className="text-xs text-slate-500">Javni URL: /blog/{form.slug || 'slug'}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-excerpt">Kratki opis</Label>
            <Textarea
              id="blog-excerpt"
              rows={3}
              maxLength={2000}
              value={form.excerpt}
              onChange={(e) => onChange({ excerpt: e.target.value })}
              placeholder="Prikazuje se u listi blogova i kao fallback za SEO opis"
            />
          </div>
          <ImageUpload
            label="Hero slika"
            value={form.heroImage}
            uploading={uploading === 'hero'}
            fileRef={heroFileRef}
            onPick={(file) => void uploadImage(file, 'heroImage')}
          />
          <ImageUpload
            label="OG slika (dijeljenje)"
            value={form.ogImage}
            uploading={uploading === 'og'}
            fileRef={ogFileRef}
            onPick={(file) => void uploadImage(file, 'ogImage')}
            hint="Ako je prazna, koristi se hero slika."
          />
          <div className="space-y-2">
            <Label htmlFor="blog-content">Sadržaj (HTML/Tekst)</Label>
            <Textarea id="blog-content" rows={10} value={form.content} onChange={(e) => onChange({ content: e.target.value })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Objavljeno</p>
              <p className="text-xs text-slate-500">Kada je uključeno, članak je vidljiv na javnoj stranici.</p>
            </div>
            <Switch checked={form.isPublished} onCheckedChange={(isPublished) => onChange({ isPublished })} />
          </div>
          <BlogPostSeoFields form={form} onChange={onChange} />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving || Boolean(uploading)}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImageUpload({
  label,
  value,
  uploading,
  fileRef,
  onPick,
  hint,
}: {
  label: string
  value: string
  uploading: boolean
  fileRef: RefObject<HTMLInputElement | null>
  onPick: (file: File) => void
  hint?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <MediaImage src={value ? getUploadUrl(value) : ''} alt={label} className="h-[120px] w-full rounded-md object-cover" />
      <input
        type="file"
        accept="image/*"
        ref={fileRef}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onPick(file)
          if (fileRef.current) fileRef.current.value = ''
        }}
      />
      <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? 'Upload...' : value ? 'Promijeni sliku' : 'Upload sliku'}
      </Button>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}
