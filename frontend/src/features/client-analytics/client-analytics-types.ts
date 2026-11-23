export interface ManualEntry {
  id: string
  date: string
  actualPrice: string | number
  tipAmount: string | number
  isManual: boolean
  notes: string | null
  status: string
  service?: { id: string; name: string; price: number | string }
  stylistProfile?: { user?: { firstName: string | null; lastName: string | null; username: string } }
}

export interface ClientDebtRow {
  id: string
  amount: number | string
  createdAt: string
  status: 'OPEN' | 'SETTLED'
  service?: { id: string; name: string } | null
  reservation?: { id: string; publicReferenceCode: string; reservationDate: string; startTime: string; endTime: string } | null
  dailyLogEntry?: { id: string; date: string; reservationId: string | null; kind: 'SERVICE' | 'DEBT_PAYMENT' } | null
  manualEntry?: { id: string; date: string } | null
  stylistProfile?: { user?: { firstName: string | null; lastName: string | null; username: string } }
}

export interface ClientAnalyticsData {
  fromDate: string | null
  toDate: string | null
  user: {
    id: string
    username: string
    email: string | null
    firstName: string | null
    lastName: string | null
    phone: string | null
    isActive: boolean
    createdAt: string
    userRoles?: { role: { name: string } }[]
  }
  stats: {
    totalReservations: number
    completedReservations: number
    cancelledReservations: number
    noShowCount: number
    totalSpent: number
    manualEntryCount: number
    manualSpent: number
    avgServiceRating: number | null
    reviewCount: number
  }
  penalty: { cancellationCount: number; penaltyUntil: string | null; isPenalized: boolean }
  topServices: { name: string; count: number; totalSpent: number }[]
  reservations: {
    id: string
    reservationDate: string
    startTime: string
    endTime: string
    status: string
    clientNotes: string | null
    cancelReason: string | null
    cancelledAt: string | null
    service?: { id: string; name: string; price: number | string }
    confirmedStylist?: { user?: { firstName: string | null; lastName: string | null; username: string } }
  }[]
  reviews: {
    id: string
    serviceRating: number
    stylistRating: number | null
    comment: string | null
    isApproved: boolean
    createdAt: string
    service?: { name: string }
    stylist?: { user?: { firstName: string | null; lastName: string | null; username: string } }
  }[]
  manualEntries: ManualEntry[]
}

