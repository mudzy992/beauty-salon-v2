import api from '../../../api/client'
import type {
  ExpenseCategory,
  ExpenseTemplate,
  TemplateFieldPayload,
  ExpenseLineRole,
} from '../finance.types'

const CATEGORIES = '/api/expense-categories'
const TEMPLATES = '/api/expense-templates'

export const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const { data } = await api.get<ExpenseCategory[]>(CATEGORIES)
  return Array.isArray(data) ? data : []
}

export const fetchExpenseTemplates = async (): Promise<ExpenseTemplate[]> => {
  const { data } = await api.get<ExpenseTemplate[]>(TEMPLATES)
  return Array.isArray(data) ? data : []
}

export type CategoryBundlePayload = {
  name: string
  description?: string | null
  isActive: boolean
  isFixed: boolean
  requiresAttachmentPerItem: boolean
  fields?: TemplateFieldPayload[]
}

export const createCategoryBundle = async (
  payload: CategoryBundlePayload,
): Promise<ExpenseCategory> => {
  const { data: template } = await api.post<ExpenseTemplate>(TEMPLATES, {
    name: payload.name,
    description: payload.description,
    requiresAttachmentPerItem: payload.requiresAttachmentPerItem,
    fields: payload.fields,
  })
  const { data: category } = await api.post<ExpenseCategory>(CATEGORIES, {
    name: payload.name,
    description: payload.description,
    templateId: template.id,
    isActive: payload.isActive,
    isFixed: payload.isFixed,
  })
  return category
}

export const updateCategoryBundle = async (params: {
  categoryId: string
  templateId: string
  payload: Omit<CategoryBundlePayload, 'fields'>
}): Promise<void> => {
  await api.patch(`${TEMPLATES}/${params.templateId}`, {
    name: params.payload.name,
    description: params.payload.description,
    requiresAttachmentPerItem: params.payload.requiresAttachmentPerItem,
  })
  await api.patch(`${CATEGORIES}/${params.categoryId}`, {
    name: params.payload.name,
    description: params.payload.description,
    isActive: params.payload.isActive,
    isFixed: params.payload.isFixed,
    templateId: params.templateId,
  })
}

export const addTemplateField = async (
  templateId: string,
  payload: TemplateFieldPayload,
): Promise<void> => {
  await api.post(`${TEMPLATES}/${templateId}/fields`, payload)
}

export const updateTemplateField = async (
  fieldId: string,
  payload: Partial<TemplateFieldPayload> & { lineRole?: ExpenseLineRole },
): Promise<void> => {
  await api.patch(`${TEMPLATES}/fields/${fieldId}`, payload)
}

export const removeTemplateField = async (fieldId: string): Promise<void> => {
  await api.delete(`${TEMPLATES}/fields/${fieldId}`)
}

export const bootstrapLegacyColumns = async (): Promise<{ bootstrapped: string[] }> => {
  const { data } = await api.post<{ bootstrapped: string[] }>(
    `${TEMPLATES}/bootstrap-legacy-columns`,
  )
  return data
}
