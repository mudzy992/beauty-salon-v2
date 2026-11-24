import { isWorkGalleryRevision } from './work-gallery-revision'

export type BeforeAfterPair = {
  id: string
  revision?: string
  before: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
  after: { pathOriginal: string; pathMedium?: string | null; pathThumb?: string | null }
}
export type BeforeAfterPage = { items: BeforeAfterPair[]; hasMore: boolean; nextOffset: number; orderRevision?: string }

export function isValidGalleryPage(data: BeforeAfterPage, offset: number, canManage: boolean): boolean {
  if (!data || !Array.isArray(data.items) || typeof data.hasMore !== 'boolean' || !Number.isSafeInteger(data.nextOffset) || data.nextOffset < 0 ||
      (data.hasMore && data.nextOffset <= offset) || (canManage && !isWorkGalleryRevision(data.orderRevision))) return false
  return data.items.every(pair => pair && typeof pair.id === 'string' && Boolean(pair.id) && (!canManage || isWorkGalleryRevision(pair.revision)) &&
    [pair.before, pair.after].every(image => image && typeof image.pathOriginal === 'string' && Boolean(image.pathOriginal.trim()) &&
      (image.pathMedium == null || typeof image.pathMedium === 'string') && (image.pathThumb == null || typeof image.pathThumb === 'string')))
}
