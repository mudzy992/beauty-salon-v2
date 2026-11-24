import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { getUploadUrl } from '../../utils/uploadUrl'
import type { DataTableColumn } from '../shell/admin/ui/data-table'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import type { UserRow } from './user-types'
import { getUserDisplayName, initials } from './user-display'
import { UserRoleActions } from './user-role-actions'
import { UserCard } from './user-card'
import { UserRowActions } from './user-row-actions'

type Props = {
  getUserRoles: (user: UserRow) => string[]
  getRoleLabel: (role: string) => string
  resetLinkSendingId: string | null
  editTriggerRef: MutableRefObject<HTMLButtonElement | null>
  removalTriggerRef: MutableRefObject<HTMLButtonElement | null>
  openEdit: (user: UserRow) => void
  handleRemoveRole: (userId: string, roleName: string) => Promise<void>
  handleAssignRole: (userId: string, roleName: string) => Promise<void>
  handleIssueInitialPasswordResetLink: (user: UserRow) => void
  handleDeactivate: (id: string, username: string) => void
}

export function useUserRowPresentation({ getUserRoles, getRoleLabel, resetLinkSendingId, editTriggerRef, removalTriggerRef, openEdit, handleRemoveRole, handleAssignRole, handleIssueInitialPasswordResetLink, handleDeactivate }: Props) {
  const { t } = useTranslation()
  const renderRoles = (u: UserRow) => (
    <UserRoleActions u={u} getUserRoles={getUserRoles} getRoleLabel={getRoleLabel} removalTriggerRef={removalTriggerRef}
      handleRemoveRole={handleRemoveRole} handleAssignRole={handleAssignRole} />
  )

  const userColumns: DataTableColumn<UserRow>[] = [
    {
      key: 'avatar',
      headerKey: 'users.table.avatar',
      className: 'w-[56px] p-3',
      render: (u) => (
        <Avatar className="h-9 w-9">
          <AvatarImage src={u.avatar ? getUploadUrl(u.avatar) : undefined} alt={getUserDisplayName(u)} />
          <AvatarFallback>{initials(u.firstName, u.lastName, u.username)}</AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: 'username',
      headerKey: 'users.username',
      className: 'p-3',
      render: (u) => (
        <span className="font-medium text-content">{u.username}</span>
      ),
    },
    {
      key: 'email',
      headerKey: 'users.email',
      className: 'p-3',
      render: (u) => (
        <div className="flex items-center gap-2">
          <span className="truncate">{u.email ?? '-'}</span>
          {u.email ? (
            <Badge variant={u.isEmailVerified ? 'success' : 'warning'} className="text-[10px]">
              {u.isEmailVerified ? t('users.status.emailVerified') : t('users.status.emailUnverified')}
            </Badge>
          ) : null}
          {u.mustChangePassword ? (
            <Badge variant="warning" className="text-[10px]">
              {t('users.credentials.changeRequired')}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'fullName',
      headerKey: 'users.table.fullName',
      className: 'p-3',
      render: (u) => [u.firstName, u.lastName].filter(Boolean).join(' ') || '-',
    },
    {
      key: 'phone',
      headerKey: 'users.phone',
      className: 'p-3',
      render: (u) => u.phone ?? '-',
    },
    {
      key: 'roles',
      headerKey: 'users.roles',
      className: 'p-3',
      render: (u) => renderRoles(u),
    },
    {
      key: 'status',
      headerKey: 'common.status',
      className: 'p-3',
      render: (u) => (
        <div className="flex flex-col items-end gap-1">
          <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
            {u.isActive ? t('common.active') : t('common.inactive')}
          </Badge>
          {u.mustChangePassword ? (
            <Badge variant="warning" className="text-[10px]">
              {t('users.credentials.changeRequired')}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'actions',
      headerKey: 'common.actions',
      align: 'right',
      className: 'p-3',
      render: (u) => (
        <UserRowActions u={u} resetLinkSendingId={resetLinkSendingId} editTriggerRef={editTriggerRef} openEdit={openEdit}
          handleIssueInitialPasswordResetLink={handleIssueInitialPasswordResetLink} handleDeactivate={handleDeactivate} />
      ),
    },
  ]

  const renderUserCard = (u: UserRow) => (
    <UserCard key={u.id} u={u} renderRoles={renderRoles} resetLinkSendingId={resetLinkSendingId}
      editTriggerRef={editTriggerRef} openEdit={openEdit} handleIssueInitialPasswordResetLink={handleIssueInitialPasswordResetLink}
      handleDeactivate={handleDeactivate} />
  )

  return { userColumns, renderUserCard }
}
