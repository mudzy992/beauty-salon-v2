import type { Service } from './service-types'

export interface Subcategory {
  id: string
  categoryId: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  services?: Service[]
}

export interface Category {
  id: string
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  subcategories?: Subcategory[]
}
