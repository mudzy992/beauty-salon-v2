import type { SettingGroup } from './types'
import { SITE_MODULE_GROUPS } from './groups-site-modules'
import { SITE_PAGE_GROUPS } from './groups-site-pages'

/**
 * Sve grupe postavki „Site” (S9).
 *
 * `groups-site.ts` je podijeljen u `groups-site-pages.ts` (javni sadržaj) i
 * `groups-site-modules.ts` (galerija, blog, prijava, moduli, komentari) da
 * nijedan modul ne prelazi ~150 linija. **Redoslijed grupa je isti kao
 * prije** — `SITE_PAGE_GROUPS` pa `SITE_MODULE_GROUPS`.
 */
export const SITE_GROUPS: SettingGroup[] = [...SITE_PAGE_GROUPS, ...SITE_MODULE_GROUPS]
