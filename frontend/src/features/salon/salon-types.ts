export interface SalonSettings {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  description: string | null
  logo: string | null
  pauseBetweenServices: number
  cancellationDeadlineHours: number
  maxCancellationsBeforePenalty: number
  penaltyDurationDays: number
  reservationLockMinutes: number
  workingHours?: WorkingHours[]
  holidays?: Holiday[]
}

export interface WorkingHours {
  id?: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  isWorkingDay: boolean
}

export interface Holiday {
  id: string
  date: string
  name: string
  message: string | null
  sendPush: boolean
  pushSentAt: string | null
}
