import { FormEvent, useState } from 'react'
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
  const toast = useAppToast()
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (newPassword.length < 6) {
      toast.warning('Nova lozinka mora imati najmanje 6 znakova.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.warning('Potvrda lozinke nije ispravna.')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword })
      const updated = await refreshProfile()
      toast.success('Lozinka je uspješno promijenjena.')
      navigate(getPostAuthRedirectPath(updated), { replace: true })
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Promjena lozinke nije uspjela.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <OnboardingShell
      step={1}
      totalSteps={3}
      heroDecoration="lock"
      title="Promjena inicijalne lozinke"
      subtitle="Za nastavak rada potrebno je da promijenite inicijalnu lozinku."
      tip="Koristite jaku lozinku koju ne dijelite s drugima."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Trenutna lozinka</Label>
          <Input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nova lozinka</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Potvrda nove lozinke</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Učitavanje…' : 'Sačuvaj novu lozinku'}
        </Button>
        <div className="text-sm text-slate-500">
          Nakon ove koraka slijede podešavanje profila.
        </div>
      </form>
    </OnboardingShell>
  )
}
