/**
 * WCAG 2.4.2 Page titled — svaka admin/stylist ruta dobija i18n ključ naslova.
 *
 * Vraća ključ, ne prevedeni tekst: prijevodi se rješavaju na mjestu renderovanja
 * (`SeoRouteDefaults`), čime BS/EN paritet ostaje pod kontrolom `check_i18n.py`.
 * Poredak je bitan — specifičnije rute moraju ići prije opštijih.
 */
const ADMIN_TITLES: Array<{ test: (path: string, tab: string | null) => boolean; key: string }> = [
  { test: (path) => path === '/admin', key: 'nav.home' },
  { test: (path) => path === '/admin/reservations/calendar', key: 'pageTitles.reservationsCalendar' },
  { test: (path) => path === '/admin/reservations', key: 'nav.reservations' },
  { test: (path) => path.startsWith('/admin/services') && path.endsWith('/work-gallery'), key: 'pageTitles.serviceWorkGallery' },
  { test: (path) => path === '/admin/services', key: 'nav.services' },
  // M2: sedam modula na /admin/settings?tab=… — specifičnije prije opštijeg.
  { test: (path, tab) => path === '/admin/settings' && tab === 'operations', key: 'pageTitles.settingsOperations' },
  { test: (path, tab) => path === '/admin/settings' && tab === 'appearance', key: 'pageTitles.settingsAppearance' },
  { test: (path, tab) => path === '/admin/settings' && tab === 'seo', key: 'pageTitles.settingsSeo' },
  { test: (path, tab) => path === '/admin/settings' && tab === 'email', key: 'nav.emailSettings' },
  { test: (path, tab) => path === '/admin/settings' && tab === 'notifications', key: 'nav.notifications' },
  { test: (path, tab) => path === '/admin/settings' && tab === 'releases', key: 'nav.appReleases' },
  { test: (path) => path === '/admin/settings', key: 'nav.settings' },
  { test: (path) => path === '/admin/users', key: 'nav.users' },
  { test: (path) => path === '/admin/salon', key: 'nav.salon' },
  { test: (path) => path === '/admin/stylists', key: 'nav.stylists' },
  { test: (path) => path === '/admin/daily-log', key: 'nav.dailyLog' },
  { test: (path) => path === '/admin/finance', key: 'nav.finance' },
  // M1 / Q7: client/stylist analitika su tabovi unutar /admin/analytics.
  { test: (path, tab) => path === '/admin/analytics' && tab === 'clients', key: 'nav.clientAnalytics' },
  { test: (path, tab) => path === '/admin/analytics' && tab === 'stylists', key: 'nav.stylistAnalytics' },
  { test: (path) => path === '/admin/analytics', key: 'nav.analytics' },
  { test: (path) => path === '/admin/loyalty', key: 'nav.loyalty' },
  { test: (path) => path === '/admin/blog', key: 'nav.blog' },
  { test: (path) => path === '/admin/gallery', key: 'nav.gallery' },
  { test: (path) => path === '/admin/reviews', key: 'nav.reviews' },
]

const STYLIST_TITLES: Array<{ test: (path: string) => boolean; key: string }> = [
  { test: (path) => path === '/stylist', key: 'shell.stylist.inbox' },
  { test: (path) => path === '/stylist/workbook/new', key: 'pageTitles.workbookNew' },
  { test: (path) => path === '/stylist/workbook', key: 'nav.dailyLog' },
  { test: (path) => path.startsWith('/stylist/workbook/reschedule-preview'), key: 'pageTitles.workbookReschedule' },
  { test: (path) => path.startsWith('/stylist/workbook/'), key: 'pageTitles.workbookDetail' },
  { test: (path) => path === '/stylist/schedule/new', key: 'pageTitles.scheduleNew' },
  { test: (path) => path === '/stylist/schedule', key: 'shell.stylist.schedule' },
  { test: (path) => path.startsWith('/stylist/schedule/'), key: 'pageTitles.scheduleDetail' },
  { test: (path) => path === '/stylist/debts', key: 'shell.stylist.debts' },
  { test: (path) => path === '/stylist/stats', key: 'shell.stylist.stats' },
]

const ONBOARDING_TITLES: Array<{ test: (path: string) => boolean; key: string }> = [
  { test: (path) => path === '/force-change-password', key: 'pageTitles.forceChangePassword' },
  { test: (path) => path === '/onboarding/gender', key: 'pageTitles.onboardingGender' },
  { test: (path) => path === '/onboarding/email', key: 'pageTitles.onboardingEmail' },
  { test: (path) => path === '/profile', key: 'pageTitles.profile' },
]

export const dashboardTitleKey = (pathname: string, search = ''): string => {
  const table = pathname.startsWith('/admin')
    ? ADMIN_TITLES
    : pathname.startsWith('/stylist')
      ? STYLIST_TITLES
      : ONBOARDING_TITLES

  // M1/M2: tabovi dijele pathname, pa naslov (2.4.2) mora gledati i ?tab=.
  const tab = new URLSearchParams(search).get('tab')
  return table.find(({ test }) => test(pathname, tab))?.key ?? 'pageTitles.notFound'
}
