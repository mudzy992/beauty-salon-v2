import type { MutableRefObject, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Loader2, Mail } from 'lucide-react'
import { getUploadUrl } from '../../utils/uploadUrl'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { getUserDisplayName, initials } from './user-display'
import type { UserRow } from './user-types'

type Props = {
  u: UserRow
  renderRoles: (user: UserRow) => ReactNode
  resetLinkSendingId: string | null
  editTriggerRef: MutableRefObject<HTMLButtonElement | null>
  openEdit: (user: UserRow) => void
  handleIssueInitialPasswordResetLink: (user: UserRow) => void
  handleDeactivate: (id: string, username: string) => void
}
export function UserCard({ u, renderRoles, resetLinkSendingId, editTriggerRef, openEdit, handleIssueInitialPasswordResetLink, handleDeactivate }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={u.avatar ? getUploadUrl(u.avatar) : undefined} alt={getUserDisplayName(u)} />
            <AvatarFallback>{initials(u.firstName, u.lastName, u.username)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-content">{u.username}</p>
            <p className="text-sm text-content-strong ">{getUserDisplayName(u)}</p>
          </div>
        </div>
        <Badge variant={u.isActive ? 'success' : 'danger'} className="text-[10px]">
          {u.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-content-strong">{t('users.email')}</span>
          <span className="truncate text-content">{u.email ?? '-'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-content-strong">{t('users.phone')}</span>
          <span className="truncate text-content">{u.phone ?? '-'}</span>
        </div>
        <div className="space-y-2">
          <p className="text-content-strong">{t('users.roles')}</p>
          {renderRoles(u)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {u.mustChangePassword ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={resetLinkSendingId === u.id || !u.email || !u.isEmailVerified}
            title={
              u.email && u.isEmailVerified
                ? t('users.credentials.resetLinkAction')
                : t('users.credentials.resetLinkNeedsVerifiedEmail')
            }
            aria-label={t('users.aria.resetLink', { username: u.username })}
            onClick={() => void handleIssueInitialPasswordResetLink(u)}
          >
            {resetLinkSendingId === u.id ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            {t('users.credentials.resetLinkAction')}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" aria-label={t('users.aria.analytics', { username: u.username })} onClick={() => navigate(`/admin/analytics?tab=clients&userId=${u.id}`)}>
          {/* i18n: `users.aria.analytics` je ARIA ključ i glasi „Analitika klijenta
              {{username}}" — bez opcija bi se na ekranu ispisalo doslovno „{{username}}".
              Kao vidljiva labela, uz susjedno {t('common.edit')}, ide kratki ključ. */}
          {t('users.analytics')}
        </Button>
        <Button type="button" size="sm" aria-label={t('users.aria.edit', { username: u.username })} onClick={(event) => { editTriggerRef.current = event.currentTarget; openEdit(u) }}>
          {t('common.edit')}
        </Button>
        {u.isActive ? (
          <Button type="button" size="sm" variant="outline" aria-label={t('users.aria.deactivate', { username: u.username })} onClick={() => void handleDeactivate(u.id, u.username)}>
            {t('users.deactivate')}
          </Button>
        ) : null}
      </div>
    </Card>
  )

}
