import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import api from '../api/client'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function ResetPassword() {
  const { t } = useTranslation()
  const location = useLocation()
  const token = useMemo(
    () => new URLSearchParams(location.search).get('token') ?? '',
    [location.search],
  )
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const requestGeneration = useRef(0)
  const requestInFlight = useRef(false)
  const previousToken = useRef(token)

  useEffect(() => {
    if (previousToken.current !== token) {
      requestGeneration.current += 1
      requestInFlight.current = false
      setLoading(false)
      setCompleted(false)
      setErrorMessage('')
      setNewPassword('')
      setConfirmPassword('')
      previousToken.current = token
    }
  }, [token])

  useEffect(() => () => {
    requestGeneration.current += 1
    requestInFlight.current = false
  }, [])

  useEffect(() => {
    if (token) {
      window.history.replaceState(window.history.state, '', location.pathname)
    }
  }, [location.pathname, token])

  const isCurrentRequest = (generation: number) =>
    generation === requestGeneration.current

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (requestInFlight.current) return
    setErrorMessage('')
    if (!token) {
      setErrorMessage(t('auth.resetPassword.invalidLink'))
      return
    }
    if (newPassword.length < 6) {
      setErrorMessage(t('auth.resetPassword.tooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(t('auth.resetPassword.mismatch'))
      return
    }

    const generation = ++requestGeneration.current
    requestInFlight.current = true
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword })
      if (!isCurrentRequest(generation)) return
      setNewPassword('')
      setConfirmPassword('')
      setCompleted(true)
    } catch (error: any) {
      if (isCurrentRequest(generation)) {
        setErrorMessage(
          error?.response?.data?.message || t('auth.resetPassword.failed'),
        )
      }
    } finally {
      if (isCurrentRequest(generation)) {
        requestInFlight.current = false
        setLoading(false)
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
      <Card className="w-full max-w-lg space-y-6 p-6 sm:p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
            {t('auth.resetPassword.title')}
          </h1>
          <p
            className="text-sm text-slate-600 dark:text-slate-300"
            role={completed ? 'status' : undefined}
            aria-live={completed ? 'polite' : undefined}
          >
            {completed
              ? t('auth.resetPassword.success')
              : t('auth.resetPassword.intro')}
          </p>
        </div>

        {loading ? (
          <span role="status" aria-live="polite" className="sr-only">
            {t('common.loading')}
          </span>
        ) : null}

        {errorMessage ? (
          <p
            role="alert"
            className="rounded-md bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {errorMessage}
          </p>
        ) : null}

        {!completed && token ? (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-busy={loading}
          >
            <div className="space-y-2">
              <Label htmlFor="reset-new-password">
                {t('auth.resetPassword.newPassword')}
              </Label>
              <Input
                id="reset-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirm-password">
                {t('auth.resetPassword.confirmPassword')}
              </Label>
              <Input
                id="reset-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? t('common.loading') : t('auth.resetPassword.submit')}
            </Button>
          </form>
        ) : !completed ? (
          <p
            role="alert"
            className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          >
            {t('auth.resetPassword.invalidLink')}
          </p>
        ) : null}

        <div className="text-center text-sm">
          <Link
            className="font-medium text-brand-gold hover:underline"
            to="/login"
          >
            {t('auth.resetPassword.backToLogin')}
          </Link>
        </div>
      </Card>
    </main>
  )
}
