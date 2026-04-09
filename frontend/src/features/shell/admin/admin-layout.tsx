import { useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink, LogOut } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Drawer, DrawerContent } from '../../../components/ui/drawer'
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar'
import { AppLogo } from '../../../components/brand/app-logo'
import { UploadedBrandLogo } from '../../../components/brand/uploaded-brand-logo'
import { useAuth } from '../../../context/AuthContext'
import { useSettings } from '../../../context/SettingsContext'
import { getUploadUrl } from '../../../utils/uploadUrl'

type NavItem = { path: string; labelKey: string }

const navItems: NavItem[] = [
  { path: '/admin', labelKey: 'nav.home' },
  { path: '/admin/reservations', labelKey: 'nav.reservations' },
  { path: '/admin/daily-log', labelKey: 'nav.dailyLog' },
  { path: '/admin/salon', labelKey: 'nav.salon' },
  { path: '/admin/services', labelKey: 'nav.services' },
  { path: '/admin/stylists', labelKey: 'nav.stylists' },
  { path: '/admin/finance', labelKey: 'nav.finance' },
  { path: '/admin/blog', labelKey: 'nav.blog' },
  { path: '/admin/gallery', labelKey: 'nav.gallery' },
  { path: '/admin/reviews', labelKey: 'nav.reviews' },
  { path: '/admin/users', labelKey: 'nav.users' },
  { path: '/admin/client-analytics', labelKey: 'nav.clientAnalytics' },
  { path: '/admin/analytics', labelKey: 'nav.analytics' },
  { path: '/admin/settings', labelKey: 'nav.settings' },
  { path: '/admin/notifications', labelKey: 'nav.notifications' },
  { path: '/admin/email-settings', labelKey: 'nav.emailSettings' },
  { path: '/admin/loyalty', labelKey: 'nav.loyalty' },
]

export const AdminLayout = () => {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { getSetting } = useSettings()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const appLogo = getSetting('app_logo', '')
  const appTitle = getSetting('app_title', t('app.title'))
  const appLogoSvgColor = getSetting('app_logo_svg_color', '#632238')
  const appLogoTextColor = getSetting('app_logo_text_color', '#632238')
  const appLogoAccent = getSetting('app_logo_accent', '#D4A843')
  const appLogoAnimated =
    getSetting('app_logo_animated', 'true').trim().toLowerCase() !== 'false'
  const hasLogo = !!appLogo?.trim()

  const currentLabel = useMemo(() => {
    const match = navItems.find((x) => x.path === location.pathname)
    return match ? t(match.labelKey) : location.pathname
  }, [location.pathname, t])

  const adminInitials = (user?.username?.trim()?.[0] ?? 'A').toUpperCase()
  const adminAvatarSrc = user?.avatar ? getUploadUrl(user.avatar) : ''

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <DrawerContent className="p-5">
                <div className="h-full flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2">
                    {hasLogo ? (
                      <UploadedBrandLogo
                        logoPath={appLogo}
                        word={appTitle}
                        svgColor={appLogoSvgColor}
                        textColor={appLogoTextColor}
                        className={`app-logo--animated scale-[0.85] origin-left`}
                      />
                    ) : (
                      <AppLogo
                        title={appTitle}
                        accent={appLogoAccent}
                        svgColor={appLogoSvgColor}
                        textColor={appLogoTextColor}
                        animated={appLogoAnimated}
                        className="truncate"
                      />
                    )}
                  </div>

                  <div className="mt-4 flex items-center gap-3 min-w-0">
                    <Avatar className="h-11 w-11 shrink-0 ring-1 ring-slate-200">
                      {adminAvatarSrc ? (
                        <AvatarImage
                          src={adminAvatarSrc}
                          alt={user?.username ? `Profil: ${user.username}` : 'Profil'}
                        />
                      ) : null}
                      <AvatarFallback className="font-semibold">{adminInitials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {user?.username ?? 'Admin'}
                      </div>
                      {user?.email ? (
                        <div className="text-xs text-slate-500 truncate">{user.email}</div>
                      ) : null}
                    </div>
                  </div>

                  <nav className="mt-4 grid gap-1 min-h-0 overflow-y-auto -mr-2 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {navItems.map((item) => {
                      const isActive =
                        location.pathname === item.path ||
                        (item.path !== '/admin' &&
                          location.pathname.startsWith(item.path + '/'))
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          onClick={() => setSidebarOpen(false)}
                          className={
                            isActive
                              ? 'rounded-lg px-3 py-2 text-[15px] font-semibold text-brand-gold bg-brand-champagne/20'
                              : 'rounded-lg px-3 py-2 text-[15px] text-slate-800 hover:text-brand-gold hover:bg-slate-50'
                          }
                        >
                          {t(item.labelKey)}
                        </Link>
                      )
                    })}
                  </nav>

                  <div className="mt-auto pt-3 border-t border-slate-200 grid gap-1">
                    <Link to="/" onClick={() => setSidebarOpen(false)}>
                      <Button className="w-full" variant="outline" size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Pogledaj stranicu
                      </Button>
                    </Link>
                    <Button
                      className="w-full"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSidebarOpen(false)
                        logout()
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('auth.logout')}
                    </Button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            <Link to="/admin" className="flex items-center gap-2 min-w-0">
              {hasLogo ? (
                <UploadedBrandLogo
                  logoPath={appLogo}
                  word={appTitle}
                  svgColor={appLogoSvgColor}
                  textColor={appLogoTextColor}
                  className={`app-logo--animated scale-[0.85] origin-left`}
                />
              ) : (
                <AppLogo
                  title={appTitle}
                  accent={appLogoAccent}
                  svgColor={appLogoSvgColor}
                  textColor={appLogoTextColor}
                  animated={appLogoAnimated}
                  className="truncate"
                />
              )}
            </Link>

            <div className="hidden md:block text-sm text-slate-500 truncate">
              {currentLabel}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/" className="hidden md:block">
              <Button size="sm" variant="outline">
                Pogledaj stranicu
              </Button>
            </Link>

            <button
              type="button"
              aria-label="Admin meni"
              className="inline-flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
              onClick={() => setSidebarOpen(true)}
            >
              <Avatar className="h-9 w-9 ring-1 ring-slate-200">
                {adminAvatarSrc ? (
                  <AvatarImage
                    src={adminAvatarSrc}
                    alt={user?.username ? `Profil: ${user.username}` : 'Profil'}
                  />
                ) : null}
                <AvatarFallback className="font-semibold">{adminInitials}</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        <aside className="hidden lg:block">
          <nav className="rounded-lg border border-slate-200 bg-white p-2">
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path + '/'))
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={
                    isActive
                      ? 'block rounded-md px-3 py-2 text-sm font-semibold text-brand-gold bg-brand-champagne/20'
                      : 'block rounded-md px-3 py-2 text-sm text-slate-700 hover:text-brand-gold hover:bg-slate-50'
                  }
                >
                  {t(item.labelKey)}
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

