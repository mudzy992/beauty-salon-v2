import { useEffect, useMemo, useRef, useState } from 'react'

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
      onValidationError('Unesite ispravan iznos.')
      return
    }
    if (selectedDebtSum > 0 && paidAmount < selectedDebtSum) {
      onValidationError('Nedovoljno za naplatu označenih dugova.')
      return
    }
    const intentError = validateCompleteDebtsIntent({
      payDebtsIntent: reservation.payDebtsIntent,
      debts,
      selectedDebtIds,
      skipDebtsDespiteIntent,
    })
    if (intentError) {
      onValidationError(intentError)
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
          <DialogTitle>Završi termin</DialogTitle>
          <DialogDescription>{buildCompleteDialogHints(reservation)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="price">Naplaćeno (KM)</Label>
          <Input
            id="price"
            value={actualPrice}
            onChange={(event) => setActualPrice(event.target.value)}
            inputMode="decimal"
          />
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Za naplatu: {chargeAmount.toFixed(2)} KM
          </p>
          {tipAmount > 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Napojnica: {tipAmount.toFixed(2)} KM
            </p>
          ) : null}
          {shortfall > 0 ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={createDebt}
                onChange={(event) => setCreateDebt(event.target.checked)}
              />
              Zavedi dug ({shortfall.toFixed(2)} KM)
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
            <span>Namjerno ne naplaćujem dugove iako je klijent označio plaćanje duga.</span>
          </label>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="notes">Napomena (opciono)</Label>
          <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Odustani
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={pending}>
            Potvrdi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
