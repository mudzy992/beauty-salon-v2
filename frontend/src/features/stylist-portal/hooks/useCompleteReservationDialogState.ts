import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ClientDebt, Reservation } from '../types'
import type { CompleteReservationPayload } from '../types/complete-reservation'
import {
  validateCompleteDebtsIntent,
} from '../utils/complete-dialog-helpers'
import {
  computeReservationMinimumCharge,
  parseReservationMoney,
} from '../utils/reservation-detail'

export type { CompleteReservationPayload } from '../types/complete-reservation'

/** Owns the completion dialog's existing draft, calculations and validation. */
export const useCompleteReservationDialogState = ({
  open,
  reservation,
  debts,
  onValidationError,
  onConfirm,
}: {
  open: boolean
  reservation: Reservation
  debts: ClientDebt[]
  onValidationError: (message: string) => void
  onConfirm: (payload: CompleteReservationPayload) => void | Promise<void>
}) => {
  const { t } = useTranslation()
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

  return {
    actualPrice,
    setActualPrice,
    notes,
    setNotes,
    createDebt,
    setCreateDebt,
    selectedDebtIds,
    setSelectedDebtIds,
    skipDebtsDespiteIntent,
    setSkipDebtsDespiteIntent,
    minimumCharge,
    selectedDebtSum,
    paidAmount,
    chargeAmount,
    shortfall,
    tipAmount,
    handleConfirm,
  }
}
