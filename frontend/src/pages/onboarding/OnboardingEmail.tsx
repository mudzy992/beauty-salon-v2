import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import OnboardingShell from '../../components/OnboardingShell'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { OtpInput } from '../../components/ui/otp-input'
import { useAppToast } from '../../lib/toast/useAppToast'

type EmailVerificationAction = 'send' | 'verify' | 'resend'

export default function OnboardingEmail() {
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const toast = useAppToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState(user?.email ?? '')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(() => !!user?.email?.trim() && !user?.isEmailVerified)
  const [loading, setLoading] = useState(false)
  const [activeAction, setActiveAction] = useState<EmailVerificationAction | null>(null)
  const requestGeneration = useRef(0)
  const requestInFlight = useRef(false)

  useEffect(() => () => {
    requestGeneration.current += 1
    requestInFlight.current = false
  }, [])

  const beginRequest = (action: EmailVerificationAction) => {
    if (requestInFlight.current) return null
    const generation = ++requestGeneration.current
    requestInFlight.current = true
    setActiveAction(action)
    setLoading(true)
    return generation
  }

  const isCurrentRequest = (generation: number) =>
    generation === requestGeneration.current

  const finishRequest = (generation: number) => {
    if (!isCurrentRequest(generation)) return
    requestInFlight.current = false
    setActiveAction(null)
    setLoading(false)
  }

  const isClient = useMemo(() => (user?.roles ?? []).includes('CLIENT'), [user?.roles])

  if (!user || !isClient) return null
  if (user.genderOnboardingCompleted !== true) {
    return <Navigate to="/onboarding/gender" replace />
  }
  if (user.isEmailVerified && user.email) {
    return <Navigate to="/" replace />
  }

  const handleSaveAndSend = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast.warning(t('onboarding.emailRequired'))
      return
    }
    const generation = beginRequest('send')
    if (generation === null) return

    try {
      await api.put('/api/users/profile', { email: trimmed })
      if (!isCurrentRequest(generation)) return
      await refreshProfile()
      if (!isCurrentRequest(generation)) return
      await api.post('/auth/send-verification-email')
      if (!isCurrentRequest(generation)) return
      setCodeSent(true)
      toast.success(t('onboarding.codeSent'))
    } catch (error: any) {
      if (isCurrentRequest(generation)) {
        toast.error(error?.response?.data?.message || t('onboarding.sendCodeFailed'))
      }
    } finally {
      finishRequest(generation)
    }
  }

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length !== 6) {
      toast.warning(t('onboarding.codeLengthInvalid'))
      return
    }
    const generation = beginRequest('verify')
    if (generation === null) return

    try {
      await api.post('/auth/verify-email', { token: trimmed })
      if (!isCurrentRequest(generation)) return
      await refreshProfile()
      if (!isCurrentRequest(generation)) return
      navigate('/', { replace: true })
    } catch (error: any) {
      if (isCurrentRequest(generation)) {
        toast.error(error?.response?.data?.message || t('onboarding.verificationFailed'))
      }
    } finally {
      finishRequest(generation)
    }
  }

  const handleResend = async () => {
    const generation = beginRequest('resend')
    if (generation === null) return

    try {
      await api.post('/auth/send-verification-email')
      if (!isCurrentRequest(generation)) return
      toast.success(t('onboarding.codeResent'))
    } catch (error: any) {
      if (isCurrentRequest(generation)) {
        toast.error(error?.response?.data?.message || t('onboarding.sendCodeFailed'))
      }
    } finally {
      finishRequest(generation)
    }
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={3}
      heroDecoration="mail"
      title={t('onboarding.emailTitle')}
      subtitle={t('onboarding.emailSubtitle')}
      tip={t('onboarding.emailTip')}
    >
      <div className="space-y-4">
        {loading ? (
          <span role="status" aria-live="polite" className="sr-only">
            {activeAction === 'verify'
              ? t('onboarding.verifyingCode')
              : t('onboarding.sendingCode')}
          </span>
        ) : null}
        {!codeSent ? (
          <form onSubmit={handleSaveAndSend} aria-busy={loading} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('onboarding.emailLabel')}</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full" data-aurum-cta="primary">
              {loading ? t('onboarding.sendingCode') : t('onboarding.saveAndSendCode')}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <form onSubmit={handleVerify} aria-busy={loading} className="space-y-4">
              <fieldset className="space-y-4">
                <legend className="font-semibold text-slate-900">
                  {t('onboarding.verificationCode')}
                </legend>
                <OtpInput value={code} onChange={setCode} disabled={loading} />
              </fieldset>
              <Button type="submit" disabled={loading} className="w-full" data-aurum-cta="primary">
                {loading ? t('onboarding.verifyingCode') : t('onboarding.verifyEmail')}
              </Button>
            </form>
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={loading}
              className="w-full"
            >
              {loading ? t('onboarding.sendingCode') : t('onboarding.resendCode')}
            </Button>
          </div>
        )}
      </div>
    </OnboardingShell>
  )
}
