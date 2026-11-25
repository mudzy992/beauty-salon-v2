import type { MutableRefObject, RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ExternalLink, LogOut } from 'lucide-react'

import { Button } from '../../../components/ui/button'
import { Drawer, DrawerContent } from '../../../components/ui/drawer'
import { DialogTitle } from '../../../components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar'
import { AdminBrand } from './admin-chrome'
import { AdminNav } from './admin-nav-menu'

type Brand = {
  hasLogo: boolean
  appLogo: string
  appTitle: string
  appLogoSvgColor: string
  appLogoTextColor: string
  appLogoAccent: string
  appLogoAnimated: boolean
}

type Props = {
  brand: Brand
  username?: string
  email?: string | null
  avatarSrc: string
  initials: string
  sidebarOpen: boolean
  onOpenChange: (open: boolean) => void
  onNavigate: () => void
  onLogout: () => void
  pathname: string
  pendingBlogComments: number
  mobileNavTrigger: RefObject<HTMLButtonElement | null>
  navigationClosing: MutableRefObject<boolean>
}

/**
 * Mobilna navigacija admin omotača (ladica).
 *
 * Zatvaranje ladice vraća fokus na dugme koje ju je otvorilo, osim kad je
 * razlog zatvaranja bila navigacija — tada fokus ide na novu stranicu.
 */
export function AdminMobileNav({
  brand,
  username,
  email,
  avatarSrc,
  initials,
  sidebarOpen,
  onOpenChange,
  onNavigate,
  onLogout,
  pathname,
  pendingBlogComments,
  mobileNavTrigger,
  navigationClosing,
}: Props) {
  const { t } = useTranslation()
  return (
    <Drawer open={sidebarOpen} onOpenChange={onOpenChange}>
      <DrawerContent id="admin-mobile-navigation" className="p-5" onCloseAutoFocus={(event) => {
        event.preventDefault()
        if (!navigationClosing.current) mobileNavTrigger.current?.focus()
        navigationClosing.current = false
      }}>
        <DialogTitle className="sr-only">{t('shell.adminMenu')}</DialogTitle>
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <AdminBrand {...brand} />
          </div>
          <div className="mt-4 flex min-w-0 items-center gap-3">
            <Avatar className="h-11 w-11 shrink-0 ring-1 ring-line">
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
              <div className="truncate text-sm font-semibold text-content">
                {username ?? t('shell.adminName')}
              </div>
              {email ? (
                <div className="truncate text-xs text-content-strong">{email}</div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mr-2 pr-2">
            <AdminNav
              pathname={pathname}
              pendingBlogComments={pendingBlogComments}
              onNavigate={onNavigate}
              compact
            />
          </div>
          <div className="mt-auto grid gap-1 border-t border-line pt-3">
            <Button asChild className="w-full" variant="outline" size="sm">
              <Link to="/" onClick={onNavigate}>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('shell.viewSite')}
              </Link>
            </Button>
            <Button
              className="w-full"
              variant="outline"
              size="sm"
              onClick={() => {
                onNavigate()
                onLogout()
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
