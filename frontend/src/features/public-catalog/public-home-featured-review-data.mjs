const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isRating = (value) => Number.isInteger(value) && value >= 1 && value <= 5

const isOptionalString = (value) =>
  value === undefined || value === null || typeof value === 'string'

const isNullableString = (value) => value === null || typeof value === 'string'

const isUser = (value) =>
  value === undefined ||
  value === null ||
  (isRecord(value) &&
    isNullableString(value.firstName) &&
    isNullableString(value.lastName) &&
    isOptionalString(value.avatar))

const isService = (value) =>
  value === undefined ||
  value === null ||
  (isRecord(value) && typeof value.name === 'string')

/** Returns undefined for malformed data, null for no public review, or a validated review. */
export function parsePublicHomeFeaturedReview(payload) {
  if (payload === null) return null
  if (
    !isRecord(payload) ||
    typeof payload.id !== 'string' ||
    payload.id.trim().length === 0 ||
    !isRating(payload.serviceRating) ||
    (payload.stylistRating !== null && !isRating(payload.stylistRating)) ||
    !isNullableString(payload.comment) ||
    !isUser(payload.user) ||
    !isService(payload.service)
  ) {
    return undefined
  }

  return payload
}
