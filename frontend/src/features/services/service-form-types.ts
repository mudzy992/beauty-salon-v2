export type ModalMode = 'category' | 'subcategory' | 'service'
export type CategoryForm = { name: string; description: string; sortOrder: number; isActive: boolean }
export type ServiceForm = { name: string; shortDescription: string; durationMinutes: number; price: number; gender: 'MALE' | 'FEMALE'; sortOrder: number; isActive: boolean; heroImage: string; loyaltyEnabled: boolean; loyaltyMaxDiscountPercent: number }
