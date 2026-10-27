import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink, LogOut } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Drawer, DrawerContent } from '../../../components/ui/drawer'
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar'
import { useAuth } from '../../../context/AuthContext'
import { useSettings } from '../../../context/SettingsContext'
import api from '../../../api/client'
import { getUploadUrl } from '../../../utils/uploadUrl'
import { flatAdminNavItems } from './admin-nav'
import { AdminNav } from './admin-nav-menu'
import { AdminBrand, AdminUserMenu } from './admin-chrome'

export const AdminLayout = () => {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { getSetting } = useSettings()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingBlogComments, setPendingBlogComments] = useState(0)

  const brand = {
    hasLogo: !!getSetting('app_logo', '')?.trim(),
    appLogo: getSetting('app_logo', ''),
    appTitle: getSetting('app_title', t('app.title')),
    appLogoSvgColor: getSetting('app_logo_svg_color', '#632238'),
    appLogoTextColor: getSetting('app_logo_text_color', '#632238'),
    appLogoAccent: getSetting('app_logo_accent', '#D4A843'),
    appLogoAnimated:
      getSetting('app_logo_animated', 'true').trim().toLowerCase() !== 'false',
  }

  const currentLabel = useMemo(() => {
    const match = flatAdminNavItems().find(
      (x) =>
        location.pathname === x.path ||
        (x.path !== '/admin' && location.pathname.startsWith(`${x.path}/`)),
    )
    if (match) return t(match.labelKey)
    if (location.pathname.startsWith('/admin/client-analytics')) return t('nav.clientAnalytics')
    if (location.pathname.startsWith('/admin/stylist-analytics')) return t('nav.stylistAnalytics')
    return location.pathname
  }, [location.pathname, t])

  const adminInitials = (user?.username?.trim()?.[0] ?? 'A').toUpperCase()
  const adminAvatarSrc = user?.avatar ? getUploadUrl(user.avatar) : ''

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data } = await api.get<{ pending: number }>('/api/blog/comments/pending-count')
        if (!cancelled) setPendingBlogComments(Math.max(0, Number(data?.pending ?? 0) || 0))
      } catch {
        if (!cancelled) setPendingBlogComments(0)
      }
    }
    void load()
    const timer = window.setInterval(load, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <DrawerContent className="p-5">
                <div className="flex h-full flex-col overflow-hidden">
                  <div className="flex items-center gap-2">
                    <AdminBrand {...brand} />
                  </div>
                  <div className="mt-4 flex min-w-0 items-center gap-3">
                    <Avatar className="h-11 w-11 shrink-0 ring-1 ring-slate-200">
                      {adminAvatarSrc ? (
                        <AvatarImage
                          src={adminAvatarSrc}
                          alt={
                            user?.username
                              ? t('shell.profileForUser', { username: user.username })
                              : t('shell.profile')
                          }
                        />
                      ) : null}
                      <AvatarFallback className="font-semibold">{adminInitials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {user?.username ?? t('shell.adminName')}
                      </div>
                      {user?.email ? (
                        <div className="truncate text-xs text-slate-500">{user.email}</div>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mr-2 pr-2">
                    <AdminNav
                      pathname={location.pathname}
                      pendingBlogComments={pendingBlogComments}
                      onNavigate={() => setSidebarOpen(false)}
                      compact
                    />
                  </div>
                  <div className="mt-auto grid gap-1 border-t border-slate-200 pt-3">
                    <Link to="/" onClick={() => setSidebarOpen(false)}>
                      <Button className="w-full" variant="outline" size="sm">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('shell.viewSite')}
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
            <Link to="/admin" className="flex min-w-0 items-center gap-2">
              <AdminBrand {...brand} />
            </Link>
            <div className="hidden truncate text-sm text-slate-500 md:block">{currentLabel}</div>
          </div>
          <AdminUserMenu
            username={user?.username}
            email={user?.email}
            avatarSrc={adminAvatarSrc}
            initials={adminInitials}
            logout={logout}
            onOpenMobileNav={() => setSidebarOpen(true)}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <div className="rounded-lg border border-slate-200 bg-white p-2">
            <AdminNav pathname={location.pathname} pendingBlogComments={pendingBlogComments} />
          </div>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
