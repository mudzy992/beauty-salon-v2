import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { formatDateOnlyLocale } from '../../../../shared/business-date.mjs'
import { getIntlLocale } from '../../i18n/locale-utils.mjs'
import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { Button } from '../../components/ui/button'
import type { EligibleGalleryImage } from './gallery-types'

/**
 * Sekcija „objavljena fotografija sa saglasnošću klijenta“ (S9).
 *
 * Izdvojeno iz `gallery-add-image-dialog.tsx` bez promjene: isti radio
 * (`name="eligible-gallery-image"`), isti prikaz datuma (`formatDateOnlyLocale`
 * sa `getIntlLocale`) i isti uslov za omogućavanje dugmeta.
 */
export function GalleryConsentedImageSection({
  eligibleImages,
  eligibleLoading,
  eligibleSelectedId,
  setEligibleSelectedId,
  addingImage,
  onAddConsented,
}: {
  eligibleImages: EligibleGalleryImage[]
  eligibleLoading: boolean
  eligibleSelectedId: string | null
  setEligibleSelectedId: (id: string | null) => void
  addingImage: boolean
  onAddConsented: () => void
}) {
  const { t, i18n } = useTranslation()

  return (
    <section className="space-y-4 rounded-xl border border-line p-4">
            <div>
              <h3 className="font-semibold text-content">{t('gallery.admin.consentedSectionTitle')}</h3>
              <p className="mt-1 text-xs leading-5 text-content-strong">
                {t('gallery.admin.consentedSectionGuidance')}
              </p>
            </div>
            {eligibleLoading ? (
              <div className="flex items-center gap-2 text-sm text-content-muted">
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> {t('gallery.admin.loadingEligibleImages')}
              </div>
            ) : eligibleImages.length === 0 ? (
              <p className="text-sm text-content-muted">{t('gallery.admin.noEligibleImages')}</p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {eligibleImages.map((image) => (
                  <label
                    key={image.imageId}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-2 hover:bg-surface-muted"
                  >
                    <input
                      type="radio"
                      name="eligible-gallery-image"
                      checked={eligibleSelectedId === image.imageId}
                      onChange={() => setEligibleSelectedId(image.imageId)}
                      className="h-4 w-4 accent-brand-rose"
                    />
                    <MediaImage
                      src={getUploadUrl(image.previewUrl)}
                      alt=""
                      className="h-14 w-14 rounded-md object-cover"
                    />
                    <span className="min-w-0 text-xs text-content-strong">
                      <span className="block font-semibold">{image.isBefore ? t('gallery.admin.before') : t('gallery.admin.after')} · {image.serviceName}</span>
                      <span className="block text-content-muted">{formatDateOnlyLocale(image.serviceDate.slice(0, 10), getIntlLocale(i18n.language), { dateStyle: 'medium' })}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!eligibleSelectedId || eligibleLoading || addingImage}
              onClick={onAddConsented}
            >
              {addingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : null}
              {t('gallery.admin.addConsentedPhoto')}
            </Button>
    </section>
  )
}
