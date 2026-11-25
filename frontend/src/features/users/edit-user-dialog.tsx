import { useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import type { ClientDebtRow, UserRow } from './user-types'
import { UserDebtsPanel } from './user-debts-panel'
import { ConfirmDialog } from '../shell/admin/ui/confirm-dialog'
import { EditUserProfileFields, type UserForm } from './edit-user-profile-fields'
import { EditUserUsernameField, type UsernameAvailability } from './edit-user-username-field'

type Props = {
  editOpen: boolean; setEditOpen: Dispatch<SetStateAction<boolean>>; saving: boolean; editTriggerRef: RefObject<HTMLButtonElement>
  editUser: UserRow | null; formData: UserForm; setFormData: Dispatch<SetStateAction<UserForm>>
  setEditIsUsernameManuallyEdited: Dispatch<SetStateAction<boolean>>; initialUsername: string; initialEmail: string
  editUsernameStatus: UsernameAvailability
  getUserRoles: (user: UserRow) => string[]
  clientDebtsQuery: { isLoading: boolean; isError: boolean; data: ClientDebtRow[] | undefined; refetch: () => Promise<unknown> }
  debtToWriteOff: string | null; setDebtToWriteOff: Dispatch<SetStateAction<string | null>>; onSave: () => void
}

/**
 * Dijalog za uređivanje korisnika.
 *
 * Polja su u zasebnim modulima (`EditUserUsernameField`,
 * `EditUserProfileFields`), a ovdje je samo okvir, podizanje dugmadi i
 * potvrda deaktivacije.
 */
export function EditUserDialog({ editOpen, setEditOpen, saving, editTriggerRef, editUser, formData, setFormData, setEditIsUsernameManuallyEdited, initialUsername, initialEmail, editUsernameStatus, getUserRoles, clientDebtsQuery, debtToWriteOff, setDebtToWriteOff, onSave }: Props) {
  const { t } = useTranslation()
  const [confirmDeactivation, setConfirmDeactivation] = useState(false)
  const saveRef = useRef<HTMLButtonElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  return (
    <>
    <Dialog open={editOpen} onOpenChange={(open) => {
      if (!open && confirmDeactivation) { setConfirmDeactivation(false); return }
      if (!open && debtToWriteOff) { setDebtToWriteOff(null); return }
      if (open || !saving) setEditOpen(open)
    }}>
      <DialogContent data-users-dialog className="max-w-3xl" onCloseAutoFocus={(event) => {
        if (editTriggerRef.current?.isConnected) {
          event.preventDefault()
          editTriggerRef.current.focus()
        }
      }}>
        <DialogHeader>
          <DialogTitle ref={titleRef} tabIndex={-1}>{t('users.editUserTitle', { username: editUser?.username ?? '' })}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <EditUserUsernameField
            value={formData.username}
            initialUsername={initialUsername}
            status={editUsernameStatus}
            onChange={username => {
              setEditIsUsernameManuallyEdited(true)
              setFormData(previous => ({ ...previous, username }))
            }}
          />

          <EditUserProfileFields
            formData={formData}
            setFormData={setFormData}
            initialEmail={initialEmail}
            editUser={editUser}
            getUserRoles={getUserRoles}
          />

          {editUser && getUserRoles(editUser).includes('CLIENT') ? (
            <UserDebtsPanel clientDebtsQuery={clientDebtsQuery} setDebtToWriteOff={setDebtToWriteOff} />
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" disabled={saving} onClick={() => setEditOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button ref={saveRef} type="button" onClick={() => { if (editUser?.isActive && !formData.isActive) setConfirmDeactivation(true); else onSave() }} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={confirmDeactivation} onOpenChange={setConfirmDeactivation}
      title={t('common.confirmTitle')} description={t('users.confirmDeactivate', { username: editUser?.username ?? '' })}
      confirmLabel={t('common.confirm')} isDestructive
      onCloseAutoFocus={(event) => {
        const target = saveRef.current?.isConnected && !saveRef.current.disabled ? saveRef.current : titleRef.current
        if (target?.isConnected) { event.preventDefault(); target.focus() }
      }}
      onConfirm={() => { setConfirmDeactivation(false); onSave() }} />
    </>
  )
}
