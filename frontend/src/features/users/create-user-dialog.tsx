import type { Dispatch, RefObject, MutableRefObject, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'

type CreateData = { username: string; firstName: string; lastName: string; role: string; gender: '' | 'MALE' | 'FEMALE' }
type UsernameStatus = { loading: boolean; available: boolean | null; suggestions: string[] }
type Props = {
  createOpen: boolean; setCreateOpen: Dispatch<SetStateAction<boolean>>; saving: boolean
  transitioningToCredentials: MutableRefObject<boolean>; createTriggerRef: RefObject<HTMLButtonElement>
  createData: CreateData; setCreateData: Dispatch<SetStateAction<CreateData>>
  setIsUsernameManuallyEdited: Dispatch<SetStateAction<boolean>>; usernameStatus: UsernameStatus
  getRoleLabel: (role: string) => string; onCreate: () => void
}
export function CreateUserDialog({ createOpen, setCreateOpen, saving, transitioningToCredentials, createTriggerRef, createData, setCreateData, setIsUsernameManuallyEdited, usernameStatus, getRoleLabel, onCreate }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={createOpen} onOpenChange={(open) => { if (open || !saving) setCreateOpen(open) }}>
      <DialogContent data-users-dialog className="max-w-2xl" onCloseAutoFocus={(event) => {
        if (transitioningToCredentials.current) {
          event.preventDefault()
        } else if (createTriggerRef.current?.isConnected) {
          event.preventDefault()
          createTriggerRef.current.focus()
        }
      }}>
        <DialogHeader>
          <DialogTitle>{t('users.newUser')}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="users-auth-first-name-2">{t('auth.firstName')}</Label>
            <Input id="users-auth-first-name-2" aria-required="true" value={createData.firstName} onChange={(e) => setCreateData((p) => ({ ...p, firstName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="users-auth-last-name-2">{t('auth.lastName')}</Label>
            <Input id="users-auth-last-name-2" aria-required="true" value={createData.lastName} onChange={(e) => setCreateData((p) => ({ ...p, lastName: e.target.value }))} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="users-users-username-2">{t('users.username')}</Label>
            <Input id="users-users-username-2"
              value={createData.username}
              onChange={(e) => {
                const value = e.target.value
                setIsUsernameManuallyEdited(value.trim().length > 0)
                setCreateData((p) => ({ ...p, username: value }))
              }}
            />
            {usernameStatus.loading ? <p className="text-xs text-content-strong">{t('users.usernameAvailability.checking')}</p> : null}
            {!usernameStatus.loading && usernameStatus.available === true ? <p className="text-xs text-ok-foreground">{t('users.usernameAvailability.available')}</p> : null}
            {!usernameStatus.loading && usernameStatus.available === false ? <p className="text-xs text-rose-600">{t('users.usernameAvailability.unavailable')}</p> : null}
          </div>

          {usernameStatus.suggestions.length > 0 && usernameStatus.available === false ? (
            <div className="md:col-span-2">
              <Alert>
                <UserRound className="h-4 w-4" aria-hidden="true" />
                <p className="mb-1 font-medium leading-none tracking-tight">{t('users.usernameAvailability.suggestions')}</p>
                <AlertDescription>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {usernameStatus.suggestions.map((item) => (
                      <Button
                        key={item}
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsUsernameManuallyEdited(true)
                          setCreateData((p) => ({ ...p, username: item }))
                        }}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="users-form-role">{t('users.form.role')}</Label>
            <Input id="users-form-role" value={getRoleLabel('CLIENT')} readOnly />
            <p className="text-xs text-content-strong">
              {t('users.form.roleNote')}
            </p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="users-create-gender">{t('users.gender.label')}</Label>
            <Select id="users-create-gender" aria-required="true"

              value={createData.gender}
              onChange={(e) => setCreateData((p) => ({ ...p, gender: e.target.value as any }))}
            >
              <option value="">{t('users.gender.choose')}</option>
              <option value="FEMALE">{t('users.gender.female')}</option>
              <option value="MALE">{t('users.gender.male')}</option>
            </Select>
          </div>

        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" disabled={saving} onClick={() => setCreateOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onCreate} disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
