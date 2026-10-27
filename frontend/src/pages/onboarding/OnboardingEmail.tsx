import { FormEvent, useMemo, useState } from 'react'
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

export default function OnboardingEmail() {
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const toast = useAppToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState(user?.email ?? '')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(() => !!user?.email?.trim() && !user?.isEmailVerified)
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    try {
      await api.put('/api/users/profile', { email: trimmed })
      await refreshProfile()
      await api.post('/auth/send-verification-email')
      setCodeSent(true)
      toast.success(t('onboarding.codeSent'))
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('onboarding.sendCodeFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    const trimmed = code.trim()
    if (trimmed.length !== 6) {
      toast.warning(t('onboarding.codeLengthInvalid'))
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/verify-email', { token: trimmed })
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('onboarding.verificationFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      await api.post('/auth/send-verification-email')
      toast.success(t('onboarding.codeResent'))
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('onboarding.sendCodeFailed'))
    } finally {
      setLoading(false)
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
        {!codeSent ? (
          <form onSubmit={handleSaveAndSend}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('onboarding.emailLabel')}</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? t('onboarding.sendingCode') : t('onboarding.saveAndSendCode')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="font-semibold text-slate-900">{t('onboarding.verificationCode')}</div>
            <OtpInput value={code} onChange={setCode} disabled={loading} />
            <Button onClick={handleVerify} disabled={loading} className="w-full">
              {loading ? t('onboarding.verifyingCode') : t('onboarding.verifyEmail')}
            </Button>
            <Button variant="outline" onClick={handleResend} disabled={loading} className="w-full">
              {loading ? t('onboarding.sendingCode') : t('onboarding.resendCode')}
            </Button>
          </div>
        )}
      </div>
    </OnboardingShell>
  )
}

