import { useTranslation } from 'react-i18next'
import { Loader2, Plus } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

/**
 * Sekcija „fotografija bez klijenta“ (S9).
 *
 * Izdvojeno iz `gallery-add-image-dialog.tsx` bez promjene: isti `htmlFor`/`id`
 * par `gallery-manual-file` / `gallery-manual-title` (garancija 1.3.1), isti
 * checkbox potvrde i isti uslov za omogućavanje dugmeta
 * (`!manualFile || !nonClientConfirmed || addingImage`).
 */
export function GalleryManualUploadSection({
  manualFile,
  setManualFile,
  manualTitle,
  setManualTitle,
  nonClientConfirmed,
  setNonClientConfirmed,
  addingImage,
  onUploadNonClient,
}: {
  manualFile: File | null
  setManualFile: (file: File | null) => void
  manualTitle: string
  setManualTitle: (title: string) => void
  nonClientConfirmed: boolean
  setNonClientConfirmed: (confirmed: boolean) => void
  addingImage: boolean
  onUploadNonClient: () => void
}) {
  const { t } = useTranslation()

  return (
    <section className="space-y-4 rounded-xl border border-line p-4">
            <div>
              <h3 className="font-semibold text-content">{t('gallery.admin.nonClientSectionTitle')}</h3>
              <p className="mt-1 text-xs leading-5 text-content-strong">
                {t('gallery.admin.nonClientSectionGuidance')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gallery-manual-file">{t('gallery.admin.photo')}</Label>
              <input
                id="gallery-manual-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => setManualFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-content-strong file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gallery-manual-title">{t('gallery.admin.optionalTitle')}</Label>
              <Input
                id="gallery-manual-title"
                value={manualTitle}
                onChange={(event) => setManualTitle(event.target.value)}
                maxLength={200}
              />
            </div>
            <label className="flex items-start gap-2 text-xs leading-5 text-content-strong">
              <input
                type="checkbox"
                checked={nonClientConfirmed}
                onChange={(event) => setNonClientConfirmed(event.target.checked)}
                className="mt-1 h-4 w-4 accent-brand-rose"
              />
              <span>{t('gallery.admin.nonClientConfirmation')}</span>
            </label>
            <Button
              type="button"
              size="sm"
              disabled={!manualFile || !nonClientConfirmed || addingImage}
              onClick={onUploadNonClient}
            >
              {addingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Plus className="mr-2 h-4 w-4" aria-hidden="true" />}
              {t('gallery.admin.uploadNonClientPhoto')}
            </Button>
    </section>
  )
}
