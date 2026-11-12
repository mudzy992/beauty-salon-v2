export type AdminNavItem = {
  path: string
  labelKey: string
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
      { path: '/admin/analytics', labelKey: 'nav.analytics' },
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
      { path: '/admin/settings', labelKey: 'nav.settings', tab: 'site', tabDefault: true },
      { path: '/admin/settings', labelKey: 'nav.appReleases', tab: 'releases' },
      { path: '/admin/settings', labelKey: 'nav.notifications', tab: 'notifications' },
      { path: '/admin/settings', labelKey: 'nav.emailSettings', tab: 'email' },
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
