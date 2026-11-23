export const CONSENT_PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** The caller provides eligible images in the same stable order as the public feed. */
export function selectBeforeAfterPair<T extends { id: string; isBefore: boolean; isAfter: boolean }>(images: T[]): { before: T; after: T } | null {
  const before = images.find((image) => image.isBefore);
  const after = images.find((image) => image.isAfter && image.id !== before?.id);
  return before && after ? { before, after } : null;
}
