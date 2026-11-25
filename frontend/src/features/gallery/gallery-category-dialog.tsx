import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import type { GalleryCategoryForm } from './gallery-types'

/**
 * Dijalog za kategoriju galerije (S9).
 *
 * Markup prenesen iz `pages/Gallery.tsx` bez promjene — `htmlFor`/`id` parovi
 * (`gallery-category-name`, `-description`, `-sort-order`) su isti, pa ostaje
 * i ista garancija 1.3.1 koju provjerava `admin-content-a11y.test.mjs`.
 */
export function GalleryCategoryDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  saving,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: boolean
  form: GalleryCategoryForm
  setForm: (form: GalleryCategoryForm) => void
  saving: boolean
  onSave: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t('gallery.admin.editCategoryTitle') : t('gallery.admin.newCategory')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="gallery-category-name">{t('gallery.admin.name')}</Label>
            <Input id="gallery-category-name" className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="gallery-category-description">{t('gallery.admin.description')}</Label>
            <Textarea id="gallery-category-description" className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="gallery-category-sort-order">{t('gallery.admin.sortOrder')}</Label>
            <Input id="gallery-category-sort-order" className="mt-1" type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} />
          </div>
          <label className="flex items-start gap-3 rounded-lg border border-line p-3 text-sm text-content-strong">
            <input
              type="checkbox"
              checked={form.autoPublishConsentedPairs}
              onChange={(event) =>
                setForm({ ...form, autoPublishConsentedPairs: event.target.checked })
              }
              className="mt-1 h-4 w-4 accent-brand-rose"
            />
            <span>
              <span className="font-semibold">{t('gallery.admin.autoPublishPairs')}</span>
              <span className="mt-1 block text-xs leading-5 text-content-muted">
                {t('gallery.admin.autoPublishPairsHint')}
              </span>
            </span>
          </label>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
