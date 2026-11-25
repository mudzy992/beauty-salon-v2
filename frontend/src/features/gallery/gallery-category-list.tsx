import { useTranslation } from 'react-i18next'
import { Pencil, Trash2 } from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import type { GalleryCategory } from './gallery-types'

/**
 * Lista kategorija admin galerije (S9).
 *
 * Markup je prenesen iz `pages/Gallery.tsx` **bez promjene**: isti `<Card>`,
 * isti `<button>` za izbor kategorije i isti `aria-pressed`. Kontrakt koji to
 * zaključuje (`admin-gallery-keyboard.test.mjs`) ostaje isti — promijenjena je
 * samo putanja fajla u testu, ne i sama tvrdnja.
 */
export function GalleryCategoryList({
  categories,
  selectedCatId,
  loadImages,
  onEdit,
  onDelete,
}: {
  categories: GalleryCategory[]
  selectedCatId: string | null
  loadImages: (categoryId: string) => void
  onEdit: (category: GalleryCategory) => void
  onDelete: (categoryId: string) => void
}) {
  const { t } = useTranslation()

  if (categories.length === 0) {
    return <p className="text-sm text-content-muted">{t('common.noData')}</p>
  }

  return (
    <div className="space-y-2">
      {categories.map((c) => (
        <Card
          key={c.id}
          className={[
            'p-4 transition-shadow hover:shadow-md motion-reduce:transition-none',
            selectedCatId === c.id ? 'border-brand-gold-ring bg-brand-champagne/10' : '',
          ].join(' ')}
        >
          <div data-gallery-category-row className="flex items-center justify-between gap-3">
            {/* 2.1.1: izbor kategorije MORA biti pravo <button>. `Card` renderuje običan
                <div> (`components/ui/card.tsx:7`), pa `onClick` na njemu tastaturnom
                korisniku nije bio dostupan — a ovo je JEDINI put do `loadImages`, koji
                postavlja `selectedCatId`. Bez toga se galerija ne može ni otvoriti
                tastaturom. Fokus pokriva globalno pravilo `globals.css:208`.
                <span> umjesto <p>: <p> nije dozvoljen sadržaj unutar <button>. */}
            <button
              type="button"
              onClick={() => void loadImages(c.id)}
              aria-pressed={selectedCatId === c.id}
              className="min-w-0 flex-1 cursor-pointer rounded text-left"
            >
              <span data-gallery-category-name className="block truncate font-semibold text-content">
                {c.name}
              </span>
              <span className="mt-1 block text-xs text-content-muted">
                {c.autoPublishConsentedPairs
                  ? t('gallery.admin.autoCategorySummary', { count: c._count?.images ?? 0 })
                  : t('gallery.admin.imageCount', { count: c._count?.images ?? 0 })}{' '}
                | {t('gallery.admin.sortOrderValue', { value: c.sortOrder })}
              </span>
            </button>
            <div className="flex shrink-0 gap-1">
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('gallery.admin.edit')} onClick={() => onEdit(c)}>
                <Pencil className="h-4 w-4 text-brand-rose-text" aria-hidden="true" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={t('gallery.admin.delete')} onClick={() => void onDelete(c.id)}>
                <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
