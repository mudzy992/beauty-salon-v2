export interface Service {
  id: string
  subcategoryId: string
  name: string
  shortDescription: string | null
  heroImage: string | null
  durationMinutes: number
  price: number | string
  isActive: boolean
  sortOrder: number
  gender: 'MALE' | 'FEMALE'
  loyaltyEnabled?: boolean
  loyaltyMaxDiscountPercent?: number
}
