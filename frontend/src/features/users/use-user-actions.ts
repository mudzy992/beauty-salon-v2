import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAppToast } from '../../lib/toast/useAppToast'
import type { AdminConfirmRequest } from '../shell/admin/ui/admin-confirm-dialog'
import type { UserRow } from './user-types'

type Params = {
  loadData: () => void
  showApiError: (error: unknown, fallbackKey: string) => void
  getRoleLabel: (roleName: string) => string
  openRemoveStylist: (userId: string) => Promise<void>
}
export function useUserActions({ loadData, showApiError, getRoleLabel, openRemoveStylist }: Params) {
  const { t } = useTranslation()
  const { success, warning } = useAppToast()
  const [resetLinkSendingId, setResetLinkSendingId] = useState<string | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<AdminConfirmRequest | null>(null)
  const assigningUsersRef = useRef(new Set<string>())
  const [assigningUsers, setAssigningUsers] = useState<Set<string>>(() => new Set())

  const handleIssueInitialPasswordResetLink = (user: UserRow) => {
    if (!user.mustChangePassword) return
    if (!user.email || !user.isEmailVerified) {
      warning(t('users.credentials.resetLinkNeedsVerifiedEmail'))
      return
    }
    setConfirmRequest({
      title: t('common.confirmTitle'),
      description: t('users.credentials.resetLinkConfirm', { email: user.email }),
      confirmLabel: t('common.confirm'),
      action: async () => {
        setResetLinkSendingId(user.id)
        try {
          await api.post(`/auth/admin/users/${encodeURIComponent(user.id)}/password-reset-link`)
          success(t('users.credentials.resetLinkSent'))
          loadData()
        } catch (err) {
          showApiError(err, 'users.errors.passwordResetLinkFailed')
        } finally {
          setResetLinkSendingId(null)
        }
      },
    })
  }

  const handleDeactivate = (id: string, username: string) => {
    setConfirmRequest({
      title: t('common.confirmTitle'),
      description: t('users.confirmDeactivate', { username }),
      confirmLabel: t('common.confirm'),
      action: async () => {
        try {
          await api.patch(`/api/users/${id}`, { isActive: false })
          success(t('users.toast.deactivated'))
          loadData()
        } catch (err) {
          showApiError(err, 'users.errors.deactivateFailed')
        }
      },
    })
  }

  const handleAssignRole = (userId: string, username: string, roleName: string, trigger: HTMLButtonElement | null) => {
    if (assigningUsersRef.current.has(userId)) return
    setConfirmRequest({
      title: t('common.confirmTitle'),
      description: t('users.confirmAssignRole', { username, role: getRoleLabel(roleName) }),
      confirmLabel: t('common.confirm'),
      isDestructive: false,
      trigger,
      action: async () => {
        if (assigningUsersRef.current.has(userId)) return
        assigningUsersRef.current.add(userId)
        setAssigningUsers(new Set(assigningUsersRef.current))
        try {
          await api.post(`/api/users/${userId}/roles`, { role: roleName })
          if (roleName === 'STYLIST') {
            success(t('users.toast.stylistPendingTitle'), t('users.toast.stylistPendingDescription'))
          } else {
            success(t('users.toast.roleAssigned', { role: getRoleLabel(roleName) }))
          }
          loadData()
        } catch (err) {
          showApiError(err, 'users.errors.assignRoleFailed')
        } finally {
          assigningUsersRef.current.delete(userId)
          setAssigningUsers(new Set(assigningUsersRef.current))
        }
      },
    })
  }

  const handleRemoveRole = async (userId: string, roleName: string) => {
    if (roleName === 'STYLIST') {
      await openRemoveStylist(userId)
      return
    }
    setConfirmRequest({
      title: t('common.confirmTitle'),
      description: t('users.confirmRemoveRole', { role: getRoleLabel(roleName) }),
      confirmLabel: t('common.confirm'),
      action: async () => {
        try {
          await api.delete(`/api/users/${userId}/roles/${roleName}`)
          success(t('users.toast.roleRemoved', { role: getRoleLabel(roleName) }))
          loadData()
        } catch (err) {
          showApiError(err, 'users.errors.removeRoleFailed')
        }
      },
    })
  }

  return { resetLinkSendingId, assigningUsers, confirmRequest, setConfirmRequest, handleIssueInitialPasswordResetLink, handleDeactivate, handleAssignRole, handleRemoveRole }
}
