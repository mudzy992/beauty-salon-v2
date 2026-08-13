export interface ReservationClient {
  id: string
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  email?: string | null
  phone?: string | null
}

export interface ReservationService {
  id: string
  name: string
  durationMinutes: number
  price?: number | string
}

export interface ReservationServiceItem {
  id: string
  sortOrder: number
  serviceId: string
  service?: ReservationService
}

export interface StylistProfile {
  id: string
  isActive?: boolean
  status?: 'PENDING' | 'ACTIVE' | string | null
  user?: {
    username?: string | null
    firstName?: string | null
    lastName?: string | null
  }
}

export interface Reservation {
  id: string
  reservationDate: string
  startTime: string
  endTime: string
  status: string
  bookingOrigin?: 'CLIENT_SELF_SERVICE' | 'STAFF_ADMIN' | 'STAFF_STYLIST'
  acceptanceMode?: 'INBOX' | 'DIRECT_ASSIGN'
  attendancePolicy?: 'CLIENT_REQUIRED' | 'STAFF_WAIVED'
  clientNotes: string | null
  cancelReason: string | null
  createdAt: string
  attendanceConfirmedAt?: string | null
  attendanceClientDeadlineAt?: string | null
  rescheduleStatus?: string | null
  rescheduleProposedStartTime?: string | null
  rescheduleProposedEndTime?: string | null
  publicReferenceCode?: string | null
  client?: ReservationClient
  service?: ReservationService
  items?: ReservationServiceItem[]
  confirmedStylist?: StylistProfile | null
  stylistResponses?: Array<{
    id: string
    status: string
    rejectionReason: string | null
    stylistProfile?: StylistProfile | null
  }>
  paymentSummary?: ReservationPaymentSummary | null
}

export interface ReservationPaymentSummary {
  publicReferenceCode: string
  actualPrice: number
  tipAmount: number
  serviceAmount: number
  completedAt: string
  loyaltyDiscountAmount: number
  items: Array<{ name: string; unitPrice: number }>
}

export type SchedulerView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'agenda'

