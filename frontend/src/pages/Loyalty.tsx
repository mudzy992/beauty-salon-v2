import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatLocalizedNumber } from '../i18n/locale-utils.mjs'

import api from '../api/client'
import { getErrorMessage, getErrorCode } from '../api/error'
import { resolveAdminApiError } from '../features/admin/admin-api-error.mjs'
import { useAppToast } from '../lib/toast/useAppToast'

import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { DataTable, type DataTableColumn } from '../features/shell/admin/ui/data-table'
import { PageHeader } from '../features/shell/admin/ui/page-header'
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
      .catch((err) => {
        const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'loyaltyAdmin.updateFailed', getErrorCode(err))
        error(t(apiErr.key, apiErr.values))
      })
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
      .catch((err) => {
        const apiErr = resolveAdminApiError(getErrorMessage(err, ''), 'loyaltyAdmin.updateFailed', getErrorCode(err))
        error(t(apiErr.key, apiErr.values))
      })
      .finally(() => setUpdating(null))
  }

  const columns: DataTableColumn<LoyaltyAccountRow>[] = [
    {
      key: 'user',
      headerKey: 'loyaltyAdmin.user',
      className: 'p-3 font-medium text-slate-900 dark:text-slate-50',
      render: (a) => userName(a.user),
    },
    { key: 'email', headerKey: 'loyaltyAdmin.email', className: 'p-3', render: (a) => a.user.email },
    {
      key: 'points',
      headerKey: 'loyaltyAdmin.points',
      align: 'right',
      className: 'p-3',
      render: (a) => formatLocalizedNumber(a.points, i18n.language),
    },
    { key: 'tier', headerKey: 'loyaltyAdmin.tier', className: 'p-3', render: (a) => a.tier ?? '-' },
    {
      key: 'status',
      headerKey: 'loyaltyAdmin.status',
      className: 'p-3',
      render: (a) => (
        <Badge variant={a.isActive ? 'success' : 'secondary'}>
          {t(a.isActive ? 'loyaltyAdmin.active' : 'loyaltyAdmin.inactive')}
        </Badge>
      ),
    },
    {
      key: 'transactions',
      headerKey: 'loyaltyAdmin.transactions',
      className: 'p-3',
      render: (a) => formatLocalizedNumber(a._count.transactions, i18n.language),
    },
    {
      key: 'actions',
      headerKey: 'loyaltyAdmin.actions',
      className: 'p-3',
      render: (a) => (
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
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('loyaltyAdmin.title')}
        description={t('loyaltyAdmin.description')}
      />

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
              <DataTable
                caption={t('loyaltyAdmin.caption')}
                columns={columns}
                rows={accounts}
                rowKey={(a) => a.id}
              />
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
              <Label htmlFor="redeem-points">{t('loyaltyAdmin.pointsToRedeem')}</Label>
              <Input
                id="redeem-points"
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
              <Label htmlFor="redeem-note">{t('loyaltyAdmin.optionalNote')}</Label>
              <Textarea
                id="redeem-note"
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
              <Label htmlFor="adjust-delta">{t('loyaltyAdmin.pointsChange')}</Label>
              <Input
                id="adjust-delta"
                type="number"
                value={Number.isFinite(adjustDelta) ? String(adjustDelta) : '0'}
                onChange={(e) => {
                  setAdjustDelta(Number(e.target.value || 0))
                  setAdjustIdempotencyKey(globalThis.crypto.randomUUID())
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjust-note">{t('loyaltyAdmin.recommendedNote')}</Label>
              <Textarea
                id="adjust-note"
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
