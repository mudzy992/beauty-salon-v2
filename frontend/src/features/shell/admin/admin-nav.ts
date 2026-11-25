export type AdminNavItem = {
  path: string
  labelKey: string
}

export type AdminNavGroup = {
  labelKey: string
  items: AdminNavItem[]
}

/**
 * Bočna traka je globalna mapa admin područja: **jedna stavka po području**,
 * a svaka stavka otvara tačno ono što piše u nazivu.
 *
 * Pod-pogledi jednog područja žive kao tabovi u njegovom hub-u — isti obrazac
 * kao `/admin/settings` (M2). Zato analitika ima jednu stavku („Analitika“),
 * a tri pogleda (Pregled / Klijenti / Stilisti) ostaju u tablistu na
 * `/admin/analytics` (S8). Time nema dupliranja navigacije niti linkova sa
 * istim nazivom i istim ciljem (WCAG 2.4.9), a stavka „Klijenti“ više ne
 * vodi na `/admin/users`.
 */
export const adminNavGroups: AdminNavGroup[] = [
  {
    labelKey: 'nav.sectionOverview',
    items: [
      { path: '/admin', labelKey: 'nav.home' },
    ],
  },
  {
    labelKey: 'nav.sectionAnalytics',
    items: [
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
    ],
  },
  {
    labelKey: 'nav.sectionPeople',
    items: [
      { path: '/admin/users', labelKey: 'nav.users' },
      { path: '/admin/stylists', labelKey: 'nav.stylists' },
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

/**
 * Aktivna stavka je ona čiji put odgovara trenutnoj ruti. `/admin` je tačan
 * match (ne prefiks), ostale putanje pokrivaju i pod-strane (`/admin/services/x`).
 */
export const isAdminNavItemActive = (
  pathname: string,
  item: AdminNavItem,
): boolean => {
  if (item.path === '/admin') return pathname === '/admin'
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}
