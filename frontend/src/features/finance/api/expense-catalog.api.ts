import api from '../../../api/client'
import type {
  ExpenseCategory,
  ExpenseTemplate,
  TemplateFieldPayload,
} from '../finance.types'

const CATEGORIES = '/api/expense-categories'
const TEMPLATES = '/api/expense-templates'

export const fetchExpenseCategories = async (): Promise<ExpenseCategory[]> => {
  const { data } = await api.get<ExpenseCategory[]>(CATEGORIES)
  return Array.isArray(data) ? data : []
}

/** Backend već vraća `fields` uz svaki predložak – nema potrebe za dodatnim pozivima. */
export const fetchExpenseTemplates = async (): Promise<ExpenseTemplate[]> => {
  const { data } = await api.get<ExpenseTemplate[]>(TEMPLATES)
  return Array.isArray(data) ? data : []
}

export const saveExpenseCategory = async (params: {
  id?: string
  payload: {
    name: string
    description?: string | null
    templateId: string
    isActive: boolean
    isFixed: boolean
  }
}): Promise<void> => {
  if (params.id) {
    await api.patch(`${CATEGORIES}/${params.id}`, params.payload)
    return
  }
  await api.post(CATEGORIES, params.payload)
}

export const saveExpenseTemplate = async (params: {
  id?: string
  payload: {
    name: string
    description?: string | null
    requiresAttachmentPerItem: boolean
  }
}): Promise<void> => {
  if (params.id) {
    await api.patch(`${TEMPLATES}/${params.id}`, params.payload)
    return
  }
  await api.post(TEMPLATES, params.payload)
}

export const addTemplateField = async (
  templateId: string,
  payload: TemplateFieldPayload,
): Promise<void> => {
  await api.post(`${TEMPLATES}/${templateId}/fields`, payload)
}

export const removeTemplateField = async (fieldId: string): Promise<void> => {
  await api.delete(`${TEMPLATES}/fields/${fieldId}`)
}
