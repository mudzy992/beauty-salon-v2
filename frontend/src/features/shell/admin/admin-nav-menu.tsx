import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutDashboard, ChartNoAxesCombined, CalendarDays, BookOpen, Wallet, Star, Store, Scissors, UserRound, UsersRound, FileText, Images, MessageSquareHeart, Settings, Smartphone, Bell, Mail } from 'lucide-react'
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
 * `bg-nav-active` + `text-brand-rose-text` daje 9.39:1 (light) / 8.47:1 (dark);
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
                ? 'px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-content-muted'
                : 'px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-content-muted'
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

  return (
    <Link
      to={adminNavItemHref(item)}
      onClick={onNavigate}
      className={linkClass(compact, active)}
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
