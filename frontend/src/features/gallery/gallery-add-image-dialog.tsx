import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { GalleryConsentedImageSection } from './gallery-consented-image-section'
import { GalleryManualUploadSection } from './gallery-manual-upload-section'
import type { EligibleGalleryImage } from './gallery-types'

/**
 * Dijalog „dodaj fotografiju“ u admin galeriji (S9).
 *
 * Dva odvojena puta dodavanja, oba zadržana bez promjene:
 *  1. upload fajla koji **nije** vezan za klijenta (uz potvrdu), i
 *  2. dodavanje već objavljene fotografije sa saglasnošću klijenta.
 *
 * `htmlFor`/`id` par `gallery-manual-file` je isti, pa ostaje garancija 1.3.1.
 */
export function GalleryAddImageDialog({
  open,
  onOpenChange,
  eligibleImages,
  eligibleLoading,
  eligibleSelectedId,
  setEligibleSelectedId,
  manualFile,
  setManualFile,
  manualTitle,
  setManualTitle,
  nonClientConfirmed,
  setNonClientConfirmed,
  addingImage,
  onAddConsented,
  onUploadNonClient,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  eligibleImages: EligibleGalleryImage[]
  eligibleLoading: boolean
  eligibleSelectedId: string | null
  setEligibleSelectedId: (id: string | null) => void
  manualFile: File | null
  setManualFile: (file: File | null) => void
  manualTitle: string
  setManualTitle: (title: string) => void
  nonClientConfirmed: boolean
  setNonClientConfirmed: (confirmed: boolean) => void
  addingImage: boolean
  onAddConsented: () => void
  onUploadNonClient: () => void
}) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('gallery.admin.addImageTitle')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-2">
          <GalleryManualUploadSection
            manualFile={manualFile}
            setManualFile={setManualFile}
            manualTitle={manualTitle}
            setManualTitle={setManualTitle}
            nonClientConfirmed={nonClientConfirmed}
            setNonClientConfirmed={setNonClientConfirmed}
            addingImage={addingImage}
            onUploadNonClient={onUploadNonClient}
          />

          <GalleryConsentedImageSection
            eligibleImages={eligibleImages}
            eligibleLoading={eligibleLoading}
            eligibleSelectedId={eligibleSelectedId}
            setEligibleSelectedId={setEligibleSelectedId}
            addingImage={addingImage}
            onAddConsented={onAddConsented}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('gallery.admin.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
