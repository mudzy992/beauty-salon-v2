const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isOptionalPath = (value) =>
  value === undefined || value === null || typeof value === 'string'

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

/** Validates the public homepage before/after response. */
export function parsePublicHomeBeforeAfter(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.items)) return null
  return payload.items.every(isPair) ? payload.items : null
}
