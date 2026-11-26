import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Inbox, BookOpen, CalendarDays, Wallet, ChartNoAxesCombined } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type StylistNavItem = { path: string; labelKey: string }

/**
 * Navigacija stylist portala (S10).
 *
 * Izdvojeno iz `layouts/StylistLayout.tsx` bez promjene: ista 5 stavki, isti
 * redoslijed, iste ikone, **ista programska oznaka aktivne stavke**
 * (`aria-current="page"`) i isti oblik (pozadina + podebljani tekst, ne samo
 * boja).
 *
 * Gornji nav specifičan za stylist ostaje (Q4 — razlike u sadržaju navigacije
 * po ulozi se ne brišu).
 */
export const STYLIST_NAV_ITEMS: StylistNavItem[] = [
  { path: '/stylist/inbox', labelKey: 'shell.stylist.inbox' },
  { path: '/stylist/workbook', labelKey: 'nav.dailyLog' },
  { path: '/stylist/schedule', labelKey: 'shell.stylist.schedule' },
  { path: '/stylist/debts', labelKey: 'shell.stylist.debts' },
  { path: '/stylist/stats', labelKey: 'shell.stylist.stats' },
]

const navIcons: Record<string, LucideIcon> = {
  '/stylist/inbox': Inbox,
  '/stylist/workbook': BookOpen,
  '/stylist/schedule': CalendarDays,
  '/stylist/debts': Wallet,
  '/stylist/stats': ChartNoAxesCombined,
}

export const isStylistNavItemActive = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`)

export const stylistNavLinkClass = (active: boolean) =>
  active
    ? 'flex min-h-target shrink-0 items-center rounded-md bg-nav-active px-3 text-sm font-semibold text-brand-rose-text'
    : 'flex min-h-target shrink-0 items-center rounded-md px-3 text-sm text-content hover:bg-surface-muted hover:text-brand-rose-text'

const StylistNavLink = ({ item, pathname }: { item: StylistNavItem; pathname: string }) => {
  const { t } = useTranslation()
  const active = isStylistNavItemActive(pathname, item.path)
  const Icon = navIcons[item.path]

  return (
    <Link
      to={item.path}
      className={stylistNavLinkClass(active)}
      // WCAG 4.1.2 — trenutna stranica je označena programski, ne samo stilom.
      aria-current={active ? 'page' : undefined}
    >
      {Icon ? <Icon data-aurum-nav-icon aria-hidden="true" className="mr-2 h-4 w-4 shrink-0" /> : null}
      {t(item.labelKey)}
    </Link>
  )
}

/**
 * Glavna navigacija stylist portala (S10).
 *
 * Jedna navigacijska landmarka (WCAG 1.3.1); responzivnost rješava CSS.
 */
export function StylistNav() {
  const { t } = useTranslation()
  const location = useLocation()

  return (
    <nav
      aria-label={t('shell.mainNavigation')}
      className="-mx-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap sm:mx-0 sm:overflow-visible sm:whitespace-normal"
    >
      {STYLIST_NAV_ITEMS.map((item) => (
        <StylistNavLink key={item.path} item={item} pathname={location.pathname} />
      ))}
    </nav>
  )
}
