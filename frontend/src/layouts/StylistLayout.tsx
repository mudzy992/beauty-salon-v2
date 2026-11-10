import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HelpCircle } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Button } from '../components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu'
import { useAuth } from '../context/AuthContext'
import { normalizeRoles } from '../utils/clientOnboarding'
import { getUploadUrl } from '../utils/uploadUrl'
import { LanguageSwitcher } from '../components/i18n/language-switcher'
import { useFocusOnNavigate } from '../hooks/use-focus-on-navigate'
import { useStylistPortalSocketRefresh } from '../features/stylist-portal/hooks/use-stylist-portal-socket-refresh'
import { SkipLink } from '../features/shell/admin/ui/skip-link'
import { labelWithVisibleText } from '../components/a11y/label-in-name.mjs';

type NavItem = { path: string; labelKey: string }

const navItems: NavItem[] = [
  { path: '/stylist/inbox', labelKey: 'shell.stylist.inbox' },
  { path: '/stylist/workbook', labelKey: 'nav.dailyLog' },
  { path: '/stylist/schedule', labelKey: 'shell.stylist.schedule' },
  { path: '/stylist/debts', labelKey: 'shell.stylist.debts' },
  { path: '/stylist/stats', labelKey: 'shell.stylist.stats' },
]

const isStylistNavItemActive = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`)

const stylistNavLinkClass = (active: boolean) =>
  active
    ? 'flex min-h-target shrink-0 items-center rounded-md bg-nav-active px-3 text-sm font-semibold text-brand-rose-text'
    : 'flex min-h-target shrink-0 items-center rounded-md px-3 text-sm text-content hover:bg-surface-muted hover:text-brand-rose-text'

const StylistNavLink = ({ item, pathname }: { item: NavItem; pathname: string }) => {
  const { t } = useTranslation()
  const active = isStylistNavItemActive(pathname, item.path)

  return (
    <Link
      to={item.path}
      className={stylistNavLinkClass(active)}
      // WCAG 4.1.2 — trenutna stranica je označena programski, ne samo stilom.
      aria-current={active ? 'page' : undefined}
    >
      {t(item.labelKey)}
    </Link>
  )
}

export default function StylistLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { logout, user } = useAuth()

  const roles = normalizeRoles(user?.roles)
  const canSwitchToClient = roles.includes('CLIENT')
  const avatarInitials = (user?.username ?? 'S')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const avatarSrc = user?.avatar ? getUploadUrl(user.avatar) : ''

  useStylistPortalSocketRefresh()
  // WCAG 2.4.3 — fokus prati promjenu rute.
  useFocusOnNavigate()

  return (
    <div className="admin-shell min-h-screen bg-surface-sunken">
      <SkipLink targetId="main" />
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-4">
            <Link to="/stylist/inbox" className="font-semibold text-content">
              {t('shell.stylist.title')}
            </Link>
            {/* WCAG 1.3.1 — jedna navigacijska landmarka; responsivnost rješava CSS. */}
            <nav
              aria-label={t('shell.mainNavigation')}
              className="-mx-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap sm:mx-0 sm:overflow-visible sm:whitespace-normal"
            >
              {navItems.map((item) => (
                <StylistNavLink key={item.path} item={item} pathname={location.pathname} />
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* WCAG 3.2.6 — pomoć je na istom mjestu kao u admin panelu. */}
            <Link
              to="/kontakt"
              className="flex min-h-target min-w-target items-center justify-center rounded-md text-content-muted hover:bg-surface-muted hover:text-content"
            >
              <HelpCircle aria-hidden className="h-5 w-5" />
              <span className="sr-only">{t('shell.help')}</span>
            </Link>
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={labelWithVisibleText(t('shell.userMenu'), avatarInitials || 'S')}
                >
                  <Avatar className="h-9 w-9 ring-1 ring-line">
                    {avatarSrc ? (
                      <AvatarImage
                        src={avatarSrc}
                        alt={
                          user?.username
                            ? t('shell.profileForUser', { username: user.username })
                            : t('shell.profile')
                        }
                      />
                    ) : null}
                    <AvatarFallback className="text-xs font-semibold">
                      {avatarInitials || 'S'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  onSelect={() => {
                    navigate('/profil')
                  }}
                >
                  {t('shell.profile')}
                </DropdownMenuItem>
                {canSwitchToClient ? (
                  <DropdownMenuItem
                    onSelect={() => {
                      navigate('/')
                    }}
                  >
                    {t('shell.switchToClient')}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    logout()
                    navigate('/', { replace: true })
                  }}
                >
                  {t('auth.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* WCAG 2.4.1/2.4.3 — skip link cilja ovaj landmark. */}
      <main id="main" tabIndex={-1} className="mx-auto max-w-[1600px] px-4 py-4 outline-none">
        <Outlet />
      </main>
    </div>
  )
}
