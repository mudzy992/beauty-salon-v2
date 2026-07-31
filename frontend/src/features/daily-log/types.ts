export interface DailyLogEntry {
  id: string
  date: string
  actualPrice: number | string
  tipAmount: number | string
  loyaltyDiscountPercent?: number
  loyaltyDiscountAmount?: number | string
  loyaltyPointsUsed?: number
  isManual: boolean
  notes: string | null
  status: string
  completedAt: string | null
  deletedAt?: string | null
  deleteReason?: string | null
  deletedBy?: { id: string; firstName: string | null; lastName: string | null } | null
  stylistProfile?: {
    id: string
    user?: { username: string; firstName: string | null; lastName: string | null }
  }
  service?: { id: string; name: string }
  items?: Array<{
    id: string
    sortOrder: number
    serviceId: string
    service?: { id: string; name: string } | null
  }>
  client?: {
    id: string
    firstName: string | null
    lastName: string | null
    user?: { username: string }
  }
  reservation?: {
    id: string
    loyaltyDiscountPercent: number
    loyaltyDiscountAmount: number | string
  } | null
}

export interface StylistOption {
  id: string
  user?: { username: string; firstName: string | null; lastName: string | null }
}

export interface ServiceOption {
  id: string
  name: string
  price: number | string
  gender?: 'MALE' | 'FEMALE'
}

export interface ClientOption {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  gender?: 'MALE' | 'FEMALE'
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

export type DailyLogFormState = {
  stylistProfileId: string
  serviceIds: string[]
  clientId: string
  date: string
  actualPrice: number
  tipAmount: number
  notes: string
  isManual: boolean
  desiredLoyaltyPercent: number
  status: 'PENDING' | 'COMPLETED'
}

export const getStylistName = (
  s?: StylistOption | DailyLogEntry['stylistProfile'],
): string => {
  if (!s?.user) return '-'
  return `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() || s.user.username
}
