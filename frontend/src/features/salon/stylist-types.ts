export interface StylistProfile {
  id: string
  userId: string
  bio: string | null
  specialization: string | null
  status?: 'PENDING' | 'ACTIVE' | string | null
  isActive: boolean
  hireDate: string | null
  user?: { username: string; email: string | null; firstName: string | null; lastName: string | null }
}

export interface WorkingHours {
  dayOfWeek: number
  startTime: string
  endTime: string
  isWorkingDay: boolean
}

export interface ServiceOption {
  id: string
  name: string
  subcategory?: { name: string; category?: { name: string } }
}
