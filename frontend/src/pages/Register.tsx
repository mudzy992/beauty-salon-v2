import { useEffect, useRef, useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { MediaImage } from '../components/media-image'
import api from '../api/client'
import { getErrorCode } from '../api/error'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { useAppToast } from '../lib/toast/useAppToast'
import { useSettings } from '../context/SettingsContext'
import { AuthCardHeader } from '../features/auth/auth-card-header'
import { getRegistrationErrorKey } from '../features/auth/registration-error.mjs'
import { labelWithVisibleText } from '../components/a11y/label-in-name.mjs';

const MotionDiv = motion.div

export default function Register() {
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const navigate = useNavigate()
  const toast = useAppToast()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  // Vidljivi tekst avatara. Izvučeno u varijablu jer ga 2.5.3 traži i u pristupačnom imenu:
  // dva odvojena izraza bi se neminovno razišla.
  const avatarInitials = `${(firstName?.[0] ?? 'U').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}`
  const [phone, setPhone] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const avatarPreviewUrl = useRef<string | null>(null)
  const registrationRequestGeneration = useRef(0)
  const registrationRequestInFlight = useRef(false)

  useEffect(() => () => {
    registrationRequestGeneration.current += 1
    registrationRequestInFlight.current = false
    if (avatarPreviewUrl.current) {
      URL.revokeObjectURL(avatarPreviewUrl.current)
    }
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.currentTarget.value = ''
    if (avatarPreviewUrl.current) {
      URL.revokeObjectURL(avatarPreviewUrl.current)
      avatarPreviewUrl.current = null
    }
    if (file && file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file)
      avatarPreviewUrl.current = previewUrl
      setAvatarFile(file)
      setAvatarPreview(previewUrl)
    } else {
      setAvatarFile(null)
      setAvatarPreview(null)
      if (file) toast.error(t('auth.invalidAvatarType'))
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (registrationRequestInFlight.current) return
    const generation = ++registrationRequestGeneration.current
    registrationRequestInFlight.current = true
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('email', email)
      formData.append('password', password)
      formData.append('firstName', firstName)
      formData.append('lastName', lastName)
      if (phone.trim()) formData.append('phone', phone.trim())
      if (avatarFile) formData.append('avatar', avatarFile)
      await api.post('/auth/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (generation !== registrationRequestGeneration.current) return
      toast.success(t('public.registerSuccess'))
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      if (generation !== registrationRequestGeneration.current) return
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response
          : undefined
      const responseMessage =
        typeof response?.data?.message === 'string' ? response.data.message : null
      toast.error(t(getRegistrationErrorKey(responseMessage, getErrorCode(err))))
    } finally {
      if (generation === registrationRequestGeneration.current) {
        registrationRequestInFlight.current = false
        setLoading(false)
      }
    }
  };

  return (
    <div data-aurum-page="register" data-aurum-auth-page className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden" data-aurum-auth-banner>
        <MediaImage
          src={getSetting('public_register_image', '')}
          alt={t('auth.registerBannerAlt')}
          className="h-full w-full object-cover scale-[1.05] hover:scale-100 transition-transform duration-[10000ms] ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <div className="text-4xl font-light mb-4">
            {getSetting('public_register_title', t('auth.registerBannerTitle'))}
          </div>
          <div className="text-lg text-slate-200 max-w-md">
            {getSetting(
              'public_register_subtitle',
              t('auth.registerBannerSubtitle'),
            )}
          </div>
        </div>
      </div>

      <main className="flex items-center justify-center bg-slate-50 px-6 py-10">
        <MotionDiv
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl"
        >
          <Button asChild variant="ghost" className="mb-6">
            <Link to="/">{t('auth.backHome')}</Link>
          </Button>

          <div className="bg-white/90 backdrop-blur-md border border-white/40 shadow-2xl rounded-2xl p-8" data-aurum-auth-card data-aurum-surface>
            <AuthCardHeader />
            <h1 className="text-2xl font-semibold text-slate-900">
              {t('auth.registerTitle')}
            </h1>
            <div className="text-slate-500 mt-2 mb-8">
              {t('auth.registerPrompt')}
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              aria-busy={loading}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('auth.firstName')}</Label>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('auth.lastName')}</Label>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('users.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.username')}</Label>
                  <Input
                    id="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('users.phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  {t('auth.avatarOptional')}
                </legend>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="rounded-full"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label={labelWithVisibleText(t('auth.chooseAvatar'), avatarInitials)}
                  >
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarPreview ?? undefined} />
                      <AvatarFallback>{avatarInitials}</AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="space-y-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      ref={avatarInputRef}
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      {avatarFile ? t('auth.changeImage') : t('auth.addImage')}
                    </Button>
                    {avatarFile ? (
                      <div className="text-sm text-slate-500">{avatarFile.name}</div>
                    ) : null}
                  </div>
                </div>
              </fieldset>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                aria-busy={loading}
                data-aurum-cta="primary"
              >
                {loading ? t('common.loading') : t('auth.createAccount')}
              </Button>
              {loading ? (
                <span role="status" aria-live="polite" className="sr-only">
                  {t('common.loading')}
                </span>
              ) : null}
            </form>

            <div className="mt-6 text-center text-slate-600">
              {t('auth.alreadyHaveAccount')}{' '}
              <Link
                to="/login"
                className="font-semibold text-slate-900 underline underline-offset-4 hover:text-slate-600"
              >
                {t('auth.login')}
              </Link>
            </div>
          </div>
        </MotionDiv>
      </main>
    </div>
  )
}
