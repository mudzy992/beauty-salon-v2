import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { HelpCircle } from 'lucide-react'

import { useAuth } from '../../../context/AuthContext'
import { useSettings } from '../../../context/SettingsContext'
import api from '../../../api/client'
import { getUploadUrl } from '../../../utils/uploadUrl'
import { userInitials } from '../../../utils/user-initials.mjs'
import { useFocusOnNavigate } from '../../../hooks/use-focus-on-navigate'
import { flatAdminNavItems, isAdminNavItemActive } from './admin-nav'
import { AdminNav } from './admin-nav-menu'
import { AdminBrand } from './admin-chrome'
import { AdminUserMenu } from './admin-user-menu'
import { AdminMobileNav } from './admin-mobile-nav'
import { SkipLink } from './ui/skip-link'

export const AdminLayout = () => {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { getSetting } = useSettings()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const mobileNavTrigger = useRef<HTMLButtonElement>(null)
  const navigationClosing = useRef(false)
  const closeForNavigation = () => {
    navigationClosing.current = true
    setSidebarOpen(false)
  }
  const [pendingBlogComments, setPendingBlogComments] = useState(0)

  // WCAG 2.4.3 — fokus prati promjenu rute umjesto da ostane na početku dokumenta.
  useFocusOnNavigate()

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
    const searchTab = new URLSearchParams(location.search).get('tab')
    // Analitika je jedna stavka u traci; zaglavlje imenuje otvoreni pogled.
    if (location.pathname === '/admin/analytics') {
      if (searchTab === 'clients') return t('nav.clientAnalytics')
      if (searchTab === 'stylists') return t('nav.stylistAnalytics')
      return t('nav.analytics')
    }
    const match = flatAdminNavItems().find((item) =>
      isAdminNavItemActive(location.pathname, item),
    )
    return match ? t(match.labelKey) : location.pathname
  }, [location.pathname, location.search, t])

  const adminInitials = userInitials(user?.username, 'AA')
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
    <div className="admin-shell min-h-screen bg-surface-sunken">
      <SkipLink targetId="main" />
      <header data-admin-header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <AdminMobileNav
              brand={brand}
              username={user?.username}
              email={user?.email}
              avatarSrc={adminAvatarSrc}
              initials={adminInitials}
              sidebarOpen={sidebarOpen}
              onOpenChange={setSidebarOpen}
              onNavigate={closeForNavigation}
              onLogout={logout}
              pathname={location.pathname}
              pendingBlogComments={pendingBlogComments}
              mobileNavTrigger={mobileNavTrigger}
              navigationClosing={navigationClosing}
            />
            <Link to="/admin" className="flex min-w-0 items-center gap-2">
              <AdminBrand {...brand} />
            </Link>
            <div data-admin-current-label className="hidden truncate text-sm text-content-strong md:block">{currentLabel}</div>
          </div>
          {/* WCAG 3.2.6 — pomoć je na istom mjestu na svakom admin ekranu. */}
          <Link
            to="/kontakt"
            className="flex min-h-target min-w-target items-center justify-center rounded-md text-content-strong hover:bg-surface-muted hover:text-content"
          >
            <HelpCircle aria-hidden className="h-5 w-5" />
            <span className="sr-only">{t('shell.help')}</span>
          </Link>
          <AdminUserMenu
            username={user?.username}
            email={user?.email}
            avatarSrc={adminAvatarSrc}
            initials={adminInitials}
            logout={logout}
            mobileNavOpen={sidebarOpen}
            mobileNavTriggerRef={mobileNavTrigger}
            onOpenMobileNav={() => { navigationClosing.current = false; setSidebarOpen(true) }}
          />
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[220px_1fr]">
        <aside data-admin-sidebar className="hidden lg:block">
          <div className="rounded-lg border border-line bg-surface p-2">
            <AdminNav pathname={location.pathname} pendingBlogComments={pendingBlogComments} />
          </div>
        </aside>
        {/* WCAG 2.4.1/2.4.3 — skip link cilja ovaj landmark; tabIndex=-1 ga čini fokusabilnim. */}
        <main id="main" tabIndex={-1} data-route-main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
