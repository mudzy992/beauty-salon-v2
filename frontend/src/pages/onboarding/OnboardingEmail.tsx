import { FormEvent, useMemo, useState } from 'react'
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
      toast.warning('Email je obavezan.')
      return
    }
    setLoading(true)
    try {
      await api.put('/api/users/profile', { email: trimmed })
      await refreshProfile()
      await api.post('/auth/send-verification-email')
      setCodeSent(true)
      toast.success('Poslali smo kod na email.')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Slanje koda nije uspjelo.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    const trimmed = code.trim()
    if (trimmed.length !== 6) {
      toast.warning('Unesite 6-znamenkasti kod.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/verify-email', { token: trimmed })
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Verifikacija nije uspjela.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    try {
      await api.post('/auth/send-verification-email')
      toast.success('Kod je ponovo poslan.')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Slanje koda nije uspjelo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={3}
      totalSteps={3}
      heroDecoration="mail"
      title="Email adresa"
      subtitle="Unesite email na koji šaljemo potvrde i obavještenja, zatim unesite kod iz poruke."
      tip="Provjerite i spam/junk folder ako kod ne stigne odmah."
    >
      <div className="space-y-4">
        {!codeSent ? (
          <form onSubmit={handleSaveAndSend}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Slanje…' : 'Sačuvaj email i pošalji kod'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="font-semibold text-slate-900">Verifikacijski kod</div>
            <OtpInput value={code} onChange={setCode} disabled={loading} />
            <Button onClick={handleVerify} disabled={loading} className="w-full">
              {loading ? 'Provjera…' : 'Potvrdi email'}
            </Button>
            <Button variant="outline" onClick={handleResend} disabled={loading} className="w-full">
              {loading ? 'Slanje…' : 'Pošalji kod ponovo'}
            </Button>
          </div>
        )}
      </div>
    </OnboardingShell>
  )
}

