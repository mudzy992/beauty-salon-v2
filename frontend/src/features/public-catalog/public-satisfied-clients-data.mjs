const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isOptionalPath = (value) =>
  value === undefined || value === null || (typeof value === 'string' && value.trim().length > 0)

const isImage = (value) =>
  isRecord(value) &&
  typeof value.pathOriginal === 'string' &&
  value.pathOriginal.trim().length > 0 &&
  isOptionalPath(value.pathMedium) &&
  isOptionalPath(value.pathThumb)

const isPair = (value) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.trim().length > 0 &&
  isImage(value.before) &&
  isImage(value.after)

/** Validates a page of public client transformations against its requested offset. */
export function parsePublicSatisfiedClientsPage(payload, requestedLimit, requestedOffset) {
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) return null
  if (!Number.isInteger(requestedOffset) || requestedOffset < 0) return null
  if (!isRecord(payload) || !Array.isArray(payload.items)) return null

  const { hasMore, nextOffset } = payload
  const items = payload.items
  if (
    items.length > requestedLimit ||
    !items.every(isPair) ||
    typeof hasMore !== 'boolean' ||
    !Number.isInteger(nextOffset) ||
    nextOffset !== requestedOffset + items.length ||
    (hasMore && items.length === 0)
  ) {
    return null
  }

  return { items, hasMore, nextOffset }
}
