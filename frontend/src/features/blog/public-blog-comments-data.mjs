const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isComment = (value) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  value.id.trim().length > 0 &&
  typeof value.content === 'string' &&
  typeof value.createdAt === 'string' &&
  !Number.isNaN(Date.parse(value.createdAt)) &&
  isRecord(value.user) &&
  typeof value.user.firstName === 'string' &&
  typeof value.user.lastName === 'string'

/** Validates paginated and legacy-array public blog comment responses. */
export function parsePublicBlogComments(payload, requestedLimit, requestedOffset) {
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) return null
  if (!Number.isInteger(requestedOffset) || requestedOffset < 0) return null

  if (Array.isArray(payload)) {
    if (!payload.every(isComment)) return null
    return {
      items: payload,
      total: payload.length,
      limit: requestedLimit,
      offset: requestedOffset,
      hasMore: false,
      nextOffset: requestedOffset + payload.length,
    }
  }

  if (!isRecord(payload) || !Array.isArray(payload.items)) return null
  const { total, limit, offset, hasMore, nextOffset } = payload
  if (
    !Number.isInteger(total) ||
    total < 0 ||
    limit !== requestedLimit ||
    offset !== requestedOffset ||
    typeof hasMore !== 'boolean' ||
    !Number.isInteger(nextOffset) ||
    nextOffset !== requestedOffset + payload.items.length ||
    nextOffset > total ||
    payload.items.length > requestedLimit ||
    (hasMore && (payload.items.length === 0 || nextOffset >= total)) ||
    !payload.items.every(isComment)
  ) {
    return null
  }

  return { items: payload.items, total, limit, offset, hasMore, nextOffset }
}
