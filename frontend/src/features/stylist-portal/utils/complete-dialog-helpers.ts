import type { Reservation } from '../types'

export type CompleteDialogHint = {
  key: string
  amount?: number
}

export const buildCompleteDialogHints = (
  reservation: Reservation,
): CompleteDialogHint[] => {
  const hints: CompleteDialogHint[] = [
    { key: 'stylistPortal.reservationDialogs.complete.chargeTipHint' },
    { key: 'stylistPortal.reservationDialogs.complete.kifHint' },
  ]
  if (reservation.payDebtsIntent) {
    hints.push({ key: 'stylistPortal.reservationDialogs.complete.clientDebtIntentHint' })
  }
  const loyaltyAmount = Number(reservation.loyaltyDiscountAmount ?? 0)
  if (loyaltyAmount > 0) {
    hints.push({
      key: 'stylistPortal.reservationDialogs.complete.loyaltyDiscountHint',
      amount: loyaltyAmount,
    })
  }
  return hints
}

export const validateCompleteDebtsIntent = (params: {
  payDebtsIntent?: boolean | null
  debtsCount: number
  selectedDebtIds: Record<string, boolean>
  skipDebtsDespiteIntent: boolean
}): string | null => {
  const noneSelected = Object.values(params.selectedDebtIds).every((value) => !value)
  if (
    params.payDebtsIntent &&
    params.debtsCount > 0 &&
    noneSelected &&
    !params.skipDebtsDespiteIntent
  ) {
    return 'stylistPortal.reservationDialogs.complete.debtIntentRequired'
  }
  return null
}
