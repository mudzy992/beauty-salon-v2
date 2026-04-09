import { useCallback, useEffect, useMemo, useState } from 'react'

import api from '../api/client'
import { getErrorMessage } from '../api/error'
import { useAppToast } from '../lib/toast/useAppToast'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Switch } from '../components/ui/switch'
import { Textarea } from '../components/ui/textarea'

const LOYALTY_ENABLED_KEY = 'loyalty_enabled'

interface LoyaltyAccountRow {
  id: string
  points: number
  tier: string | null
  isActive: boolean
  createdAt: string
  user: { id: string; username: string; email: string; firstName: string | null; lastName: string | null }
  _count: { transactions: number }
}

interface AppSetting {
  key: string
  value: string | null
}

export default function Loyalty() {
  const { success, error } = useAppToast()

  const [programEnabled, setProgramEnabled] = useState(false)
  const [accounts, setAccounts] = useState<LoyaltyAccountRow[]>([])
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const [redeemTarget, setRedeemTarget] = useState<LoyaltyAccountRow | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<LoyaltyAccountRow | null>(null)

  const [redeemPoints, setRedeemPoints] = useState<number>(0)
  const [redeemReason, setRedeemReason] = useState('')
  const [adjustDelta, setAdjustDelta] = useState<number>(0)
  const [adjustNote, setAdjustNote] = useState('')

  const loadSettings = useCallback(() => {
    setLoadingSettings(true)
    api
      .get<AppSetting[] | AppSetting>('/api/loyalty/settings')
      .then((res) => {
        const list: AppSetting[] = Array.isArray(res.data) ? res.data : [res.data]
        const enabled = list.find((s) => s.key === LOYALTY_ENABLED_KEY)?.value === 'true'
        setProgramEnabled(enabled)
      })
      .catch(() => setProgramEnabled(false))
      .finally(() => setLoadingSettings(false))
  }, [])

  const loadAccounts = useCallback(() => {
    setLoadingAccounts(true)
    api
      .get<LoyaltyAccountRow[]>('/api/loyalty/accounts')
      .then((res) => setAccounts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false))
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const handleProgramToggle = (checked: boolean) => {
    setUpdating('program')
    api
      .put(`/api/settings/${LOYALTY_ENABLED_KEY}`, {
        value: checked ? 'true' : 'false',
        description: 'Loyalty program uključen (true) ili isključen (false).',
      })
      .then(() => {
        setProgramEnabled(checked)
        success(checked ? 'Program uključen' : 'Program isključen')
      })
      .catch(() => error('Greška pri spremanju'))
      .finally(() => setUpdating(null))
  }

  const handleAccountActiveToggle = (id: string, isActive: boolean) => {
    setUpdating(id)
    api
      .patch(`/api/loyalty/accounts/${id}`, { isActive })
      .then(() => {
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, isActive } : a)))
        success(isActive ? 'Račun aktiviran' : 'Račun deaktiviran')
      })
      .catch(() => error('Greška pri ažuriranju'))
      .finally(() => setUpdating(null))
  }

  const userName = (u: LoyaltyAccountRow['user']) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email

  const openRedeem = (account: LoyaltyAccountRow) => {
    setRedeemTarget(account)
    setRedeemPoints(0)
    setRedeemReason('')
  }

  const openAdjust = (account: LoyaltyAccountRow) => {
    setAdjustTarget(account)
    setAdjustDelta(0)
    setAdjustNote('')
  }

  const redeemTitle = useMemo(() => {
    if (!redeemTarget) return null
    return `Račun: ${userName(redeemTarget.user)} (dostupno ${redeemTarget.points} bodova)`
  }, [redeemTarget])

  const adjustTitle = useMemo(() => {
    if (!adjustTarget) return null
    return `Račun: ${userName(adjustTarget.user)} (trenutno ${adjustTarget.points} bodova)`
  }, [adjustTarget])

  const handleRedeemConfirm = () => {
    if (!redeemTarget || redeemPoints <= 0) return
    setUpdating(`redeem-${redeemTarget.id}`)
    api
      .post(`/api/loyalty/accounts/${redeemTarget.id}/redeem`, { points: redeemPoints, reason: redeemReason })
      .then((res) => {
        setAccounts((prev) => prev.map((a) => (a.id === redeemTarget.id ? { ...a, points: res.data.points } : a)))
        success('Bodovi iskorišteni')
        setRedeemTarget(null)
      })
      .catch((err) => error(getErrorMessage(err)))
      .finally(() => setUpdating(null))
  }

  const handleAdjustConfirm = () => {
    if (!adjustTarget || adjustDelta === 0) return
    setUpdating(`adjust-${adjustTarget.id}`)
    api
      .post(`/api/loyalty/accounts/${adjustTarget.id}/adjust`, { pointsDelta: adjustDelta, note: adjustNote })
      .then((res) => {
        setAccounts((prev) => prev.map((a) => (a.id === adjustTarget.id ? { ...a, points: res.data.points } : a)))
        success('Bodovi ažurirani')
        setAdjustTarget(null)
      })
      .catch((err) => error(getErrorMessage(err)))
      .finally(() => setUpdating(null))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Loyalty program</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Infrastruktura programa vjernosti. Program je neaktivan dok ga ne uključite. Računi se mogu aktivirati pojedinačno.
        </p>
      </div>

      <Card className="mb-6">
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-50">Program uključen</p>
              <p className="text-xs text-slate-500">Vidljiv klijentima i spreman za buduće bodovanje</p>
            </div>
            <Switch
              checked={programEnabled}
              disabled={loadingSettings || updating === 'program'}
              onCheckedChange={(checked) => handleProgramToggle(checked)}
            />
          </div>

          {!loadingSettings ? (
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-200">
              <p className="font-medium">Gdje podesiti loyalty pravila</p>
              <p className="mt-1">
                Detaljna konfiguracija (bodovi po valuti, tierovi, pravila za korištenje bodova) se uređuje kroz stranicu Postavke → Sistem → &quot;Loyalty
                program&quot;. Ovdje vidite račune i možete ručno koristiti ili korigovati bodove.
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Loyalty računi</h2>
            {loadingAccounts ? <p className="text-xs text-slate-500">Učitavanje...</p> : null}
          </div>

          {loadingAccounts ? (
            <div className="py-10 text-center text-sm text-slate-500">Učitavanje...</div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nema loyalty računa. Kada je program uključen i klijent ima barem jednu završenu rezervaciju, račun će se automatski kreirati.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-3 font-medium">Korisnik</th>
                    <th className="p-3 font-medium">Email</th>
                    <th className="p-3 text-right font-medium">Bodovi</th>
                    <th className="p-3 font-medium">Tier</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Transakcije</th>
                    <th className="p-3 font-medium">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{userName(a.user)}</td>
                      <td className="p-3">{a.user.email}</td>
                      <td className="p-3 text-right">{a.points}</td>
                      <td className="p-3">{a.tier ?? '-'}</td>
                      <td className="p-3">
                        <Badge variant={a.isActive ? 'success' : 'secondary'}>{a.isActive ? 'Aktivan' : 'Neaktivan'}</Badge>
                      </td>
                      <td className="p-3">{a._count.transactions}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            checked={a.isActive}
                            disabled={updating === a.id}
                            onCheckedChange={(checked) => handleAccountActiveToggle(a.id, checked)}
                          />
                          <Button type="button" size="sm" variant="outline" onClick={() => openRedeem(a)}>
                            Redeem
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => openAdjust(a)}>
                            Adjust
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      <Dialog open={!!redeemTarget} onOpenChange={(nextOpen) => (nextOpen ? null : setRedeemTarget(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Iskoristi bodove</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{redeemTitle}</p>
            <div className="space-y-2">
              <Label>Broj bodova za korištenje</Label>
              <Input
                type="number"
                min={1}
                max={redeemTarget?.points ?? undefined}
                value={Number.isFinite(redeemPoints) ? String(redeemPoints) : '0'}
                onChange={(e) => setRedeemPoints(Number(e.target.value || 0))}
              />
            </div>
            <div className="space-y-2">
              <Label>Napomena (opcionalno)</Label>
              <Textarea value={redeemReason} onChange={(e) => setRedeemReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setRedeemTarget(null)}>
              Zatvori
            </Button>
            <Button type="button" onClick={handleRedeemConfirm} disabled={updating === `redeem-${redeemTarget?.id}`}>
              Potvrdi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustTarget} onOpenChange={(nextOpen) => (nextOpen ? null : setAdjustTarget(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ručna korekcija bodova</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{adjustTitle}</p>
            <div className="space-y-2">
              <Label>Promjena bodova (+ ili -)</Label>
              <Input
                type="number"
                value={Number.isFinite(adjustDelta) ? String(adjustDelta) : '0'}
                onChange={(e) => setAdjustDelta(Number(e.target.value || 0))}
              />
            </div>
            <div className="space-y-2">
              <Label>Napomena (preporučeno)</Label>
              <Textarea value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setAdjustTarget(null)}>
              Zatvori
            </Button>
            <Button type="button" onClick={handleAdjustConfirm} disabled={updating === `adjust-${adjustTarget?.id}`}>
              Spremi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
