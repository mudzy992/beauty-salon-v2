import { useState } from 'react'
import { Select } from '../../components/ui/select'
import { useTranslation } from 'react-i18next'

import api from '../../api/client'
import { getErrorMessage } from '../../api/error'
import { resolveAdminApiErrorKey } from '../admin/admin-api-error.mjs'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'
import { BlogPostImageUpload } from './blog-post-image-upload'
import { BlogPostSeoFields } from './blog-post-seo-fields'
import { BLOG_POST_LANGUAGES } from './blog-language'
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
  const [uploading, setUploading] = useState<'hero' | 'og' | null>(null)

  const uploadImage = async (file: File, field: 'heroImage' | 'ogImage') => {
    setUploading(field === 'heroImage' ? 'hero' : 'og')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('assetKind', 'blog')
      const { data } = await api.post('/api/uploads/public', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange({ [field]: data.pathMedium || data.pathOriginal || '' })
      onUploaded(t('blog.admin.imageUploaded'))
    } catch (err) {
      onError(
        t(resolveAdminApiErrorKey(getErrorMessage(err, ''), 'blog.admin.uploadFailed')),
      )
    } finally {
      setUploading(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editId ? t('blog.editPost') : t('blog.newPost')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blog-title">{t('blog.title')}</Label>
            <Input id="blog-title" value={form.title} onChange={(e) => onChange({ title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-slug">{t('blog.admin.slug')}</Label>
            <Input
              id="blog-slug"
              value={form.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              placeholder={t('blog.admin.slugPlaceholder')}
            />
            <p className="text-xs text-content-strong">
              {t('blog.admin.publicUrl', { slug: form.slug || 'slug' })}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-excerpt">{t('blog.admin.excerpt')}</Label>
            <Textarea
              id="blog-excerpt"
              rows={3}
              maxLength={2000}
              value={form.excerpt}
              onChange={(e) => onChange({ excerpt: e.target.value })}
              placeholder={t('blog.admin.excerptPlaceholder')}
            />
          </div>
          <BlogPostImageUpload
            label={t('blog.admin.heroImage')}
            value={form.heroImage}
            uploading={uploading === 'hero'}
            onPick={(file) => void uploadImage(file, 'heroImage')}
          />
          <BlogPostImageUpload
            label={t('blog.admin.ogImage')}
            value={form.ogImage}
            uploading={uploading === 'og'}
            onPick={(file) => void uploadImage(file, 'ogImage')}
            hint={t('blog.admin.ogImageHint')}
          />
          {/* WCAG 3.1.2 Language of Parts — jezik članka se čuva da bi ga javna
              stranica mogla izdati kao `lang` na naslovu i sadržaju. */}
          <div className="space-y-2">
            <Label htmlFor="blog-language">{t('blog.admin.language')}</Label>
            <p className="text-xs text-content-strong">{t('blog.admin.languageHelp')}</p>
            <Select
              id="blog-language"
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-focus-ring"
              value={form.language}
              onChange={(e) => onChange({ language: e.target.value as BlogPostFormValues['language'] })}
            >
              {BLOG_POST_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {t(`shell.languageNames.${code}`)}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="blog-content">{t('blog.content')}</Label>
            <p className="text-xs text-content-strong">{t('blog.admin.contentHelp')}</p>
            <Textarea id="blog-content" rows={10} value={form.content} onChange={(e) => onChange({ content: e.target.value })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-line p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-content">{t('blog.published')}</p>
              <p className="text-xs text-content-strong">{t('blog.admin.publishedHint')}</p>
            </div>
            <Switch aria-label={t('blog.published')} checked={form.isPublished} onCheckedChange={(isPublished) => onChange({ isPublished })} />
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
