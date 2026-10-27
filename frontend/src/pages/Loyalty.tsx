import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber } from '../i18n/locale-utils.mjs'

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
import { LoyaltyProgramSettings } from '../features/loyalty/loyalty-program-settings'

interface LoyaltyAccountRow {
  id: string
  points: number
  tier: string | null
  isActive: boolean
  createdAt: string
  user: { id: string; username: string; email: string; firstName: string | null; lastName: string | null }
  _count: { transactions: number }
}

export default function Loyalty() {
  const { t, i18n } = useTranslation()
  const { success, error } = useAppToast()

  const [accounts, setAccounts] = useState<LoyaltyAccountRow[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const [redeemTarget, setRedeemTarget] = useState<LoyaltyAccountRow | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<LoyaltyAccountRow | null>(null)

  const [redeemPoints, setRedeemPoints] = useState<number>(0)
  const [redeemReason, setRedeemReason] = useState('')
  const [redeemIdempotencyKey, setRedeemIdempotencyKey] = useState('')
  const [adjustDelta, setAdjustDelta] = useState<number>(0)
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustIdempotencyKey, setAdjustIdempotencyKey] = useState('')

  const loadAccounts = useCallback(() => {
    setLoadingAccounts(true)
    api
      .get<LoyaltyAccountRow[]>('/api/loyalty/accounts')
      .then((res) => setAccounts(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAccounts([]))
      .finally(() => setLoadingAccounts(false))
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const handleAccountActiveToggle = (id: string, isActive: boolean) => {
    setUpdating(id)
    api
      .patch(`/api/loyalty/accounts/${id}`, { isActive })
      .then(() => {
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, isActive } : a)))
        success(t(isActive ? 'loyaltyAdmin.accountActivated' : 'loyaltyAdmin.accountDeactivated'))
      })
      .catch(() => error(t('loyaltyAdmin.updateFailed')))
      .finally(() => setUpdating(null))
  }

  const userName = (u: LoyaltyAccountRow['user']) => [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email

  const openRedeem = (account: LoyaltyAccountRow) => {
    setRedeemTarget(account)
    setRedeemPoints(0)
    setRedeemReason('')
    setRedeemIdempotencyKey(globalThis.crypto.randomUUID())
  }

  const openAdjust = (account: LoyaltyAccountRow) => {
    setAdjustTarget(account)
    setAdjustDelta(0)
    setAdjustNote('')
    setAdjustIdempotencyKey(globalThis.crypto.randomUUID())
  }

  const redeemTitle = useMemo(() => {
    if (!redeemTarget) return null
    return t('loyaltyAdmin.redeemTitle', {
      name: userName(redeemTarget.user),
      points: formatLocalizedNumber(redeemTarget.points, i18n.language),
    })
  }, [i18n.language, redeemTarget, t])

  const adjustTitle = useMemo(() => {
    if (!adjustTarget) return null
    return t('loyaltyAdmin.adjustTitle', {
      name: userName(adjustTarget.user),
      points: formatLocalizedNumber(adjustTarget.points, i18n.language),
    })
  }, [adjustTarget, i18n.language, t])

  const handleRedeemConfirm = () => {
    if (!redeemTarget || redeemPoints <= 0 || !redeemIdempotencyKey) return
    setUpdating(`redeem-${redeemTarget.id}`)
    api
      .post(`/api/loyalty/accounts/${redeemTarget.id}/redeem`, {
        points: redeemPoints,
        reason: redeemReason,
        idempotencyKey: redeemIdempotencyKey,
      })
      .then((res) => {
        setAccounts((prev) => prev.map((a) => (a.id === redeemTarget.id ? { ...a, points: res.data.points } : a)))
        success(t('loyaltyAdmin.pointsRedeemed'))
        setRedeemTarget(null)
      })
      .catch((err) => error(getErrorMessage(err)))
      .finally(() => setUpdating(null))
  }

  const handleAdjustConfirm = () => {
    if (!adjustTarget || adjustDelta === 0 || !adjustIdempotencyKey) return
    setUpdating(`adjust-${adjustTarget.id}`)
    api
      .post(`/api/loyalty/accounts/${adjustTarget.id}/adjust`, {
        pointsDelta: adjustDelta,
        note: adjustNote,
        idempotencyKey: adjustIdempotencyKey,
      })
      .then((res) => {
        setAccounts((prev) => prev.map((a) => (a.id === adjustTarget.id ? { ...a, points: res.data.points } : a)))
        success(t('loyaltyAdmin.pointsAdjusted'))
        setAdjustTarget(null)
      })
      .catch((err) => error(getErrorMessage(err)))
      .finally(() => setUpdating(null))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('loyaltyAdmin.title')}</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          {t('loyaltyAdmin.description')}
        </p>
      </div>

      <LoyaltyProgramSettings />

      <Card>
        <div className="p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{t('loyaltyAdmin.accounts')}</h2>
            {loadingAccounts ? <p className="text-xs text-slate-500">{t('loyaltyAdmin.loading')}</p> : null}
          </div>

          {loadingAccounts ? (
            <div className="py-10 text-center text-sm text-slate-500">{t('loyaltyAdmin.loading')}</div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t('loyaltyAdmin.noAccounts')}
            </p>
          ) : (
            <div className="app-table-wrap">
              <table className="app-table w-full border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-3 font-medium">{t('loyaltyAdmin.user')}</th>
                    <th className="p-3 font-medium">{t('loyaltyAdmin.email')}</th>
                    <th className="p-3 text-right font-medium">{t('loyaltyAdmin.points')}</th>
                    <th className="p-3 font-medium">{t('loyaltyAdmin.tier')}</th>
                    <th className="p-3 font-medium">{t('loyaltyAdmin.status')}</th>
                    <th className="p-3 font-medium">{t('loyaltyAdmin.transactions')}</th>
                    <th className="p-3 font-medium">{t('loyaltyAdmin.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 dark:border-slate-800/80">
                      <td className="p-3 font-medium text-slate-900 dark:text-slate-50">{userName(a.user)}</td>
                      <td className="p-3">{a.user.email}</td>
                      <td className="p-3 text-right">{formatLocalizedNumber(a.points, i18n.language)}</td>
                      <td className="p-3">{a.tier ?? '-'}</td>
                      <td className="p-3">
                        <Badge variant={a.isActive ? 'success' : 'secondary'}>{t(a.isActive ? 'loyaltyAdmin.active' : 'loyaltyAdmin.inactive')}</Badge>
                      </td>
                      <td className="p-3">{formatLocalizedNumber(a._count.transactions, i18n.language)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Switch
                            checked={a.isActive}
                            disabled={updating === a.id}
                            onCheckedChange={(checked) => handleAccountActiveToggle(a.id, checked)}
                          />
                          <Button type="button" size="sm" variant="outline" onClick={() => openRedeem(a)}>
                            {t('loyaltyAdmin.redeem')}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => openAdjust(a)}>
                            {t('loyaltyAdmin.adjust')}
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
            <DialogTitle>{t('loyaltyAdmin.redeemDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{redeemTitle}</p>
            <div className="space-y-2">
              <Label>{t('loyaltyAdmin.pointsToRedeem')}</Label>
              <Input
                type="number"
                min={1}
                max={redeemTarget?.points ?? undefined}
                value={Number.isFinite(redeemPoints) ? String(redeemPoints) : '0'}
                onChange={(e) => {
                  setRedeemPoints(Number(e.target.value || 0))
                  setRedeemIdempotencyKey(globalThis.crypto.randomUUID())
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('loyaltyAdmin.optionalNote')}</Label>
              <Textarea
                value={redeemReason}
                onChange={(e) => {
                  setRedeemReason(e.target.value)
                  setRedeemIdempotencyKey(globalThis.crypto.randomUUID())
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setRedeemTarget(null)}>
              {t('loyaltyAdmin.close')}
            </Button>
            <Button type="button" onClick={handleRedeemConfirm} disabled={updating === `redeem-${redeemTarget?.id}`}>
              {t('loyaltyAdmin.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adjustTarget} onOpenChange={(nextOpen) => (nextOpen ? null : setAdjustTarget(null))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('loyaltyAdmin.adjustDialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{adjustTitle}</p>
            <div className="space-y-2">
              <Label>{t('loyaltyAdmin.pointsChange')}</Label>
              <Input
                type="number"
                value={Number.isFinite(adjustDelta) ? String(adjustDelta) : '0'}
                onChange={(e) => {
                  setAdjustDelta(Number(e.target.value || 0))
                  setAdjustIdempotencyKey(globalThis.crypto.randomUUID())
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('loyaltyAdmin.recommendedNote')}</Label>
              <Textarea
                value={adjustNote}
                onChange={(e) => {
                  setAdjustNote(e.target.value)
                  setAdjustIdempotencyKey(globalThis.crypto.randomUUID())
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setAdjustTarget(null)}>
              {t('loyaltyAdmin.close')}
            </Button>
            <Button type="button" onClick={handleAdjustConfirm} disabled={updating === `adjust-${adjustTarget?.id}`}>
              {t('loyaltyAdmin.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
