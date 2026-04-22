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
  clientNotes: string | null
  cancelReason: string | null
  createdAt: string
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
}

export type SchedulerView = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay' | 'agenda'

