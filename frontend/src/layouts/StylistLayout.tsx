import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

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
import { useStylistPortalSocketRefresh } from '../features/stylist-portal/hooks/use-stylist-portal-socket-refresh'

type NavItem = { path: string; labelKey: string }

const navItems: NavItem[] = [
  { path: '/stylist/inbox', labelKey: 'shell.stylist.inbox' },
  { path: '/stylist/workbook', labelKey: 'nav.dailyLog' },
  { path: '/stylist/schedule', labelKey: 'shell.stylist.schedule' },
  { path: '/stylist/debts', labelKey: 'shell.stylist.debts' },
  { path: '/stylist/stats', labelKey: 'shell.stylist.stats' },
]

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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto max-w-[1600px] px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-4">
            <Link to="/stylist/inbox" className="font-semibold text-slate-900 dark:text-slate-50">
              {t('shell.stylist.title')}
            </Link>
            <nav className="sm:hidden -mx-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap">
              {navItems.map((x) => {
                const isActive =
                  location.pathname === x.path || location.pathname.startsWith(x.path + '/')
                return (
                  <Link
                    key={x.path}
                    to={x.path}
                    className={
                      isActive
                        ? 'shrink-0 rounded-md px-3 py-2 text-sm font-semibold text-brand-gold-text bg-brand-champagne/20'
                        : 'shrink-0 rounded-md px-3 py-2 text-sm text-slate-700 hover:text-brand-gold-text hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/40'
                    }
                  >
                    {t(x.labelKey)}
                  </Link>
                )
              })}
            </nav>
            <nav className="hidden sm:flex items-center gap-1">
              {navItems.map((x) => {
                const isActive =
                  location.pathname === x.path || location.pathname.startsWith(x.path + '/')
                return (
                  <Link
                    key={x.path}
                    to={x.path}
                    className={
                      isActive
                        ? 'rounded-md px-3 py-2 text-sm font-semibold text-brand-gold-text bg-brand-champagne/20'
                        : 'rounded-md px-3 py-2 text-sm text-slate-700 hover:text-brand-gold-text hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900/40'
                    }
                  >
                    {t(x.labelKey)}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('shell.userMenu')}
                >
                  <Avatar className="h-9 w-9 ring-1 ring-slate-200 dark:ring-slate-800">
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

      <main className="mx-auto max-w-[1600px] px-4 py-4">
        <Outlet />
      </main>
    </div>
  )
}

