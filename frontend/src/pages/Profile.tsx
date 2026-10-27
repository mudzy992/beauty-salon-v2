import { FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../context/AuthContext'
import { useAppToast } from '../lib/toast/useAppToast'
import { getUploadUrl } from '../utils/uploadUrl'
import { MediaConsentPanel } from '../features/media-consent/media-consent-panel'
import { resolveProfileApiErrorKey } from '../features/profile/profile-api-error.mjs'
import { getIntlLocale } from '../i18n/locale-utils.mjs'
import { formatInstantDateLocale } from '../../../shared/business-date.mjs'

interface ProfileData {
  id: string
  username: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  gender: 'MALE' | 'FEMALE' | null
  avatar: string | null
  isAvatarPublic: boolean
  isActive: boolean
  isEmailVerified: boolean
  mustChangePassword: boolean
  createdAt: string
  roles: string[]
}

export default function Profile() {
  const { t, i18n } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const toast = useAppToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const showApiError = (error: unknown, fallbackKey: string) => {
    const message = getErrorMessage(error, '')
    toast.error(t(resolveProfileApiErrorKey(message, fallbackKey)))
  }

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileLoadErrorKey, setProfileLoadErrorKey] = useState('profile.errors.loadFailed')
  const [username, setUsername] = useState('')
  const [initialUsername, setInitialUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [isAvatarPublic, setIsAvatarPublic] = useState(false)
  const [avatarPrivacySaving, setAvatarPrivacySaving] = useState(false)
  const [verifyToken, setVerifyToken] = useState('')

  const [usernameStatus, setUsernameStatus] = useState<{
    loading: boolean
    available: boolean | null
    isCurrentUsername: boolean
    suggestions: string[]
  }>({ loading: false, available: null, isCurrentUsername: false, suggestions: [] })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [initialEmail, setInitialEmail] = useState('')

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data } = await api.get<ProfileData>('/api/users/profile')
      setProfile(data)
      setProfileLoadErrorKey('profile.errors.loadFailed')
      setUsername(data.username ?? '')
      setInitialUsername(data.username ?? '')
      setFirstName(data.firstName ?? '')
      setLastName(data.lastName ?? '')
      setEmail(data.email ?? '')
      setInitialEmail(data.email ?? '')
      setPhone(data.phone ?? '')
      setGender(data.gender ?? '')
      setAvatar(data.avatar ?? null)
      setIsAvatarPublic(Boolean(data.isAvatarPublic))
    } catch (error) {
      setProfile(null)
      setProfileLoadErrorKey(
        resolveProfileApiErrorKey(getErrorMessage(error, ''), 'profile.errors.loadFailed'),
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  useEffect(() => {
    if (!username.trim()) {
      setUsernameStatus({
        loading: false,
        available: null,
        isCurrentUsername: false,
        suggestions: [],
      })
      return
    }
    const timeout = window.setTimeout(async () => {
      setUsernameStatus((prev) => ({ ...prev, loading: true }))
      try {
        const { data } = await api.get('/api/users/profile/username-availability', {
          params: { username },
        })
        setUsernameStatus({
          loading: false,
          available: !!data.available,
          isCurrentUsername: !!data.isCurrentUsername,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
        })
      } catch {
        setUsernameStatus({
          loading: false,
          available: null,
          isCurrentUsername: false,
          suggestions: [],
        })
      }
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [username])

  const handleUploadAvatar = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.errors.imageRequired'))
      return
    }
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await api.post<{
        avatar: string
        isAvatarPublic: boolean
      }>('/api/users/profile/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAvatar(data.avatar)
      setIsAvatarPublic(Boolean(data.isAvatarPublic))
      await refreshProfile()
      toast.success(t('profile.toast.avatarUploaded'))
    } catch (error) {
      showApiError(error, 'profile.errors.avatarUploadFailed')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAvatarVisibilityChange = async (nextValue: boolean) => {
    const previousValue = isAvatarPublic
    setIsAvatarPublic(nextValue)
    setAvatarPrivacySaving(true)
    try {
      const { data } = await api.patch<{ isAvatarPublic: boolean }>(
        '/api/users/profile/avatar-visibility',
        { isAvatarPublic: nextValue },
      )
      setIsAvatarPublic(Boolean(data.isAvatarPublic))
      setProfile((current) =>
        current ? { ...current, isAvatarPublic: Boolean(data.isAvatarPublic) } : current,
      )
      await refreshProfile()
      toast.success(t(nextValue ? 'profile.toast.avatarMadePublic' : 'profile.toast.avatarMadePrivate'))
    } catch (error: any) {
      setIsAvatarPublic(previousValue)
      showApiError(error, 'profile.errors.avatarVisibilityFailed')
    } finally {
      setAvatarPrivacySaving(false)
    }
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!user?.sub) return

    const isClient = (profile?.roles ?? []).includes('CLIENT')
    if (isClient && !gender) {
      toast.warning(t('users.validation.genderRequiredForClients'))
      return
    }
    if (!username.trim()) {
      toast.warning(t('users.validation.usernameRequired'))
      return
    }
    if (usernameStatus.available === false) {
      toast.warning(t('profile.username.unavailable'))
      return
    }

    setSaving(true)
    try {
      const hasEmailChanged = email.trim() !== initialEmail
      await api.patch(`/api/users/${user.sub}`, {
        username,
        firstName,
        lastName,
        email,
        phone,
        gender: gender || null,
      })
      await refreshProfile()
      await loadProfile()

      if (hasEmailChanged) {
        try {
          await api.post('/auth/send-verification-email')
          toast.success(
            t('profile.toast.updatedVerificationSent'),
          )
        } catch {
          toast.warning(
            t('profile.toast.updatedVerificationPending'),
          )
        }
      } else {
        toast.success(t('profile.toast.updated'))
      }
    } catch (error: any) {
      showApiError(error, 'profile.errors.updateFailed')
    } finally {
      setSaving(false)
    }
  }

  const handleSendCode = async () => {
    setSendingCode(true)
    try {
      await api.post('/auth/send-verification-email')
      toast.success(t('profile.toast.verificationCodeSent'))
    } catch (error: any) {
      showApiError(error, 'profile.errors.sendCodeFailed')
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerify = async () => {
    setVerifying(true)
    try {
      await api.post('/auth/verify-email', { token: verifyToken })
      await refreshProfile()
      await loadProfile()
      setVerifyToken('')
      toast.success(t('profile.toast.emailVerified'))
    } catch (error: any) {
      showApiError(error, 'profile.errors.verifyFailed')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10 space-y-6">
      <div className="text-2xl font-semibold tracking-tight text-slate-950">
        {t('profile.title')}
      </div>

      {loading ? (
        <div className="text-slate-600">{t('common.loading')}</div>
      ) : profile ? (
        <div className="space-y-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={avatar ? getUploadUrl(avatar) : undefined}
                      alt={t('profile.avatar.alt', { username })}
                    />
                    <AvatarFallback>
                      {(firstName?.[0] ?? username?.[0] ?? 'U').toUpperCase()}
                      {(lastName?.[0] ?? '').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">
                      {[firstName, lastName].filter(Boolean).join(' ') || username}
                    </div>
                    <div className="text-slate-600 text-sm">@{username}</div>
                    <div className="flex flex-wrap gap-2">
                      {profile.roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700"
                        >
                          {t(`users.roleNames.${role}`, { defaultValue: role })}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-stretch md:items-end gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={(e) =>
                      e.target.files?.[0] && void handleUploadAvatar(e.target.files[0])
                    }
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar
                      ? t('profile.avatar.uploading')
                      : avatar
                        ? t('profile.avatar.change')
                        : t('profile.avatar.add')}
                  </Button>
                  <label className="mt-2 flex items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={isAvatarPublic}
                      disabled={!avatar || avatarPrivacySaving}
                      onChange={(event) =>
                        void handleAvatarVisibilityChange(event.target.checked)
                      }
                      className="h-4 w-4 accent-amber-700"
                    />
                    <span>
                      {avatarPrivacySaving
                        ? t('common.saving')
                        : t('profile.avatar.public')}
                    </span>
                  </label>
                  <p className="max-w-xs text-right text-xs leading-5 text-slate-500">
                    {t('profile.avatar.privacyDescription')}
                  </p>
                  <div className="text-xs text-slate-500">
                    {t('profile.createdAt', {
                      date: formatInstantDateLocale(
                        profile.createdAt,
                        getIntlLocale(i18n.resolvedLanguage ?? i18n.language),
                        { dateStyle: 'medium' },
                      ),
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{t('users.username')}</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />

                    {usernameStatus.loading ? (
                      <div className="text-xs text-slate-500">
                        {t('profile.username.checking')}
                      </div>
                    ) : null}

                    {!usernameStatus.loading &&
                    usernameStatus.available === true &&
                    (usernameStatus.isCurrentUsername ||
                      username.trim() === initialUsername.trim()) ? (
                      <div className="text-xs text-blue-700">
                        {t('profile.username.current')}
                      </div>
                    ) : null}

                    {!usernameStatus.loading &&
                    usernameStatus.available === true &&
                    !usernameStatus.isCurrentUsername &&
                    username.trim() !== initialUsername.trim() ? (
                      <div className="text-xs text-emerald-700">
                        {t('profile.username.available')}
                      </div>
                    ) : null}

                    {!usernameStatus.loading && usernameStatus.available === false ? (
                      <div className="text-xs text-rose-700">
                        {t('profile.username.unavailable')}
                      </div>
                    ) : null}

                    {usernameStatus.suggestions.length > 0 &&
                    usernameStatus.available === false ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {usernameStatus.suggestions.map((item) => (
                          <Button
                            key={item}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setUsername(item)}
                          >
                            {item}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('users.phone')}</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {(profile?.roles ?? []).includes('CLIENT') ? (
                  <div className="space-y-2">
                    <Label htmlFor="gender">{t('users.gender.label')}</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(event) =>
                        setGender(event.target.value as 'MALE' | 'FEMALE' | '')
                      }
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold-ring focus:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                    >
                      <option value="">{t('users.gender.choose')}</option>
                      <option value="FEMALE">{t('users.gender.female')}</option>
                      <option value="MALE">{t('users.gender.male')}</option>
                    </select>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('users.email')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="flex-1"
                    />
                    <span
                      className={[
                        'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold',
                        profile?.isEmailVerified
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-amber-200 bg-amber-50 text-amber-800',
                      ].join(' ')}
                    >
                      {profile?.isEmailVerified ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {profile.isEmailVerified
                        ? t('profile.email.verified')
                        : t('profile.email.unverified')}
                    </span>
                  </div>

                  {!profile?.isEmailVerified ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm text-slate-600">
                        {t('profile.email.verificationHint')}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSendCode}
                          disabled={sendingCode}
                        >
                          {sendingCode
                            ? t('profile.email.sendingCode')
                            : t('profile.email.sendCode')}
                        </Button>
                        <Input
                          value={verifyToken}
                          onChange={(e) => setVerifyToken(e.target.value)}
                          placeholder={t('profile.email.codePlaceholder')}
                          className="sm:max-w-[220px]"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleVerify}
                          disabled={verifying}
                        >
                          {verifying
                            ? t('profile.email.verifying')
                            : t('profile.email.confirmCode')}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <Button type="submit" disabled={saving || usernameStatus.available === false}>
                  {saving ? t('common.saving') : t('profile.saveChanges')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {profile.roles.includes('CLIENT') ? <MediaConsentPanel /> : null}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p role="alert" className="text-sm text-slate-700">
              {t(profileLoadErrorKey)}
            </p>
            <Button type="button" variant="outline" onClick={() => void loadProfile()}>
              {t('profile.retry')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

