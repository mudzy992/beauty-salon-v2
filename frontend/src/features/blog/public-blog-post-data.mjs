const isRecord = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0

const isDateString = (value) =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value))

const isOptionalString = (value) =>
  value === undefined || value === null || typeof value === 'string'

const isOptionalDate = (value) =>
  value === undefined || value === null || isDateString(value)

/** Validates the published blog detail shape and ensures it matches the route slug. */
export function parsePublicBlogPost(payload, requestedSlug) {
  if (
    !isRecord(payload) ||
    !isNonEmptyString(requestedSlug) ||
    !isNonEmptyString(payload.id) ||
    !isNonEmptyString(payload.title) ||
    payload.slug !== requestedSlug ||
    typeof payload.content !== 'string' ||
    !isOptionalString(payload.excerpt) ||
    !isOptionalString(payload.seoTitle) ||
    !isOptionalString(payload.seoDescription) ||
    !isOptionalString(payload.heroImage) ||
    !isOptionalString(payload.ogImage) ||
    (payload.noIndex !== undefined && typeof payload.noIndex !== 'boolean') ||
    (payload.publishedAt !== null && !isDateString(payload.publishedAt)) ||
    !isOptionalDate(payload.updatedAt)
  ) {
    return null
  }

  return payload
}
