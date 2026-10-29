import { useEffect, useMemo, useState, FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { MediaImage } from '../components/media-image'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAppToast } from '../lib/toast/useAppToast'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import {
  getClientMandatoryOnboardingPath,
  getPostAuthRedirectPath,
  shouldIgnoreStaleAuthRedirect,
} from '../utils/clientOnboarding';

const MotionDiv = motion.div

export default function Login() {
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useAppToast()
  const { login, token, user, isReady } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const fallbackRedirect = useMemo(() => getPostAuthRedirectPath(user), [user])

  useEffect(() => {
    if (!isReady) return
    if (!token) return
    if (!user) return
    navigate(fallbackRedirect, { replace: true })
  }, [isReady, token, user, navigate, fallbackRedirect])

  const resolveFrom = (fromState: unknown): string | null => {
    if (typeof fromState === 'string') {
      return fromState.startsWith('/') ? fromState : null;
    }
    if (fromState && typeof fromState === 'object') {
      const anyObj = fromState as { pathname?: unknown; search?: unknown; hash?: unknown };
      const pathname = typeof anyObj.pathname === 'string' ? anyObj.pathname : '';
      if (!pathname.startsWith('/')) return null;
      const search = typeof anyObj.search === 'string' ? anyObj.search : '';
      const hash = typeof anyObj.hash === 'string' ? anyObj.hash : '';
      return `${pathname}${search}${hash}`;
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let loggedInUser;
    try {
      loggedInUser = await login(username, password)
    } catch {
      toast.error(t('auth.loginError'))
      setLoading(false)
      return
    }

    setLoading(false)
    toast.success(t('auth.loginSuccess'))
    const nextPath = getPostAuthRedirectPath(loggedInUser)
    if (getClientMandatoryOnboardingPath(loggedInUser) !== null) {
      navigate(nextPath, { replace: true })
      return
    }

    const from = (location.state as { from?: unknown } | null)?.from
    const resolvedFrom = resolveFrom(from)
    if (resolvedFrom && !shouldIgnoreStaleAuthRedirect(resolvedFrom, loggedInUser)) {
      navigate(resolvedFrom, { replace: true })
      return
    }
    navigate(nextPath, { replace: true })
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:block relative overflow-hidden">
        <MediaImage
          src={getSetting('public_login_image', '')}
          alt={t('auth.loginBannerAlt')}
          className="h-full w-full object-cover scale-[1.05] hover:scale-100 transition-transform duration-[10000ms] ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <div className="text-4xl font-light mb-4">
            {getSetting('public_login_title', 'Beauty Salon Nejra')}
          </div>
          <div className="text-lg text-slate-200 max-w-md">
            {getSetting(
              'public_login_subtitle',
              t('auth.loginBannerSubtitle'),
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-6 py-10">
        <MotionDiv
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="inline-flex mb-8">
            <Button variant="ghost">{t('auth.backHome')}</Button>
          </Link>

          <div className="bg-white/90 backdrop-blur-md border border-white/40 shadow-2xl rounded-2xl p-8">
            <div className="text-2xl font-semibold text-slate-900">
              {t('auth.login')}
            </div>
            <div className="text-slate-500 mt-2 mb-8">
              {t('auth.loginPrompt')}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="usernameOrEmail">{t('auth.usernameOrEmail')}</Label>
                <Input
                  id="usernameOrEmail"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('auth.loginIdentifierPlaceholder')}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('common.loading') : t('auth.login')}
              </Button>
            </form>

            <div className="mt-6 text-center text-slate-600">
              {t('auth.noAccount')}{' '}
              <Link
                to="/register"
                className="font-semibold text-slate-900 underline underline-offset-4 hover:text-slate-600"
              >
                {t('public.nav.register')}
              </Link>
            </div>
          </div>
        </MotionDiv>
      </div>
    </div>
  )
}
