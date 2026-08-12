import type { ClientDebt, Reservation } from '../types'

export const buildCompleteDialogHints = (reservation: Reservation): string => {
  const parts = [
    'Za naplatu = usluge + odabrana dugovanja. Napojnica = naplaćeno − za naplatu.',
    'Završetak knjiži u KIF; ako je mjesec zaključan, upis neće proći — kontaktirajte admina.',
  ]
  if (reservation.payDebtsIntent) {
    parts.push('Klijent je označio plaćanje dugovanja.')
  }
  const loyaltyAmount = Number(reservation.loyaltyDiscountAmount ?? 0)
  if (loyaltyAmount > 0) {
    parts.push(
      `Loyalty popust (${loyaltyAmount.toFixed(2)} KM) je uračunat u “Za naplatu” — ne umanjujte cijenu ponovo osim ako je naplata drugačija.`,
    )
  }
  return parts.join(' ')
}

export const validateCompleteDebtsIntent = (params: {
  payDebtsIntent?: boolean | null
  debts: ClientDebt[]
  selectedDebtIds: Record<string, boolean>
  skipDebtsDespiteIntent: boolean
}): string | null => {
  const hasOpenDebts = params.debts.length > 0
  const noneSelected = Object.values(params.selectedDebtIds).every((v) => !v)
  if (params.payDebtsIntent && hasOpenDebts && noneSelected && !params.skipDebtsDespiteIntent) {
    return 'Klijent je označio plaćanje duga. Odaberite dugove ili potvrdite da ih namjerno ne naplaćujete.'
  }
  return null
}
