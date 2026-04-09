import { useEffect, useMemo, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Menu } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar'
import { Button } from '../../../components/ui/button'
import { Drawer, DrawerContent } from '../../../components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { AppLogo } from '../../../components/brand/app-logo'
import { UploadedBrandLogo } from '../../../components/brand/uploaded-brand-logo'
import { useAuth } from '../../../context/AuthContext'
import { useSettings } from '../../../context/SettingsContext'
import { getClientMandatoryOnboardingPath } from '../../../utils/clientOnboarding'
import { getUploadUrl } from '../../../utils/uploadUrl'

const DEFAULT_MAINTENANCE_TEXT =
  'Radimo na poboljšanjima. Javna stranica je privremeno nedostupna. Pokušajte kasnije.'

const publicNav = [
  { path: '/', labelKey: 'public.nav.home' },
  { path: '/usluge', labelKey: 'public.nav.services' },
  { path: '/blog', labelKey: 'public.nav.blog' },
  { path: '/galerija', labelKey: 'public.nav.gallery' },
  { path: '/kontakt', labelKey: 'public.nav.contact' },
  { path: '/rezervacija', labelKey: 'public.nav.reserve' },
]

export const PublicLayout = () => {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { getSetting, settings, loading } = useSettings()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const step = getClientMandatoryOnboardingPath(user)
    if (step) navigate(step, { replace: true })
  }, [user, navigate])

  const appLogo = getSetting('app_logo', '')
  const appTitle = getSetting('app_title', t('app.title'))
  const appLogoSvgColor = getSetting('app_logo_svg_color', '#632238')
  const appLogoTextColor = getSetting('app_logo_text_color', '#632238')
  const appLogoAccent = getSetting('app_logo_accent', '#D4A843')
  const appLogoAnimated =
    getSetting('app_logo_animated', 'true').trim().toLowerCase() !== 'false'
  const hasLogo = !!appLogo?.trim()
  const maintenanceOn =
    String(settings['system_maintenance_mode'] ?? 'false').trim().toLowerCase() ===
    'true'
  const maintenanceMessage =
    getSetting('public_maintenance_message', '').trim() || DEFAULT_MAINTENANCE_TEXT

  const activePath = location.pathname
  const navItems = useMemo(
    () =>
      publicNav.map((item) => ({
        ...item,
        isActive:
          item.path === '/' ? activePath === '/' : activePath.startsWith(item.path),
      })),
    [activePath],
  )

  const canSeeAdmin =
    !!user && (['SYSTEM_ADMIN', 'OWNER'] as string[]).some((r) => user.roles.includes(r))
  const avatarInitials = (user?.username ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
  const avatarSrc = user?.avatar ? getUploadUrl(user.avatar) : ''

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm text-slate-600">{t('common.loading')}</div>
      </div>
    )
  }

  if (maintenanceOn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center space-y-4">
          {hasLogo ? (
            <div className="flex justify-center">
              <UploadedBrandLogo
                logoPath={appLogo}
                word={appTitle}
                svgColor={appLogoSvgColor}
                textColor={appLogoTextColor}
                className="app-logo--animated"
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <AppLogo
                title={appTitle}
                accent={appLogoAccent}
                svgColor={appLogoSvgColor}
                textColor={appLogoTextColor}
                animated={appLogoAnimated}
                className="scale-[1.05]"
              />
            </div>
          )}
          <div className="text-lg font-medium text-slate-900">
            Privremeno nedostupno
          </div>
          <div className="text-slate-600 whitespace-pre-wrap">
            {maintenanceMessage}
          </div>
          <div className="text-sm text-slate-500">
            Za administraciju otvorite <strong>/admin</strong> (prijava kao
            administrator).
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 flex-none">
            {hasLogo ? (
              <UploadedBrandLogo
                logoPath={appLogo}
                word={appTitle}
                svgColor={appLogoSvgColor}
                textColor={appLogoTextColor}
                className="app-logo--animated"
              />
            ) : (
              <AppLogo
                title={appTitle}
                accent={appLogoAccent}
                svgColor={appLogoSvgColor}
                textColor={appLogoTextColor}
                animated={appLogoAnimated}
              />
            )}
          </Link>

          <nav className="hidden lg:flex items-center justify-center gap-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={
                  item.isActive
                    ? 'px-3 py-2 text-sm font-semibold text-brand-gold'
                    : 'px-3 py-2 text-sm text-slate-700 hover:text-brand-gold'
                }
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-2 flex-none">
            {!user ? (
              <Link to="/login">
                <Button size="sm" variant="ghost">
                  Prijavi se
                </Button>
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Korisnički meni"
                    className="rounded-full"
                  >
                    <Avatar className="h-9 w-9">
                      {avatarSrc ? (
                        <AvatarImage
                          src={avatarSrc}
                          alt={user?.username ? `Profil: ${user.username}` : 'Profil'}
                        />
                      ) : null}
                      <AvatarFallback className="text-xs font-semibold">
                        {avatarInitials || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onSelect={() => {
                      navigate('/profil')
                    }}
                  >
                    Profil
                  </DropdownMenuItem>
                  {canSeeAdmin ? (
                    <DropdownMenuItem
                      onSelect={() => {
                        navigate('/admin')
                      }}
                    >
                      {t('app.admin')}
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
            )}
          </div>

          <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
            <Button
              type="button"
              aria-label="Meni"
              variant="outline"
              size="icon"
              className="lg:hidden border-slate-200 text-slate-700 hover:text-slate-900"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <DrawerContent className="p-5">
              <div className="h-full flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                  {hasLogo ? (
                    <UploadedBrandLogo
                      logoPath={appLogo}
                      word={appTitle}
                      svgColor={appLogoSvgColor}
                      textColor={appLogoTextColor}
                      className="app-logo--animated"
                    />
                  ) : (
                    <AppLogo
                      title={appTitle}
                      accent={appLogoAccent}
                      svgColor={appLogoSvgColor}
                      textColor={appLogoTextColor}
                      animated={appLogoAnimated}
                    />
                  )}
                </div>

                <div className="mt-5 grid gap-1 min-h-0 overflow-y-auto -mr-2 pr-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={
                        item.isActive
                          ? 'rounded-lg px-3 py-2 text-[15px] font-semibold text-brand-gold bg-brand-champagne/20'
                          : 'rounded-lg px-3 py-2 text-[15px] text-slate-800 hover:text-brand-gold hover:bg-slate-50'
                      }
                    >
                      {t(item.labelKey)}
                    </Link>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-slate-200 grid gap-1">
                  {user ? (
                    <>
                      <Link to="/rezervacija" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full" size="sm">{t('public.nav.reserve')}</Button>
                      </Link>
                      {(['SYSTEM_ADMIN', 'OWNER'] as string[]).some((r) =>
                        user.roles.includes(r),
                      ) ? (
                        <Link to="/admin" onClick={() => setMobileOpen(false)}>
                          <Button className="w-full" variant="outline" size="sm">
                            {t('app.admin')}
                          </Button>
                        </Link>
                      ) : null}
                      <Link to="/profil" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full" variant="ghost" size="sm">
                          Profil
                        </Button>
                      </Link>
                      <Button
                        className="w-full"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMobileOpen(false)
                          logout()
                        }}
                      >
                        {t('auth.logout')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setMobileOpen(false)}>
                        <Button className="w-full" variant="outline" size="sm">
                          Prijavi se
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-auto bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="text-center md:text-left">
            {hasLogo ? (
              <div className="flex md:justify-start justify-center">
                <UploadedBrandLogo
                  logoPath={appLogo}
                  word={appTitle}
                  svgColor={appLogoSvgColor}
                  textColor={appLogoTextColor}
                  className="app-logo--animated scale-[0.85] origin-left"
                />
              </div>
            ) : (
              <div className="text-sm font-semibold">{appTitle}</div>
            )}
            {getSetting('public_footer_text', '') ? (
              <div className="mt-2 text-sm text-slate-300 max-w-md">
                {getSetting('public_footer_text', '')}
              </div>
            ) : null}
          </div>
          <div className="text-sm text-slate-300 text-center md:text-left space-y-1">
            {getSetting('public_contact_address', '') ? (
              <div>{getSetting('public_contact_address', '')}</div>
            ) : null}
            {getSetting('public_contact_phone', '') ? (
              <div>{getSetting('public_contact_phone', '')}</div>
            ) : null}
            {getSetting('public_contact_email', '') ? (
              <div>{getSetting('public_contact_email', '')}</div>
            ) : null}
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-400 text-center">
            © {new Date().getFullYear()} {appTitle}. {t('public.footer.rights')}
          </div>
        </div>
      </footer>
    </div>
  )
}

