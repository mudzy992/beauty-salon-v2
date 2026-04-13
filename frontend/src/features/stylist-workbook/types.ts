export type DailyLogEntryStatus = 'PENDING' | 'COMPLETED'

export type Upload = {
  id: string
  originalName: string
  mimeType: string
  pathOriginal: string
  pathThumb?: string | null
  pathSmall?: string | null
  pathMedium?: string | null
}

export type DailyLogImage = {
  id: string
  dailyLogEntryId: string
  uploadId: string
  isBefore: boolean
  isAfter: boolean
  description?: string | null
  sortOrder: number
  upload?: Upload
}

export type DailyLogEntry = {
  id: string
  stylistProfileId: string
  reservationId?: string | null
  serviceId: string
  clientId?: string | null
  date: string
  actualPrice: number
  tipAmount: number
  loyaltyDiscountPercent?: number | null
  loyaltyDiscountAmount?: number | null
  loyaltyPointsUsed?: number | null
  notes?: string | null
  status: DailyLogEntryStatus
  completedAt?: string | null
  isManual: boolean
  createdAt?: string
  service?: { id: string; name: string } | null
  client?: { id: string; firstName: string | null; lastName: string | null; user?: { username: string } } | null
  stylistProfile?: { id: string; user?: { id: string; firstName: string | null; lastName: string | null; username?: string } } | null
  reservation?: {
    id: string
    status: string
    cancelReason: string | null
    reservationDate: string
    startTime: string
    endTime: string
    publicReferenceCode: string | null
  } | null
  images?: DailyLogImage[]
}

export type ServiceOption = { id: string; name: string; price: number }

export type ClientOption = {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
}

export type LoyaltyInfo = {
  enabled: boolean
  hasAccount: boolean
  redeemEnabled?: boolean
  points?: number
  tier?: string | null
  tierMaxDiscountPercent?: number
  globalMaxDiscountPercent?: number
  minPointsToRedeem?: number
  redeemRate?: number
  service?: {
    id: string
    price: number
    maxDiscountPercent: number
    maxDiscountAmount: number
    maxUsablePoints: number
  } | null
}

export type RescheduleMode = 'actual_overrun' | 'manual_minutes' | 'use_break_only'

export type RescheduleProposalItem = {
  id: string
  clientId: string
  serviceName: string
  clientName: string
  oldStartTime: string
  oldEndTime: string
  newStartTime: string
  newEndTime: string
  shiftMinutes: number
  reducedBreakMinutes?: number
}

export type RescheduleProposal = {
  mode?: RescheduleMode
  overrunMinutes?: number
  delayMinutes: number
  shiftMinutes: number
  includeBreaks?: boolean
  items: RescheduleProposalItem[]
}

