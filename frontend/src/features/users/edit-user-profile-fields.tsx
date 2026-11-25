import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Switch } from '../../components/ui/switch'
import type { UserRow } from './user-types'

export type UserForm = {
  username: string
  email: string
  firstName: string
  lastName: string
  phone: string
  gender: '' | 'MALE' | 'FEMALE'
  isActive: boolean
}

type Props = {
  formData: UserForm
  setFormData: Dispatch<SetStateAction<UserForm>>
  initialEmail: string
  editUser: UserRow | null
  getUserRoles: (user: UserRow) => string[]
}

/**
 * Podaci o korisniku: e-mail, ime, telefon, spol i status.
 *
 * E-mail nosi oznaku verifikacije, a spol je obavezan samo za klijente.
 */
export function EditUserProfileFields({ formData, setFormData, initialEmail, editUser, getUserRoles }: Props) {
  const { t } = useTranslation()
  const isClient = Boolean(editUser && getUserRoles(editUser).includes('CLIENT'))
  const emailVerified = formData.email.trim() === initialEmail.trim() && Boolean(editUser?.isEmailVerified)

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="users-email" className="mb-0">{t('users.email')}</Label>
          {formData.email.trim().length > 0 ? (
            <Badge variant={emailVerified ? 'success' : 'warning'} className="text-[10px]">
              {emailVerified ? t('users.status.emailVerified') : t('users.status.emailUnverified')}
            </Badge>
          ) : null}
        </div>
        <Input
          id="users-email"
          type="email"
          value={formData.email}
          onChange={event => setFormData(previous => ({ ...previous, email: event.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="users-auth-first-name">{t('auth.firstName')}</Label>
        <Input
          id="users-auth-first-name"
          aria-required="true"
          value={formData.firstName}
          onChange={event => setFormData(previous => ({ ...previous, firstName: event.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="users-auth-last-name">{t('auth.lastName')}</Label>
        <Input
          id="users-auth-last-name"
          aria-required="true"
          value={formData.lastName}
          onChange={event => setFormData(previous => ({ ...previous, lastName: event.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="users-phone">{t('users.phone')}</Label>
        <Input
          id="users-phone"
          value={formData.phone}
          onChange={event => setFormData(previous => ({ ...previous, phone: event.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="users-gender">
          {t('users.gender.label')}
          {isClient ? <span className="ml-1 text-rose-600">*</span> : null}
        </Label>
        <Select
          id="users-gender"
          aria-required={isClient}
          value={formData.gender}
          onChange={event => setFormData(previous => ({ ...previous, gender: event.target.value as UserForm['gender'] }))}
        >
          <option value="">{t('users.gender.choose')}</option>
          <option value="FEMALE">{t('users.gender.female')}</option>
          <option value="MALE">{t('users.gender.male')}</option>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-md border border-line p-3 md:col-span-2">
        <div className="space-y-0.5">
          <p id="users-active-label" className="text-sm font-medium text-content">{t('users.form.active')}</p>
          <p className="text-xs text-content-strong">{t('users.form.inactiveHint')}</p>
        </div>
        <Switch
          aria-labelledby="users-active-label"
          checked={formData.isActive}
          onCheckedChange={checked => setFormData(previous => ({ ...previous, isActive: checked }))}
        />
      </div>
    </>
  )
}
