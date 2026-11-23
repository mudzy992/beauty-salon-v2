export interface UserRole {
  role: { name: string }
}

export interface UserRow {
  id: string
  username: string
  email: string | null
  firstName: string | null
  lastName: string | null
  phone: string | null
  gender?: 'MALE' | 'FEMALE' | null
  avatar: string | null
  isActive: boolean
  isEmailVerified: boolean
  mustChangePassword?: boolean
  createdAt: string
  userRoles?: UserRole[]
  stylistProfile?: { id: string; status?: string | null } | null
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface StylistRemovalPreview {
  stylistProfileId: string
  revision: string
  financial: { clientDebtsCount: number; manualIncomeCount: number; bookedDailyLogsCount: number }
  counts: {
    dailyLogEntriesCount: number
    confirmedReservationsCount: number
    reservationResponsesCount: number
    reviewsCount: number
  }
}

export interface StylistOption {
  id: string
  isActive?: boolean
  user?: {
    isActive?: boolean
    firstName?: string | null
    lastName?: string | null
    username?: string | null
  }
  status?: 'PENDING' | 'ACTIVE' | string | null
}

export type ClientDebtRow = {
  id: string
  amount: number | string
  note?: string | null
  createdAt: string
  service?: { id: string; name: string } | null
  createdBy?: { id: string; username: string } | null
}
