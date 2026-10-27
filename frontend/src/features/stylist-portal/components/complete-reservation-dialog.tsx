import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import type { ClientDebt, Reservation } from '../types'
import {
  buildCompleteDialogHints,
  validateCompleteDebtsIntent,
} from '../utils/complete-dialog-helpers'
import {
  computeReservationMinimumCharge,
  parseReservationMoney,
} from '../utils/reservation-detail'
import { ClientDebtSelector } from './client-debt-selector'
import { formatLocalizedAmount } from '../../../i18n/locale-utils.mjs'

export type CompleteReservationPayload = {
  paidAmount: number
  settledDebtIds: string[]
  debtHandling: 'CREATE_DEBT' | 'IGNORE_DEBT'
  tipAmount: number
  notes?: string
  shortfall: number
}

type CompleteReservationDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  reservation: Reservation
  debts: ClientDebt[]
  debtsLoading: boolean
  profileId: string | null
  onValidationError: (message: string) => void
  onConfirm: (payload: CompleteReservationPayload) => void | Promise<void>
}

export const CompleteReservationDialog = ({
  open,
  onOpenChange,
  pending,
  reservation,
  debts,
  debtsLoading,
  profileId,
  onValidationError,
  onConfirm,
}: CompleteReservationDialogProps) => {
  const { t, i18n } = useTranslation()
  const [actualPrice, setActualPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [createDebt, setCreateDebt] = useState(true)
  const [selectedDebtIds, setSelectedDebtIds] = useState<Record<string, boolean>>({})
  const [skipDebtsDespiteIntent, setSkipDebtsDespiteIntent] = useState(false)
  const wasOpen = useRef(false)
  const minimumCharge = computeReservationMinimumCharge(reservation)
  const selectedDebtSum = useMemo(
    () =>
      debts
        .filter((debt) => selectedDebtIds[debt.id])
        .reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0),
    [debts, selectedDebtIds],
  )
  const paidAmount = parseReservationMoney(actualPrice)
  const chargeAmount = minimumCharge + selectedDebtSum
  const shortfall = Math.max(0, chargeAmount - paidAmount)
  const tipAmount = Math.max(0, paidAmount - chargeAmount)

  useEffect(() => {
    if (!open) {
      wasOpen.current = false
      return
    }
    if (wasOpen.current) return
    wasOpen.current = true
    const shouldSelectDebts = !!reservation.payDebtsIntent
    setSelectedDebtIds(
      shouldSelectDebts ? Object.fromEntries(debts.map((debt) => [debt.id, true])) : {},
    )
    const debtsSum = shouldSelectDebts
      ? debts.reduce((sum, debt) => sum + (Number(debt.amount) || 0), 0)
      : 0
    setActualPrice(String(minimumCharge + debtsSum))
    setCreateDebt(true)
    setNotes('')
    setSkipDebtsDespiteIntent(false)
  }, [open, reservation.payDebtsIntent, debts, minimumCharge])

  const handleConfirm = async () => {
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
      onValidationError(t('stylistPortal.reservationDialogs.complete.invalidAmount'))
      return
    }
    if (selectedDebtSum > 0 && paidAmount < selectedDebtSum) {
      onValidationError(t('stylistPortal.reservationDialogs.complete.insufficientForDebts'))
      return
    }
    const intentError = validateCompleteDebtsIntent({
      payDebtsIntent: reservation.payDebtsIntent,
      debtsCount: debts.length,
      selectedDebtIds,
      skipDebtsDespiteIntent,
    })
    if (intentError) {
      onValidationError(t(intentError))
      return
    }
    await onConfirm({
      paidAmount,
      settledDebtIds: debts.filter((debt) => selectedDebtIds[debt.id]).map((debt) => debt.id),
      debtHandling: shortfall > 0 && createDebt ? 'CREATE_DEBT' : 'IGNORE_DEBT',
      tipAmount,
      notes: notes.trim() || undefined,
      shortfall,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('stylistPortal.reservationDialogs.complete.title')}</DialogTitle>
          <DialogDescription>
            {buildCompleteDialogHints(reservation)
              .map(({ key, amount }) =>
                t(key, amount === undefined
                  ? undefined
                  : { amount: formatLocalizedAmount(amount, i18n.language) }),
              )
              .join(' ')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="price">{t('stylistPortal.reservationDialogs.complete.paidAmount')}</Label>
          <Input
            id="price"
            value={actualPrice}
            onChange={(event) => setActualPrice(event.target.value)}
            inputMode="decimal"
          />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('stylistPortal.reservationDialogs.complete.chargeAmount', {
              amount: formatLocalizedAmount(chargeAmount, i18n.language),
            })}
          </p>
          {tipAmount > 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t('stylistPortal.reservationDialogs.complete.tipAmount', {
                amount: formatLocalizedAmount(tipAmount, i18n.language),
              })}
            </p>
          ) : null}
          {shortfall > 0 ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createDebt}
                onChange={(event) => setCreateDebt(event.target.checked)}
              />
              {t('stylistPortal.reservationDialogs.complete.recordDebt', {
                amount: formatLocalizedAmount(shortfall, i18n.language),
              })}
            </label>
          ) : null}
        </div>
        <ClientDebtSelector
          debts={debts}
          isLoading={debtsLoading}
          profileId={profileId}
          selectedDebtIds={selectedDebtIds}
          selectedDebtSum={selectedDebtSum}
          onToggle={(debtId) =>
            setSelectedDebtIds((current) => ({
              ...current,
              [debtId]: !current[debtId],
            }))
          }
        />
        {reservation.payDebtsIntent && debts.length > 0 ? (
          <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              className="mt-1"
              checked={skipDebtsDespiteIntent}
              onChange={(event) => setSkipDebtsDespiteIntent(event.target.checked)}
            />
            <span>{t('stylistPortal.reservationDialogs.complete.skipDebtsDespiteIntent')}</span>
          </label>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="notes">{t('stylistPortal.reservationDialogs.complete.notes')}</Label>
          <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={pending}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
