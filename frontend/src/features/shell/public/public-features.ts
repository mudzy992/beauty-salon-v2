export function isPublicFeatureOn(
  getSetting: (key: string, fallback: string) => string,
  key: 'public_feature_blog' | 'public_feature_gallery' | 'public_feature_reviews',
): boolean {
  return getSetting(key, 'true').trim().toLowerCase() !== 'false'
}
