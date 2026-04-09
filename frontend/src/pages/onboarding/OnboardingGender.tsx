import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import OnboardingShell from '../../components/OnboardingShell'
import { Button } from '../../components/ui/button'
import { useAppToast } from '../../lib/toast/useAppToast'

type Gender = 'MALE' | 'FEMALE'

export default function OnboardingGender() {
  const { user, refreshProfile } = useAuth()
  const toast = useAppToast()
  const navigate = useNavigate()
  const [gender, setGender] = useState<Gender | null>(() =>
    user?.gender === 'MALE' || user?.gender === 'FEMALE' ? user.gender : null,
  )
  const [saving, setSaving] = useState(false)

  const isClient = useMemo(() => (user?.roles ?? []).includes('CLIENT'), [user?.roles])

  useEffect(() => {
    if (gender !== null) return
    if (user?.gender === 'MALE' || user?.gender === 'FEMALE') setGender(user.gender)
  }, [user?.gender, gender])

  if (!user || !isClient) return null
  if (user.genderOnboardingCompleted === true) {
    return <Navigate to="/onboarding/email" replace />
  }

  const handleContinue = async () => {
    if (!gender) {
      toast.warning('Odaberite spol.')
      return
    }
    setSaving(true)
    try {
      await api.put('/api/users/profile', { gender })
      await refreshProfile()
      navigate('/onboarding/email', { replace: true })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Spremanje nije uspjelo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <OnboardingShell
      step={2}
      totalSteps={3}
      heroDecoration="gender"
      title="Vaš spol"
      subtitle="Odaberite spol. Ovaj korak je obavezan i možete ga kasnije promijeniti u profilu."
      tip="Podatak koristimo za personalizaciju i filtriranje usluga."
    >
      <div className="space-y-4">
        <div className="font-semibold text-slate-900">Spol</div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant={gender === 'MALE' ? 'default' : 'outline'}
            onClick={() => setGender('MALE')}
          >
            Muški
          </Button>
          <Button
            type="button"
            variant={gender === 'FEMALE' ? 'default' : 'outline'}
            onClick={() => setGender('FEMALE')}
          >
            Ženski
          </Button>
        </div>
        <Button type="button" onClick={handleContinue} disabled={saving} className="w-full">
          {saving ? 'Spremanje…' : 'Nastavi'}
        </Button>
      </div>
    </OnboardingShell>
  )
}

