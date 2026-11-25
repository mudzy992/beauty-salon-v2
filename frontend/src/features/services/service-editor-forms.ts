import type { Category, Subcategory } from './service-catalog-types'
import type { Service } from './service-types'
import type { CategoryForm, ServiceForm } from './service-form-types'

/**
 * Početno stanje formulara i punjenje iz postojećeg zapisa.
 *
 * Čisti podaci (bez React-a) — zato se mogu testirati bez renderovanja i
 * drže `use-service-editor.ts` kratkim.
 */
export const emptyCategoryForm = (): CategoryForm => ({
  name: '',
  description: '',
  sortOrder: 0,
  isActive: true,
})

export const emptyServiceForm = (): ServiceForm => ({
  name: '',
  shortDescription: '',
  durationMinutes: 30,
  price: 0,
  gender: 'FEMALE',
  sortOrder: 0,
  isActive: true,
  heroImage: '',
  loyaltyEnabled: false,
  loyaltyMaxDiscountPercent: 0,
})

export const categoryFormFrom = (category: Category): CategoryForm => ({
  name: category.name,
  description: category.description ?? '',
  sortOrder: category.sortOrder,
  isActive: category.isActive,
})

export const subcategoryFormFrom = (subcategory: Subcategory): CategoryForm => ({
  name: subcategory.name,
  description: subcategory.description ?? '',
  sortOrder: subcategory.sortOrder,
  isActive: subcategory.isActive,
})

export const serviceFormFrom = (service: Service): ServiceForm => ({
  name: service.name,
  shortDescription: service.shortDescription ?? '',
  durationMinutes: service.durationMinutes,
  price: Number(service.price),
  gender: service.gender ?? 'FEMALE',
  sortOrder: service.sortOrder,
  isActive: service.isActive,
  heroImage: service.heroImage ?? '',
  loyaltyEnabled: service.loyaltyEnabled ?? false,
  loyaltyMaxDiscountPercent: service.loyaltyMaxDiscountPercent ?? 0,
})
