/**
 * Private work-gallery pairs: shared shapes and pure validation helpers.
 *
 * The module is plain ESM so the Node test can exercise it without a bundler.
 */

export const WORK_GALLERY_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const WORK_GALLERY_MAX_PHOTO_BYTES = 10 * 1024 * 1024

/** `null` means the file may be sent; otherwise the reason it was rejected. */
export const checkPhoto = (file) => {
  if (!WORK_GALLERY_PHOTO_MIMES.includes(file?.type)) return 'type'
  if (!Number.isFinite(file?.size) || file.size > WORK_GALLERY_MAX_PHOTO_BYTES) return 'size'
  return null
}

const isText = (value) => typeof value === 'string'

const isDateText = (value) => isText(value) && /^\d{4}-\d{2}-\d{2}$/.test(value)

const isIsoDate = (value) => value === null || (isText(value) && Number.isFinite(Date.parse(value)))

export const isValidEligibleEntry = (value) => {
  if (!value || typeof value !== 'object') return false
  const entry = value
  return (
    isText(entry.id) && entry.id.length > 0 &&
    isIsoDate(entry.completedAt) &&
    isDateText(entry.date) &&
    isText(entry.reference) && entry.reference.length > 0 &&
    isText(entry.clientName)
  )
}

export const isValidPendingPair = (value) => {
  if (!value || typeof value !== 'object') return false
  const pair = value
  if (
    !isText(pair.id) || pair.id.length === 0 ||
    !isIsoDate(pair.completedAt) ||
    !isDateText(pair.date) ||
    !isText(pair.reference) || pair.reference.length === 0 ||
    !isText(pair.clientName) ||
    !Array.isArray(pair.images)
  ) return false
  return pair.images.every((image) => {
    if (!image || typeof image !== 'object') return false
    return (
      isText(image.id) && image.id.length > 0 &&
      (image.role === 'before' || image.role === 'after' || image.role === 'other') &&
      typeof image.private === 'boolean' &&
      typeof image.consented === 'boolean'
    )
  })
}

const isValidPage = (data, isValidItem) => {
  if (!data || typeof data !== 'object') return false
  return (
    Array.isArray(data.items) && data.items.every(isValidItem) &&
    typeof data.hasMore === 'boolean' &&
    Number.isSafeInteger(data.nextOffset) && data.nextOffset >= 0
  )
}

export const isValidEligiblePage = (data) => isValidPage(data, isValidEligibleEntry)

export const isValidPendingPage = (data) => isValidPage(data, isValidPendingPair)
