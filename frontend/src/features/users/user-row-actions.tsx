import type { MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Eye, Loader2, Mail, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import type { UserRow } from './user-types'

type Props = {
  u: UserRow; resetLinkSendingId: string | null; editTriggerRef: MutableRefObject<HTMLButtonElement | null>
  openEdit: (user: UserRow) => void; handleIssueInitialPasswordResetLink: (user: UserRow, trigger: HTMLButtonElement) => void
  handleDeactivate: (id: string, username: string, trigger: HTMLButtonElement) => void
}
export function UserRowActions({ u, resetLinkSendingId, editTriggerRef, openEdit, handleIssueInitialPasswordResetLink, handleDeactivate }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
        <div className="flex justify-end gap-1">
          {u.mustChangePassword ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="h-8 w-8"
              disabled={resetLinkSendingId === u.id || !u.email || !u.isEmailVerified}
              title={
                u.email && u.isEmailVerified
                  ? t('users.credentials.resetLinkAction')
                  : t('users.credentials.resetLinkNeedsVerifiedEmail')
              }
              aria-label={t('users.aria.resetLink', { username: u.username })}
              onClick={(event) => void handleIssueInitialPasswordResetLink(u, event.currentTarget)}
            >
              {resetLinkSendingId === u.id ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Mail className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t('users.aria.analytics', { username: u.username })}
            onClick={() => navigate(`/admin/analytics?tab=clients&userId=${u.id}`)}
          >
            <Eye className="h-4 w-4 text-teal-600" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            aria-label={t('users.aria.edit', { username: u.username })}
            onClick={(event) => { editTriggerRef.current = event.currentTarget; openEdit(u) }}
          >
            <Pencil className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </Button>
          {u.isActive ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={t('users.aria.deactivate', { username: u.username })}
              onClick={(event) => void handleDeactivate(u.id, u.username, event.currentTarget)}
            >
              <Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
  )
}
