import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import type { GalleryImageForm } from './gallery-types'

/**
 * Dijalog za uređivanje slike u galeriji (S9).
 *
 * Markup prenesen iz `pages/Gallery.tsx` bez promjene — `htmlFor`/`id` parovi
 * (`gallery-image-title`, `-description`, `-sort-order`) su isti.
 */
export function GalleryImageDialog({
  open,
  onOpenChange,
  form,
  setForm,
  saving,
  canSave,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: GalleryImageForm
  setForm: (form: GalleryImageForm) => void
  saving: boolean
  canSave: boolean
  onSave: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('gallery.admin.editImageTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="gallery-image-title">{t('gallery.admin.title')}</Label>
            <Input id="gallery-image-title" className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="gallery-image-description">{t('gallery.admin.description')}</Label>
            <Textarea id="gallery-image-description" className="mt-1" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="gallery-image-sort-order">{t('gallery.admin.sortOrder')}</Label>
            <Input id="gallery-image-sort-order" className="mt-1" type="number" min={0} value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 0 })} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving || !canSave}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
