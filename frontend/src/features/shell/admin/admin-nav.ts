export type AdminNavItem = {
  path: string
  labelKey: string
  /**
   * Opcioni kontekst za pristupačno ime linka (2.4.9 / 2.5.3). Vidljivi tekst
   * ostaje `labelKey`, a `aria-label` postaje `${labelKey} — ${ariaLabelKey}`
   * (npr. „Stilisti — analitika" da se razlikuje od stavke „Stilisti" za
   * upravljanje u grupi Salon).
   */
  ariaLabelKey?: string
  /** Match active for nested paths (e.g. /admin/finance?tab=) */
  matchPrefix?: string
  /**
   * M2: stavka cilja tab hub-a (`/admin/settings?tab=…`). Više stavki dijeli
   * isti `path`, pa se aktivno stanje ne može riješiti samo po pathname-u.
   */
  tab?: string
  /** Zadani tab svoje rute — aktivna i kad `?tab=` nedostaje. */
  tabDefault?: boolean
}

/** Href stavke, uklj. `?tab=` ako ga ima. */
export const adminNavItemHref = (item: AdminNavItem): string =>
  item.tab ? `${item.path}?tab=${item.tab}` : item.path

export type AdminNavGroup = {
  labelKey: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    labelKey: 'nav.sectionOverview',
    items: [
      { path: '/admin', labelKey: 'nav.home' },
    ],
  },
  {
    // M1/Q7 — pod-pogledi analitike (`?tab=`) su grupisani ovdje umjesto kao
    // zaseban tab-menu na vrhu stranice, čime se uklanja dupliranje navigacije.
    labelKey: 'nav.sectionAnalytics',
    items: [
      { path: '/admin/analytics', labelKey: 'adminAnalytics.tabs.overview', tab: 'overview', tabDefault: true, ariaLabelKey: 'adminAnalytics.tabContext' },
      { path: '/admin/analytics', labelKey: 'adminAnalytics.tabs.clients', tab: 'clients', ariaLabelKey: 'adminAnalytics.tabContext' },
      { path: '/admin/analytics', labelKey: 'adminAnalytics.tabs.stylists', tab: 'stylists', ariaLabelKey: 'adminAnalytics.tabContext' },
    ],
  },
  {
    labelKey: 'nav.sectionOperational',
    items: [
      { path: '/admin/reservations', labelKey: 'nav.reservations' },
      { path: '/admin/daily-log', labelKey: 'nav.dailyLog' },
      { path: '/admin/finance', labelKey: 'nav.finance' },
      { path: '/admin/loyalty', labelKey: 'nav.loyalty' },
    ],
  },
  {
    labelKey: 'nav.sectionSalon',
    items: [
      { path: '/admin/salon', labelKey: 'nav.salon' },
      { path: '/admin/services', labelKey: 'nav.services' },
      { path: '/admin/stylists', labelKey: 'nav.stylists' },
      { path: '/admin/users', labelKey: 'nav.users' },
    ],
  },
  {
    labelKey: 'nav.sectionContent',
    items: [
      { path: '/admin/blog', labelKey: 'nav.blog' },
      { path: '/admin/gallery', labelKey: 'nav.gallery' },
      { path: '/admin/reviews', labelKey: 'nav.reviews' },
    ],
  },
  {
    labelKey: 'nav.sectionSystem',
    items: [
      { path: '/admin/settings', labelKey: 'nav.settings' },
    ],
  },
]

export const flatAdminNavItems = (): AdminNavItem[] =>
  adminNavGroups.flatMap((g) => g.items)

export const isAdminNavItemActive = (
  pathname: string,
  item: AdminNavItem,
  searchTab?: string | null,
): boolean => {
  if (item.tab) {
    if (pathname !== item.path) return false
    if (item.tabDefault) return !searchTab || searchTab === item.tab
    return searchTab === item.tab
  }
  if (item.path === '/admin') return pathname === '/admin'
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}
