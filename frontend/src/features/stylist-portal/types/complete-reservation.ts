export type CompleteReservationPayload = {
  paidAmount: number
  settledDebtIds: string[]
  debtHandling: 'CREATE_DEBT' | 'IGNORE_DEBT'
  tipAmount: number
  notes?: string
  shortfall: number
}
