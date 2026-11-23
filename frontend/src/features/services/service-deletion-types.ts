export interface ServiceDeletionImpact {
  service: { id: string; name: string; imageRetained: boolean }
  target: { id: string; name: string } | null
  reservations: { primary: number; additionalServiceItems: number }
  dailyLogs: {
    primary: number
    completed: number
    additionalServiceItems: number
    debtPaymentEntries: number
  }
  income: {
    automaticEntries: number
    automaticRevenue: number
    automaticTips: number
    manualEntries: number
    manualRevenue: number
    manualTips: number
  }
  debts: {
    count: number
    openCount: number
    amount: number
    openAmount: number
  }
  images: { dailyLogImages: number; consentRecordsRetained: number }
  pendingOutboxEvents: number
  reviews: number
  stylistLinks: number
  mergeConflicts: {
    reservationItems: number
    dailyLogItems: number
    dailyLogReservations: number
    reviews: number
    processingOutboxEvents: number
  }
  duplicateStylistLinks: number
  impactToken: string
}

export type ServiceMutationAction = 'DELETE_LINKED_RECORDS' | 'MERGE'
