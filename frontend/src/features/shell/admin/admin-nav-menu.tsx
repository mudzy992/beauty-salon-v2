import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, ChartNoAxesCombined, CalendarDays, BookOpen, Wallet, Star, Store, Scissors, UserRound, UsersRound, FileText, Images, MessageSquareHeart, Settings, Smartphone, Bell, Mail, BarChart3, User, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Badge } from '../../../components/ui/badge'
import {
  adminNavGroups,
  adminNavItemHref,
  isAdminNavItemActive,
  type AdminNavItem,
} from './admin-nav'

// Every icon is decorative; the existing translated link text remains its accessible name.
const navigationIcons: Record<string, LucideIcon> = {
  'nav.home': LayoutDashboard,
  'nav.analytics': ChartNoAxesCombined,
  'nav.reservations': CalendarDays,
  'nav.dailyLog': BookOpen,
  'nav.finance': Wallet,
  'nav.loyalty': Star,
  'nav.salon': Store,
  'nav.services': Scissors,
  'nav.stylists': UserRound,
  'nav.users': UsersRound,
  'nav.blog': FileText,
  'nav.gallery': Images,
  'nav.reviews': MessageSquareHeart,
  'nav.settings': Settings,
  'nav.appReleases': Smartphone,
  'nav.notifications': Bell,
  'nav.emailSettings': Mail,
  'adminAnalytics.tabs.overview': BarChart3,
  'adminAnalytics.tabs.clients': User,
  'adminAnalytics.tabs.stylists': TrendingUp,
}

type Props = {
  pathname: string
  /** `location.search` — potreban jer M2 tabovi dijele isti `pathname`. */
  search?: string
  pendingBlogComments: number
  onNavigate?: () => void
  compact?: boolean
}

/**
 * `min-h-target` (44px) zadovoljava 2.5.5 AAA.
 * `bg-nav-active` + `text-brand-rose-text`:
 *   classic light 9.40:1 (#632238 na #F5E6CC) · classic dark 8.48:1 (#E5B3C5 na #3A1B27)
 *   Aurum light 7.73:1 (#554308 na #EFE6D4 — vlasnik redarkovao `--brand-primary-text` 2026-11-18 zbog AAA;
 *     ranije #7A5A12 = 5.14:1) · Aurum dark 7.57:1 (#D4AF6A na #2A2217);
 * prijašnji `text-brand-gold-text` na `bg-brand-champagne/20` bio je 4.35:1 (ispod 4.5:1).
 */
const linkClass = (compact: boolean, active: boolean) => {
  const base = compact
    ? 'flex min-h-target w-full items-center rounded-lg px-3 text-[15px]'
    : 'flex min-h-target w-full items-center rounded-md px-3 text-sm'
  return active
    ? `${base} bg-nav-active font-semibold text-brand-rose-text`
    : `${base} text-content hover:bg-surface-muted hover:text-brand-rose-text`
}

export const AdminNav = ({
  pathname,
  search,
  pendingBlogComments,
  onNavigate,
  compact = false,
}: Props) => {
  const { t } = useTranslation()
  const searchTab = new URLSearchParams(search ?? '').get('tab')

  return (
    <nav
      data-admin-navigation
      aria-label={t('shell.mainNavigation')}
      className={compact ? 'grid gap-1' : 'space-y-4'}
    >
      {adminNavGroups.map((group) => (
        <div key={group.labelKey}>
          <p
            data-admin-nav-group
            className={
              compact
                ? 'px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-content-strong'
                : 'px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-content-strong'
            }
          >
            {t(group.labelKey)}
          </p>
          <div className={compact ? 'grid gap-1' : 'grid gap-0.5'}>
            {group.items.map((item) => {
              const isBlog = item.path === '/admin/blog'
              const showPending = isBlog && pendingBlogComments > 0
              return (
                <AdminNavLink
                  key={adminNavItemHref(item)}
                  active={isAdminNavItemActive(pathname, item, searchTab)}
                  compact={compact}
                  item={item}
                  onNavigate={onNavigate}
                  pendingBlogComments={showPending ? pendingBlogComments : 0}
                />
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

const AdminNavLink = ({
  active,
  compact,
  item,
  onNavigate,
  pendingBlogComments,
}: {
  active: boolean
  compact: boolean
  item: AdminNavItem
  onNavigate?: () => void
  pendingBlogComments: number
}) => {
  const { t } = useTranslation()
  const Icon = navigationIcons[item.labelKey]
  // 2.4.9 / 2.5.3 — pod-pogledi analitike dijele naziv s stavkama za upravljanje
  // (npr. „Stilisti"), pa kontekst ide u pristupačno ime, a vidljivi tekst ostaje kratak.
  const ariaLabel = item.ariaLabelKey
    ? `${t(item.labelKey)} — ${t(item.ariaLabelKey)}`
    : undefined

  return (
    <Link
      to={adminNavItemHref(item)}
      onClick={onNavigate}
      className={linkClass(compact, active)}
      aria-label={ariaLabel}
      // WCAG 4.1.2 — trenutna stranica je označena programski, ne samo stilom.
      aria-current={active ? 'page' : undefined}
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-3">
          {Icon ? <Icon data-aurum-nav-icon aria-hidden="true" className="h-4 w-4 shrink-0" /> : null}
          <span className="truncate">{t(item.labelKey)}</span>
        </span>
        {pendingBlogComments > 0 ? (
          <Badge className="bg-rose-600 text-white hover:bg-rose-600">
            {pendingBlogComments}
          </Badge>
        ) : null}
      </span>
    </Link>
  )
}
