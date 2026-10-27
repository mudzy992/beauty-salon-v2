import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink, LogOut } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu'
import { AppLogo } from '../../../components/brand/app-logo'
import { UploadedBrandLogo } from '../../../components/brand/uploaded-brand-logo'
import { LanguageSwitcher } from '../../../components/i18n/language-switcher'

type BrandProps = {
  hasLogo: boolean
  appLogo: string
  appTitle: string
  appLogoSvgColor: string
  appLogoTextColor: string
  appLogoAccent: string
  appLogoAnimated: boolean
}

export const AdminBrand = ({
  hasLogo,
  appLogo,
  appTitle,
  appLogoSvgColor,
  appLogoTextColor,
  appLogoAccent,
  appLogoAnimated,
}: BrandProps) =>
  hasLogo ? (
    <UploadedBrandLogo
      logoPath={appLogo}
      word={appTitle}
      svgColor={appLogoSvgColor}
      textColor={appLogoTextColor}
      className="app-logo--animated scale-[0.85] origin-left"
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
  )

type UserMenuProps = {
  username?: string
  email?: string | null
  avatarSrc: string
  initials: string
  logout: () => void
  onOpenMobileNav: () => void
}

export const AdminUserMenu = ({
  username,
  email,
  avatarSrc,
  initials,
  logout,
  onOpenMobileNav,
}: UserMenuProps) => {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2">
      <LanguageSwitcher />
      <button
        type="button"
        aria-label={t('shell.adminMenu')}
        className="inline-flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring lg:hidden"
        onClick={onOpenMobileNav}
      >
        <Avatar className="h-9 w-9 ring-1 ring-slate-200">
          {avatarSrc ? (
            <AvatarImage
              src={avatarSrc}
              alt={
                username
                  ? t('shell.profileForUser', { username })
                  : t('shell.profile')
              }
            />
          ) : null}
          <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
        </Avatar>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('shell.adminMenu')}
            className="hidden items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-ring lg:inline-flex"
          >
            <Avatar className="h-9 w-9 ring-1 ring-slate-200">
              {avatarSrc ? (
                <AvatarImage
                  src={avatarSrc}
                  alt={
                    username
                      ? t('shell.profileForUser', { username })
                      : t('shell.profile')
                  }
                />
              ) : null}
              <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[318px] p-3">
          <div className="mt-4 flex min-w-0 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0 ring-1 ring-slate-200">
              {avatarSrc ? (
                <AvatarImage
                  src={avatarSrc}
                  alt={
                    username
                      ? t('shell.profileForUser', { username })
                      : t('shell.profile')
                  }
                />
              ) : null}
              <AvatarFallback className="font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{username ?? t('shell.adminName')}</div>
              {email ? <div className="truncate text-xs text-slate-500">{email}</div> : null}
            </div>
          </div>
          <DropdownMenuSeparator className="my-3" />
          <div className="grid gap-1">
            <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
              <Link to="/" className="w-full">
                <Button className="w-full" variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('shell.viewSite')}
                </Button>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="p-0 focus:bg-transparent"
              onSelect={(e) => {
                e.preventDefault()
                logout()
              }}
            >
              <Button className="w-full" variant="outline" size="sm">
                <LogOut className="mr-2 h-4 w-4" />
                {t('auth.logout')}
              </Button>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
