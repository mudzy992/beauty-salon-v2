import { FormEvent, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import api from '../api/client'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuth } from '../context/AuthContext'
import { useAppToast } from '../lib/toast/useAppToast'
import { getUploadUrl } from '../utils/uploadUrl'
import { MediaConsentPanel } from '../features/media-consent/media-consent-panel'

interface ProfileData {
  id: string
  username: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  gender: 'MALE' | 'FEMALE' | null
  avatar: string | null
  isActive: boolean
  isEmailVerified: boolean
  mustChangePassword: boolean
  createdAt: string
  roles: string[]
}

export default function Profile() {
  const { user, refreshProfile } = useAuth()
  const toast = useAppToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [username, setUsername] = useState('')
  const [initialUsername, setInitialUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | ''>('')
  const [avatar, setAvatar] = useState<string | null>(null)
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
      setUsername(data.username ?? '')
      setInitialUsername(data.username ?? '')
      setFirstName(data.firstName ?? '')
      setLastName(data.lastName ?? '')
      setEmail(data.email ?? '')
      setInitialEmail(data.email ?? '')
      setPhone(data.phone ?? '')
      setGender(data.gender ?? '')
      setAvatar(data.avatar ?? null)
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
    if (!file.type.startsWith('image/')) return
    setUploadingAvatar(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('entity', 'avatars')
      const { data } = await api.post<{
        pathThumb?: string
        pathSmall?: string
        pathOriginal: string
      }>('/api/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setAvatar(data.pathThumb || data.pathSmall || data.pathOriginal)
      toast.success('Avatar uploadovan.')
    } catch {
      toast.error('Upload avatara nije uspio.')
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!user?.sub) return

    const isClient = (profile?.roles ?? []).includes('CLIENT')
    if (isClient && !gender) {
      toast.warning('Spol je obavezan za klijente.')
      return
    }
    if (!username.trim()) {
      toast.warning('Korisničko ime je obavezno.')
      return
    }
    if (usernameStatus.available === false) {
      toast.warning('Korisničko ime nije dostupno.')
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
        avatar,
      })
      await refreshProfile()
      await loadProfile()

      if (hasEmailChanged) {
        try {
          await api.post('/auth/send-verification-email')
          toast.success(
            'Profil je ažuriran. Poslali smo verifikacijski kod na novi email.',
          )
        } catch {
          toast.warning(
            'Profil je ažuriran. Pošaljite verifikacijski kod za novi email.',
          )
        }
      } else {
        toast.success('Profil je ažuriran.')
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Ažuriranje nije uspjelo.')
    } finally {
      setSaving(false)
    }
  }

  const handleSendCode = async () => {
    setSendingCode(true)
    try {
      await api.post('/auth/send-verification-email')
      toast.success('Verifikacijski kod je poslan na email.')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Slanje koda nije uspjelo.')
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
      toast.success('Email je verifikovan.')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Verifikacija nije uspjela.')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10 space-y-6">
      <div className="text-2xl font-semibold tracking-tight text-slate-950">Moj profil</div>

      {loading ? (
        <div className="text-slate-600">Učitavanje…</div>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={avatar ? getUploadUrl(avatar) : undefined} />
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
                      {(profile?.roles ?? []).map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700"
                        >
                          {role}
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
                      ? 'Upload…'
                      : avatar
                        ? 'Promijeni avatar'
                        : 'Dodaj avatar'}
                  </Button>
                  <div className="text-xs text-slate-500">
                    Kreiran:{' '}
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString('bs-BA')
                      : '-'}
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
                    <Label htmlFor="username">Korisničko ime</Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />

                    {usernameStatus.loading ? (
                      <div className="text-xs text-slate-500">
                        Provjera korisničkog imena…
                      </div>
                    ) : null}

                    {!usernameStatus.loading &&
                    usernameStatus.available === true &&
                    (usernameStatus.isCurrentUsername ||
                      username.trim() === initialUsername.trim()) ? (
                      <div className="text-xs text-blue-700">
                        Ovo je vaše trenutno korisničko ime.
                      </div>
                    ) : null}

                    {!usernameStatus.loading &&
                    usernameStatus.available === true &&
                    !usernameStatus.isCurrentUsername &&
                    username.trim() !== initialUsername.trim() ? (
                      <div className="text-xs text-emerald-700">
                        Korisničko ime je dostupno.
                      </div>
                    ) : null}

                    {!usernameStatus.loading && usernameStatus.available === false ? (
                      <div className="text-xs text-rose-700">
                        Korisničko ime nije dostupno.
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
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {(profile?.roles ?? []).includes('CLIENT') ? (
                  <div className="space-y-2">
                    <Label htmlFor="gender">Spol</Label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(event) =>
                        setGender(event.target.value as 'MALE' | 'FEMALE' | '')
                      }
                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                    >
                      <option value="">Odaberite spol</option>
                      <option value="FEMALE">Žensko</option>
                      <option value="MALE">Muško</option>
                    </select>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Ime</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Prezime</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
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
                      {profile?.isEmailVerified ? 'Verifikovan' : 'Neverifikovan'}
                    </span>
                  </div>

                  {!profile?.isEmailVerified ? (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm text-slate-600">
                        Ako ste promijenili email, unesite kod iz poruke ili zatražite novi.
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSendCode}
                          disabled={sendingCode}
                        >
                          {sendingCode ? 'Slanje…' : 'Pošalji kod'}
                        </Button>
                        <Input
                          value={verifyToken}
                          onChange={(e) => setVerifyToken(e.target.value)}
                          placeholder="Kod iz emaila"
                          className="sm:max-w-[220px]"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleVerify}
                          disabled={verifying}
                        >
                          {verifying ? 'Provjera…' : 'Potvrdi'}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                <Button type="submit" disabled={saving || usernameStatus.available === false}>
                  {saving ? 'Spremanje…' : 'Sačuvaj izmjene'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {(profile?.roles ?? []).includes('CLIENT') ? <MediaConsentPanel /> : null}
        </div>
      )}
    </div>
  )
}

