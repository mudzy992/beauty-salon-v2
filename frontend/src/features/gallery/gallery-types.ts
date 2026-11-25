/**
 * Tipovi admin galerije radova (S9).
 *
 * Izdvojeno iz `pages/Gallery.tsx` (koji je imao 628 linija) bez promjene
 * oblika podataka — ista polja, ista imena, ista upotreba u komponentama.
 */

export interface GalleryImage {
  id: string
  title: string | null
  description: string | null
  sortOrder: number
  uploadId?: string
  upload?: { pathOriginal: string; pathThumb: string | null; pathMedium: string | null }
}

export interface GalleryCategory {
  id: string
  name: string
  description: string | null
  sortOrder: number
  autoPublishConsentedPairs: boolean
  _count?: { images: number }
  images?: GalleryImage[]
}

/** Par prikladan za objavljivanje u galeriji (klijent je dao saglasnost). */
export interface EligibleGalleryImage {
  imageId: string
  uploadId: string
  consentId: string
  isBefore: boolean
  isAfter: boolean
  serviceName: string
  serviceDate: string
  previewUrl: string
}

export interface GalleryCategoryForm {
  name: string
  description: string
  sortOrder: number
  autoPublishConsentedPairs: boolean
}

export interface GalleryImageForm {
  title: string
  description: string
  sortOrder: number
}

/** Prazna forma kategorije — koristi se i za „novu“ i kao izvor za uređivanje. */
export const emptyGalleryCategoryForm = (): GalleryCategoryForm => ({
  name: '',
  description: '',
  sortOrder: 0,
  autoPublishConsentedPairs: false,
})

export const emptyGalleryImageForm = (): GalleryImageForm => ({
  title: '',
  description: '',
  sortOrder: 0,
})
