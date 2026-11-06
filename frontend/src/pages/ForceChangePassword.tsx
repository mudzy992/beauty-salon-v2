import { FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import OnboardingShell from '../components/OnboardingShell'
import { getPostAuthRedirectPath } from '../utils/clientOnboarding'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAppToast } from '../lib/toast/useAppToast'

export default function ForceChangePassword() {
  const { t } = useTranslation()
  const toast = useAppToast()
  const { refreshProfile, replaceToken } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const requestGeneration = useRef(0)
  const requestInFlight = useRef(false)

  useEffect(() => () => {
    requestGeneration.current += 1
    requestInFlight.current = false
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (requestInFlight.current) return
    if (newPassword.length < 6) {
      toast.warning(t('onboarding.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.warning(t('onboarding.passwordMismatch'))
      return
    }
    const generation = ++requestGeneration.current
    requestInFlight.current = true
    setLoading(true)
    try {
      const response = await api.post<{ access_token: string }>(
        '/auth/change-password',
        { currentPassword, newPassword },
      )
      replaceToken(response.data.access_token)
      const updated = await refreshProfile()
      if (generation !== requestGeneration.current) return
      toast.success(t('onboarding.passwordChanged'))
      navigate(getPostAuthRedirectPath(updated), { replace: true })
    } catch (error: any) {
      if (generation === requestGeneration.current) {
        toast.error(error?.response?.data?.message || t('onboarding.passwordChangeFailed'))
      }
    } finally {
      if (generation === requestGeneration.current) {
        requestInFlight.current = false
        setLoading(false)
      }
    }
  }

  return (
    <OnboardingShell
      step={1}
      totalSteps={3}
      heroDecoration="lock"
      title={t('onboarding.title')}
      subtitle={t('onboarding.subtitle')}
      tip={t('onboarding.passwordTip')}
    >
      <div>
        {loading ? (
          <span role="status" aria-live="polite" className="sr-only">
            {t('common.loading')}
          </span>
        ) : null}
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          aria-busy={loading}
        >
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              {t('onboarding.currentPassword')}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">{t('onboarding.newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t('onboarding.confirmPassword')}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              disabled={loading}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? t('common.loading') : t('onboarding.savePassword')}
          </Button>
          <div className="text-sm text-slate-500">
            {t('onboarding.nextStep')}
          </div>
        </form>
      </div>
    </OnboardingShell>
  )
}
