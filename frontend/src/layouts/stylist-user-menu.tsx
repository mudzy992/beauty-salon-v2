import { useNavigate } from 'react-router-dom'
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
import { userInitials } from '../utils/user-initials.mjs'
import { labelWithVisibleText } from '../components/a11y/label-in-name.mjs'

/**
 * Korisnički meni stylist shell-a (S10).
 *
 * Izdvojeno iz `layouts/StylistLayout.tsx` bez promjene ponašanja:
 *  - `/profil` ostaje odredište (faza §3 — redirect semantika se ne dira),
 *  - prelazak na klijentski pogled je i dalje vidljiv samo `CLIENT` ulozi,
 *  - odjava briše sesiju i vraća na `/` (replace),
 *  - pristupačno ime dugmeta sadrži vidljive inicijale (WCAG 2.5.3).
 */
export function StylistUserMenu() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { logout, user } = useAuth()

  const roles = normalizeRoles(user?.roles)
  const canSwitchToClient = roles.includes('CLIENT')
  const avatarInitials = userInitials(user?.username, 'SS')
  const avatarSrc = user?.avatar ? getUploadUrl(user.avatar) : ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={labelWithVisibleText(t('shell.userMenu'), avatarInitials)}
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
            <AvatarFallback className="text-xs font-semibold">{avatarInitials}</AvatarFallback>
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
            if (logout()) navigate('/', { replace: true })
          }}
        >
          {t('auth.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
