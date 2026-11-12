import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import OnboardingShell from '../../components/OnboardingShell'
import { Button } from '../../components/ui/button'
import { useAppToast } from '../../lib/toast/useAppToast'

type Gender = 'MALE' | 'FEMALE'

export default function OnboardingGender() {
  const { t } = useTranslation()
  const { user, refreshProfile } = useAuth()
  const toast = useAppToast()
  const navigate = useNavigate()
  const [gender, setGender] = useState<Gender | null>(() =>
    user?.gender === 'MALE' || user?.gender === 'FEMALE' ? user.gender : null,
  )
  const [saving, setSaving] = useState(false)
  const requestGeneration = useRef(0)
  const requestInFlight = useRef(false)

  useEffect(() => () => {
    requestGeneration.current += 1
    requestInFlight.current = false
  }, [])

  const isClient = useMemo(() => (user?.roles ?? []).includes('CLIENT'), [user?.roles])

  useEffect(() => {
    if (gender !== null) return
    if (user?.gender === 'MALE' || user?.gender === 'FEMALE') setGender(user.gender)
  }, [user?.gender, gender])

  if (!user || !isClient) return null
  if (user.genderOnboardingCompleted === true) {
    return <Navigate to="/onboarding/email" replace />
  }

  const handleContinue = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (requestInFlight.current) return
    if (!gender) {
      toast.warning(t('onboarding.genderRequired'))
      return
    }

    const generation = ++requestGeneration.current
    requestInFlight.current = true
    setSaving(true)
    try {
      await api.put('/api/users/profile', { gender })
      await refreshProfile()
      if (generation !== requestGeneration.current) return
      navigate('/onboarding/email', { replace: true })
    } catch (error: any) {
      if (generation === requestGeneration.current) {
        toast.error(error?.response?.data?.message || t('onboarding.profileSaveFailed'))
      }
    } finally {
      if (generation === requestGeneration.current) {
        requestInFlight.current = false
        setSaving(false)
      }
    }
  }

  return (
    <OnboardingShell
      step={2}
      totalSteps={3}
      heroDecoration="gender"
      title={t('onboarding.genderTitle')}
      subtitle={t('onboarding.genderSubtitle')}
      tip={t('onboarding.genderTip')}
    >
      <div className="space-y-4">
        {saving ? (
          <span role="status" aria-live="polite" className="sr-only">
            {t('common.saving')}
          </span>
        ) : null}
        <form onSubmit={handleContinue} aria-busy={saving} className="space-y-4">
          <fieldset disabled={saving} className="min-w-0 space-y-4">
            <legend className="font-semibold text-slate-900">
              {t('onboarding.genderLabel')}
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={gender === 'MALE' ? 'default' : 'outline'}
                aria-pressed={gender === 'MALE'}
                onClick={() => setGender('MALE')}
              >
                {t('onboarding.male')}
              </Button>
              <Button
                type="button"
                variant={gender === 'FEMALE' ? 'default' : 'outline'}
                aria-pressed={gender === 'FEMALE'}
                onClick={() => setGender('FEMALE')}
              >
                {t('onboarding.female')}
              </Button>
            </div>
          </fieldset>
          <Button type="submit" disabled={saving} className="w-full" aria-busy={saving} data-aurum-cta="primary">
            {saving ? t('common.saving') : t('onboarding.continue')}
          </Button>
        </form>
      </div>
    </OnboardingShell>
  )
}
