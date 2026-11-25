/**
 * Tipovi admin objava verzija aplikacije (S9).
 *
 * Izdvojeno iz `pages/AppReleases.tsx` bez promjene oblika podataka.
 */

export type ReleaseStatus = 'DRAFT' | 'PUBLISHED' | 'RETIRED'

export interface AppRelease {
  id: string
  version: string
  versionCode: number
  minSupportedVersionCode: number
  forceUpdate: boolean
  apkSizeBytes: number
  releaseNotes: string | null
  status: ReleaseStatus
}

/** Varijanta `Badge`-a po statusu objave (isto mapiranje kao prije). */
export const statusVariant = (s: ReleaseStatus): 'warning' | 'success' | 'default' => {
  if (s === 'PUBLISHED') return 'success'
  if (s === 'DRAFT') return 'warning'
  return 'default'
}
