import { useTranslation } from 'react-i18next'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

import { MediaImage } from '../../components/media-image'
import { getUploadUrl } from '../../utils/uploadUrl'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import type { GalleryCategory, GalleryImage } from './gallery-types'

/**
 * Mreža slika odabrane kategorije (S9).
 *
 * Markup prenesen iz `pages/Gallery.tsx` bez promjene: iste `data-gallery-image-media`
 * / `data-gallery-image-meta` kuke (Aurum override u `globals.css` ih adresira),
 * isti `alt` izvor i iste akcije.
 */
export function GalleryImageGrid({
  categories,
  selectedCatId,
  images,
  loading,
  onEdit,
  onDelete,
  onAddImage,
}: {
  categories: GalleryCategory[]
  selectedCatId: string
  images: GalleryImage[]
  loading: boolean
  onEdit: (image: GalleryImage) => void
  onDelete: (imageId: string) => void
  onAddImage: () => void
}) {
  const { t } = useTranslation()

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {t('gallery.admin.selectedImageCount', { count: images.length })}
          </Badge>
          {categories.find((category) => category.id === selectedCatId)?.autoPublishConsentedPairs ? (
            <Badge variant="outline" className="text-[10px]">
              {t('gallery.admin.autoPairsBadge')}
            </Badge>
          ) : null}
          {loading ? <span className="text-xs text-content-muted">{t('gallery.admin.loadingImages')}</span> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-content-muted sm:max-w-md">
            {t('gallery.admin.addImageGuidance')}
          </p>
          <Button type="button" size="sm" onClick={onAddImage}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> {t('gallery.admin.addPhoto')}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-content-muted">
          <Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        </div>
      ) : images.length === 0 ? (
        <p className="text-sm text-content-muted">{t('common.noData')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => {
            const src =
              img.upload?.pathMedium || img.upload?.pathThumb || img.upload?.pathOriginal
                ? getUploadUrl(img.upload?.pathMedium || img.upload?.pathThumb || img.upload?.pathOriginal)
                : undefined
            return (
              <div key={img.id} className="group overflow-hidden rounded-lg border border-line ">
                <div data-gallery-image-media className="relative aspect-[4/3] bg-surface-muted">
                  <MediaImage src={src} alt={img.title ?? t('gallery.admin.galleryImageAlt')} className="h-full w-full object-cover" />
                  <div data-gallery-image-meta className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/40 p-2 opacity-100">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{img.title ?? t('gallery.admin.untitled')}</p>
                      <p className="truncate text-[10px] text-white/80">{t('gallery.admin.sortOrderValue', { value: img.sortOrder })}</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" aria-label={t('gallery.admin.edit')} onClick={() => onEdit(img)}>
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-white hover:bg-white/10" aria-label={t('gallery.admin.delete')} onClick={() => void onDelete(img.id)}>
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
