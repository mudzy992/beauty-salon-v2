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
  return (
    <div className="space-y-4 rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-50">SEO</p>
        <p className="text-xs text-slate-500">
          Koristi se za Google, dijeljenje i društvene mreže. Prazna polja nasljeđuju naslov i sadržaj.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="blog-seo-title">SEO naslov ({form.seoTitle.length}/70)</Label>
        <Input
          id="blog-seo-title"
          maxLength={70}
          value={form.seoTitle}
          onChange={(e) => onChange({ seoTitle: e.target.value })}
          placeholder="Ako je prazno, koristi se naslov članka"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="blog-seo-desc">Meta opis ({form.seoDescription.length}/320)</Label>
        <Textarea
          id="blog-seo-desc"
          rows={3}
          maxLength={320}
          value={form.seoDescription}
          onChange={(e) => onChange({ seoDescription: e.target.value })}
          placeholder="Kratak opis za pretraživače i dijeljenje"
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Ne indeksiraj</p>
          <p className="text-xs text-slate-500">Članak se neće pojaviti u Google rezultatima.</p>
        </div>
        <Switch checked={form.noIndex} onCheckedChange={(noIndex) => onChange({ noIndex })} />
      </div>
    </div>
  )
}
