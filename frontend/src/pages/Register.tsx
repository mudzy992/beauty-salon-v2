import { useState, useRef, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { MediaImage } from '../components/media-image'
import api from '../api/client'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { useAppToast } from '../lib/toast/useAppToast'
import { useSettings } from '../context/SettingsContext'
import { getRegistrationErrorKey } from '../features/auth/registration-error.mjs'

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
  const [phone, setPhone] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    } else {
      setAvatarFile(null)
      setAvatarPreview(null)
      if (file) toast.error(t('auth.invalidAvatarType'))
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
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
      toast.success(t('public.registerSuccess'))
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const response =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: unknown } } }).response
          : undefined
      const responseMessage =
        typeof response?.data?.message === 'string' ? response.data.message : null
      toast.error(t(getRegistrationErrorKey(responseMessage)))
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden">
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

      <div className="flex items-center justify-center bg-slate-50 px-6 py-10">
        <MotionDiv
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl"
        >
          <Link to="/" className="inline-flex mb-6">
            <Button variant="ghost">{t('auth.backHome')}</Button>
          </Link>

          <div className="bg-white/90 backdrop-blur-md border border-white/40 shadow-2xl rounded-2xl p-8">
            <div className="text-2xl font-semibold text-slate-900">
              {t('auth.registerTitle')}
            </div>
            <div className="text-slate-500 mt-2 mb-8">
              {t('auth.registerPrompt')}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <Input
                  id="email"
                  type="email"
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-2">
                <Label>{t('auth.avatarOptional')}</Label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="rounded-full"
                    onClick={() => avatarInputRef.current?.click()}
                    aria-label={t('auth.chooseAvatar')}
                  >
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={avatarPreview ?? undefined} />
                      <AvatarFallback>
                        {(firstName?.[0] ?? 'U').toUpperCase()}
                        {(lastName?.[0] ?? '').toUpperCase()}
                      </AvatarFallback>
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
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('auth.createAccount')}
              </Button>
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
      </div>
    </div>
  )
}
