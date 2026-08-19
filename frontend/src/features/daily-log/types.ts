export interface DailyLogEntry {
  id: string
  publicReferenceCode?: string | null
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
  service?: { id: string; name: string; price?: number | string }
  items?: Array<{
    id: string
    sortOrder: number
    serviceId: string
    unitPrice?: number | string
    service?: { id: string; name: string; price?: number | string } | null
  }>
  debtPaymentEntries?: Array<{
    id: string
    actualPrice: number | string
    tipAmount?: number | string
    debtId?: string | null
    notes?: string | null
    date?: string
    publicReferenceCode?: string | null
    service?: { id: string; name: string } | null
    debt?: {
      id: string
      amount: number | string
      createdAt: string
      service?: { id: string; name: string } | null
    } | null
  }>
  client?: {
    id: string
    firstName: string | null
    lastName: string | null
    user?: { username: string }
  }
  reservation?: {
    id: string
    status?: string
    loyaltyDiscountPercent: number
    loyaltyDiscountAmount: number | string
    payDebtsIntent?: boolean
    acceptanceMode?: string | null
    bookingOrigin?: string | null
    attendancePolicy?: string | null
    confirmedStylistId?: string | null
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

export type ClientDebtOption = {
  id: string
  amount: number | string
  createdAt: string
  service?: { id: string; name: string } | null
  stylistProfile?: {
    user?: { firstName: string | null; lastName: string | null; username?: string }
  } | null
  dailyLogEntry?: { id: string; date: string } | null
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
  unitPrices: Record<string, number>
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
  s?: StylistOption | DailyLogEntry['stylistProfile'] | ClientDebtOption['stylistProfile'],
): string => {
  if (!s?.user) return '-'
  const u = s.user as {
    firstName?: string | null
    lastName?: string | null
    username?: string
  }
  return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username || '-'
}
