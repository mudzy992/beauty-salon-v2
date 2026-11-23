import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../../components/ui/dropdown-menu'
import type { UserRow } from './user-types'

const ROLES_MANAGED_IN_UI = ['SYSTEM_ADMIN', 'OWNER', 'CLIENT', 'STYLIST'] as const

const getRoleBadgeVariant = (roleName: string) => {
  if (roleName === 'SYSTEM_ADMIN') return 'danger'
  if (roleName === 'OWNER') return 'brand'
  if (roleName === 'STYLIST') return 'secondary'
  if (roleName === 'CLIENT') return 'success'
  return 'secondary'
}

type Props = {
  u: UserRow
  getUserRoles: (user: UserRow) => string[]
  getRoleLabel: (role: string) => string
  removalTriggerRef: MutableRefObject<HTMLButtonElement | null>
  handleRemoveRole: (userId: string, roleName: string) => Promise<void>
  handleAssignRole: (userId: string, roleName: string) => Promise<void>
}

export function UserRoleActions({ u, getUserRoles, getRoleLabel, removalTriggerRef, handleRemoveRole, handleAssignRole }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const getAvailableRolesToAssign = (u: UserRow) => {
    const current = getUserRoles(u)
    return ROLES_MANAGED_IN_UI.filter((r) => !current.includes(r))
  }

  const canRemoveRole = (roleName: string) => roleName !== 'CLIENT' && ROLES_MANAGED_IN_UI.includes(roleName as any)

  const roles = getUserRoles(u)
  const addable = getAvailableRolesToAssign(u)
  return (
    <div className="flex flex-wrap items-center gap-2">
      {roles.map((roleName) => {
        const isStylist = roleName === 'STYLIST'
        const isPending = isStylist && String(u.stylistProfile?.status ?? '').toUpperCase() === 'PENDING'
        return (
          <Badge key={roleName} variant="outlineStrong" data-users-role-chip className="gap-1 border-line bg-surface-muted px-2 py-1 font-medium text-[11px] text-content-strong">
            <Badge variant={getRoleBadgeVariant(roleName)} className="rounded-full px-2 py-0.5 text-[10px]">
              {getRoleLabel(roleName)}
            </Badge>
            {isStylist ? <span className="text-content-strong">{t('users.stylistRoleBadge')}</span> : null}
            {isPending ? (
              <Button
                type="button"
                variant="ghost"
                className="h-auto p-0 text-[10px] font-medium text-warn-fg underline underline-offset-2 hover:bg-transparent hover:text-warn-fg"
                onClick={() => navigate('/admin/stylists')}
              >
                {t('users.status.profileIncomplete')}
              </Button>
            ) : null}
            {canRemoveRole(roleName) ? (
              <Button
                type="button"
                variant="ghost"
                className="ml-1 h-6 w-6"
                aria-label={t('users.aria.removeRole', { role: getRoleLabel(roleName), username: u.username })}
                onClick={(event) => {
                  if (roleName === 'STYLIST') removalTriggerRef.current = event.currentTarget
                  void handleRemoveRole(u.id, roleName)
                }}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </Button>
            ) : null}
          </Badge>
        )
      })}

      {addable.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label={t('users.aria.addRole', { username: u.username })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {addable.map((r) => (
              <DropdownMenuItem key={r} onClick={() => void handleAssignRole(u.id, r)}>
                {getRoleLabel(r)}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin/stylists')}>{t('users.openStylists')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
