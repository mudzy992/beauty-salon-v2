import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import { formatLocalizedAmount } from '../../i18n/locale-utils.mjs'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Switch } from '../../components/ui/switch'
import type { ClientDebtRow, UserRow } from './user-types'

type Form = { username: string; email: string; firstName: string; lastName: string; phone: string; gender: '' | 'MALE' | 'FEMALE'; isActive: boolean }
type Props = {
  editOpen: boolean; setEditOpen: Dispatch<SetStateAction<boolean>>; saving: boolean; editTriggerRef: RefObject<HTMLButtonElement>
  editUser: UserRow | null; formData: Form; setFormData: Dispatch<SetStateAction<Form>>
  setEditIsUsernameManuallyEdited: Dispatch<SetStateAction<boolean>>; initialUsername: string; initialEmail: string
  editUsernameStatus: { loading: boolean; available: boolean | null; suggestions: string[] }
  getUserRoles: (user: UserRow) => string[]
  clientDebtsQuery: { isLoading: boolean; isError: boolean; data: ClientDebtRow[] | undefined; refetch: () => Promise<unknown> }
  setDebtToWriteOff: Dispatch<SetStateAction<string | null>>; onSave: () => void
}
export function EditUserDialog({ editOpen, setEditOpen, saving, editTriggerRef, editUser, formData, setFormData, setEditIsUsernameManuallyEdited, initialUsername, initialEmail, editUsernameStatus, getUserRoles, clientDebtsQuery, setDebtToWriteOff, onSave }: Props) {
  const { t, i18n } = useTranslation()
  return (
    <Dialog open={editOpen} onOpenChange={(open) => { if (open || !saving) setEditOpen(open) }}>
      <DialogContent data-users-dialog className="max-w-3xl" onCloseAutoFocus={(event) => {
        if (editTriggerRef.current?.isConnected) {
          event.preventDefault()
          editTriggerRef.current.focus()
        }
      }}>
        <DialogHeader>
          <DialogTitle>{t('users.editUserTitle', { username: editUser?.username ?? '' })}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="users-username">{t('users.username')}</Label>
            <Input id="users-username" aria-required="true"
              value={formData.username}
              onChange={(e) => {
                setEditIsUsernameManuallyEdited(true)
                setFormData((p) => ({ ...p, username: e.target.value }))
              }}
            />
            {editUsernameStatus.loading ? <p className="text-xs text-content-strong">{t('users.usernameAvailability.checking')}</p> : null}
            {!editUsernameStatus.loading && editUsernameStatus.available === true && formData.username.trim() === initialUsername.trim() ? (
              <p className="text-xs text-blue-600">{t('users.usernameAvailability.current')}</p>
            ) : null}
            {!editUsernameStatus.loading && editUsernameStatus.available === true && formData.username.trim() !== initialUsername.trim() ? (
              <p className="text-xs text-ok-foreground">{t('users.usernameAvailability.available')}</p>
            ) : null}
            {!editUsernameStatus.loading && editUsernameStatus.available === false ? (
              <p className="text-xs text-rose-600">{t('users.usernameAvailability.unavailable')}</p>
            ) : null}

            {editUsernameStatus.suggestions.length > 0 && editUsernameStatus.available === false ? (
              <Alert className="mt-2">
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <p className="mb-1 font-medium leading-none tracking-tight">{t('users.usernameAvailability.suggestions')}</p>
                <AlertDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editUsernameStatus.suggestions.map((item) => (
                      <Button
                        key={item}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditIsUsernameManuallyEdited(true)
                          setFormData((p) => ({ ...p, username: item }))
                        }}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="users-email" className="mb-0">{t('users.email')}</Label>
              {formData.email.trim().length > 0 ? (
                <Badge
                  variant={formData.email.trim() === initialEmail.trim() && !!editUser?.isEmailVerified ? 'success' : 'warning'}
                  className="text-[10px]"
                >
                  {formData.email.trim() === initialEmail.trim() && !!editUser?.isEmailVerified ? t('users.status.emailVerified') : t('users.status.emailUnverified')}
                </Badge>
              ) : null}
            </div>
            <Input id="users-email" type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="users-auth-first-name">{t('auth.firstName')}</Label>
            <Input id="users-auth-first-name" aria-required="true" value={formData.firstName} onChange={(e) => setFormData((p) => ({ ...p, firstName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="users-auth-last-name">{t('auth.lastName')}</Label>
            <Input id="users-auth-last-name" aria-required="true" value={formData.lastName} onChange={(e) => setFormData((p) => ({ ...p, lastName: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="users-phone">{t('users.phone')}</Label>
            <Input id="users-phone" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="users-gender">
              {t('users.gender.label')}
              {editUser && getUserRoles(editUser).includes('CLIENT') ? <span className="ml-1 text-rose-600">*</span> : null}
            </Label>
            <Select id="users-gender" aria-required={Boolean(editUser && getUserRoles(editUser).includes('CLIENT'))}

              value={formData.gender}
              onChange={(e) => setFormData((p) => ({ ...p, gender: e.target.value as any }))}
            >
              <option value="">{t('users.gender.choose')}</option>
              <option value="FEMALE">{t('users.gender.female')}</option>
              <option value="MALE">{t('users.gender.male')}</option>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border border-line p-3  md:col-span-2">
            <div className="space-y-0.5">
              <p id="users-active-label" className="text-sm font-medium text-content">{t('users.form.active')}</p>
              <p className="text-xs text-content-strong">{t('users.form.inactiveHint')}</p>
            </div>
            <Switch aria-labelledby="users-active-label" checked={formData.isActive} onCheckedChange={(checked) => setFormData((p) => ({ ...p, isActive: checked }))} />
          </div>

          {editUser && getUserRoles(editUser).includes('CLIENT') ? (
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="mb-0">{t('users.debts.title')}</Label>
                {clientDebtsQuery.isLoading ? (
                  <span role="status" className="text-xs text-content-strong">
                    {t('users.debts.loading')}
                  </span>
                ) : null}
              </div>

              {clientDebtsQuery.isLoading ? null : clientDebtsQuery.isError ? (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
                >
                  <span>{t('finance.states.errorTitle')}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void clientDebtsQuery.refetch()}
                  >
                    {t('finance.states.retry')}
                  </Button>
                </div>
              ) : (clientDebtsQuery.data ?? []).length === 0 ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                  {t('users.debts.none')}
                </div>
              ) : (
                <div className="space-y-2">
                  {(clientDebtsQuery.data ?? []).map((d) => (
                    <div
                      key={d.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface p-3 text-sm  "
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-content">
                          {formatLocalizedAmount(d.amount, i18n.language)}
                          {d.service?.name ? <span className="ml-2 text-xs text-content-strong">• {d.service.name}</span> : null}
                        </div>
                        {d.note ? <div className="mt-1 text-xs text-content-strong ">{d.note}</div> : null}
                        {d.createdBy?.username ? (
                          <div className="mt-1 text-xs text-content-strong ">{t('users.debts.enteredBy', { username: d.createdBy.username })}</div>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDebtToWriteOff(d.id)}
                      >
                        {t('users.debts.writeOff')}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" disabled={saving} onClick={() => setEditOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
