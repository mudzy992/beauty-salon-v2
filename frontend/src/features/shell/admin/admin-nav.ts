export type AdminNavItem = {
  path: string
  labelKey: string
  /** Match active for nested paths (e.g. /admin/finance?tab=) */
  matchPrefix?: string
}

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
    ],
  },
  {
    labelKey: 'nav.sectionSalon',
    items: [
      { path: '/admin/salon', labelKey: 'nav.salon' },
      { path: '/admin/services', labelKey: 'nav.services' },
      { path: '/admin/stylists', labelKey: 'nav.stylists' },
    ],
  },
  {
    labelKey: 'nav.sectionFinance',
    items: [
      { path: '/admin/finance', labelKey: 'nav.finance' },
      { path: '/admin/loyalty', labelKey: 'nav.loyalty' },
    ],
  },
  {
    labelKey: 'nav.sectionPeople',
    items: [{ path: '/admin/users', labelKey: 'nav.users' }],
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
      { path: '/admin/notifications', labelKey: 'nav.notifications' },
      { path: '/admin/email-settings', labelKey: 'nav.emailSettings' },
    ],
  },
]

export const flatAdminNavItems = (): AdminNavItem[] =>
  adminNavGroups.flatMap((g) => g.items)

export const isAdminNavItemActive = (
  pathname: string,
  item: AdminNavItem,
): boolean => {
  if (item.path === '/admin') return pathname === '/admin'
  return pathname === item.path || pathname.startsWith(`${item.path}/`)
}
