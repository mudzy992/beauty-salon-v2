const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0

const isDateString = (value) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))

const isOptionalString = (value) =>
  value === undefined || value === null || typeof value === 'string'

const isBlogPost = (value) =>
  isRecord(value) &&
  isNonEmptyString(value.id) &&
  isNonEmptyString(value.title) &&
  isNonEmptyString(value.slug) &&
  typeof value.isPublished === 'boolean' &&
  isDateString(value.createdAt) &&
  (value.publishedAt === null || isDateString(value.publishedAt)) &&
  isOptionalString(value.excerpt) &&
  isOptionalString(value.heroImage) &&
  // WCAG 3.1.2 — jezik članka; opciono zbog starijeg keša (vidi public-blog-post-data).
  isOptionalString(value.language)

/**
 * Validates the public blog list response while preserving the legacy array form.
 * Returns null for malformed rows or inconsistent pagination metadata.
 */
export function parsePublicBlogListPage(payload, requestedLimit, requestedOffset) {
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) return null
  if (!Number.isInteger(requestedOffset) || requestedOffset < 0) return null

  if (Array.isArray(payload)) {
    if (!payload.every(isBlogPost)) return null
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
    (hasMore && (payload.items.length === 0 || nextOffset >= total)) ||
    !payload.items.every(isBlogPost)
  ) {
    return null
  }

  return { items: payload.items, total, limit, offset, hasMore, nextOffset }
}
