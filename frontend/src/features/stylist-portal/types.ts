export type ReservationStatus =
  | 'PENDING'
  | 'STYLIST_REVIEW'
  | 'CONFIRMED'
  | 'ATTENDANCE_CONFIRMED'
  | 'IN_PROGRESS'
  | 'AWAITING_DAILY_LOG'
  | 'COMPLETED'
  | 'CANCELLED_BY_CLIENT'
  | 'CANCELLED_BY_STYLISTS'
  | 'NO_SHOW'

export type RescheduleStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED'

export type StylistResponseStatus = 'PENDING' | 'LOCKED' | 'ACCEPTED' | 'REJECTED'

export type ReservationStylistResponse = {
  id: string
  reservationId: string
  stylistProfileId: string
  status: StylistResponseStatus
  lockedAt?: string
  lockExpiresAt?: string
  respondedAt?: string
  rejectionReason?: string | null
  stylistProfile?: { id: string; user?: { username?: string } } | null
}

export type Reservation = {
  id: string
  clientId: string
  serviceId: string
  reservationDate: string
  startTime: string
  endTime: string
  status: ReservationStatus
  bookingOrigin?: 'CLIENT_SELF_SERVICE' | 'STAFF_ADMIN' | 'STAFF_STYLIST'
  acceptanceMode?: 'INBOX' | 'DIRECT_ASSIGN'
  attendancePolicy?: 'CLIENT_REQUIRED' | 'STAFF_WAIVED'
  clientNotes?: string | null
  confirmedStylistId?: string | null
  attendanceConfirmedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  cancelReason?: string | null
  rescheduleProposedStartTime?: string | null
  rescheduleProposedEndTime?: string | null
  rescheduleStatus?: RescheduleStatus | null
  loyaltyDiscountPercent?: number | null
  loyaltyDiscountAmount?: number | null
  loyaltyPointsUsed?: number | null
  payDebtsIntent?: boolean | null
  createdAt?: string
  service?: { id: string; name: string; durationMinutes?: number; price?: number | string } | null
  confirmedStylist?: { id: string; user?: { username?: string; firstName?: string | null; lastName?: string | null } } | null
  client?: {
    id: string
    firstName: string
    lastName: string
    cancellationCount?: Array<{ cancellationCount: number; penaltyUntil?: string | null }>
  } | null
  stylistResponses?: ReservationStylistResponse[] | null
}

export type ClientDebt = {
  id: string
  clientId: string
  stylistProfileId: string
  amount: number | string
  createdAt: string
  service?: { id: string; name: string } | null
  stylistProfile?: { id: string; user?: { firstName?: string | null; lastName?: string | null } | null } | null
}

export type DailyLogEntry = {
  id: string
  status: 'PENDING' | 'COMPLETED'
  date?: string
  actualPrice?: number
  tipAmount?: number
  reservationId?: string | null
}

