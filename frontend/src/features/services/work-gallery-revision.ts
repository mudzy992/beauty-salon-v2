// Opaque optimistic-concurrency token; it is not an authorization secret.
export const isWorkGalleryRevision = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/.test(value)
