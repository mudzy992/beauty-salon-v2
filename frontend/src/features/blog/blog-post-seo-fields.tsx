import { useTranslation } from 'react-i18next'

import { Label } from '../../components/ui/label'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Switch } from '../../components/ui/switch'
import type { BlogPostFormValues } from './types'

type Props = {
  form: BlogPostFormValues
  onChange: (patch: Partial<BlogPostFormValues>) => void
}

export function BlogPostSeoFields({ form, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4 rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">SEO</p>
        <p className="text-xs text-slate-500">
          {t('blog.admin.seoHint')}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="blog-seo-title">
          {t('blog.admin.seoTitle', { count: form.seoTitle.length, max: 70 })}
        </Label>
        <Input
          id="blog-seo-title"
          maxLength={70}
          value={form.seoTitle}
          onChange={(e) => onChange({ seoTitle: e.target.value })}
          placeholder={t('blog.admin.seoTitlePlaceholder')}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="blog-seo-desc">
          {t('blog.admin.metaDescription', { count: form.seoDescription.length, max: 320 })}
        </Label>
        <Textarea
          id="blog-seo-desc"
          rows={3}
          maxLength={320}
          value={form.seoDescription}
          onChange={(e) => onChange({ seoDescription: e.target.value })}
          placeholder={t('blog.admin.metaDescriptionPlaceholder')}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{t('blog.admin.noIndex')}</p>
          <p className="text-xs text-slate-500">{t('blog.admin.noIndexHint')}</p>
        </div>
        <Switch checked={form.noIndex} onCheckedChange={(noIndex) => onChange({ noIndex })} />
      </div>
    </div>
  )
}
