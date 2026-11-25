import type { Route } from '@playwright/test'

/**
 * Read fixtures for the private work-gallery pair endpoints.
 *
 * The admin gallery page loads the eligible records as soon as an owner opens
 * it. Specs that only test the gallery, the order or the visibility therefore
 * have to answer those two reads as well, otherwise the upload panel reports a
 * load error and its alert collides with the alerts the spec asserts on.
 */
export const mockWorkGalleryUploadReads = async (route: Route): Promise<boolean> => {
  if (route.request().method() !== 'GET') return false
  const path = new URL(route.request().url()).pathname
  if (!path.startsWith('/api/services/admin/work-gallery/')) return false
  if (!path.endsWith('/eligible-entries') && !path.endsWith('/pending-consent')) return false
  await route.fulfill({ json: { items: [], hasMore: false, nextOffset: 0 } })
  return true
}
