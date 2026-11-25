export type WorkGalleryPhotoRole = 'before' | 'after' | 'other'

export type EligibleEntry = {
  id: string
  completedAt: string | null
  date: string
  reference: string
  clientName: string
}

export type PendingPhoto = {
  id: string
  role: WorkGalleryPhotoRole
  private: boolean
  consented: boolean
}

export type PendingPair = {
  id: string
  completedAt: string | null
  date: string
  reference: string
  clientName: string
  images: PendingPhoto[]
}

export type PhotoRejection = 'type' | 'size' | null

export declare const WORK_GALLERY_PHOTO_MIMES: readonly ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export declare const WORK_GALLERY_MAX_PHOTO_BYTES: number

export declare function checkPhoto(file: { type: string; size: number }): PhotoRejection
export declare function isValidEligibleEntry(value: unknown): value is EligibleEntry
export declare function isValidPendingPair(value: unknown): value is PendingPair
export declare function isValidEligiblePage(
  data: unknown,
): data is { items: EligibleEntry[]; hasMore: boolean; nextOffset: number }
export declare function isValidPendingPage(
  data: unknown,
): data is { items: PendingPair[]; hasMore: boolean; nextOffset: number }
