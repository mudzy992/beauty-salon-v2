import api from '../../../api/client'
import type {
  Expense,
  ExpenseBook,
  ExpensePayload,
  ExpenseBookDetail,
} from '../finance.types'

const BOOKS = '/api/expense-books'
const EXPENSES = '/api/expenses'

export const fetchExpenseBooks = async (): Promise<ExpenseBook[]> => {
  const { data } = await api.get<ExpenseBook[]>(BOOKS)
  return Array.isArray(data) ? data : []
}

export const fetchExpenseBook = async (
  id: string,
): Promise<ExpenseBookDetail> => {
  const { data } = await api.get<ExpenseBookDetail>(`${BOOKS}/${id}`)
  return data
}

export const fetchExpenseBookForMonth = async (
  year: number,
  month: number,
): Promise<ExpenseBookDetail> => {
  const { data } = await api.get<ExpenseBookDetail>(
    `${BOOKS}/month/${year}/${month}`,
  )
  return data
}

export const lockExpenseBook = async (id: string): Promise<void> => {
  await api.post(`${BOOKS}/${id}/lock`)
}

export const unlockExpenseBook = async (
  id: string,
  reason: string,
): Promise<void> => {
  await api.post(`${BOOKS}/${id}/unlock`, { reason })
}

export const fetchExpense = async (id: string): Promise<Expense> => {
  const { data } = await api.get<Expense>(`${EXPENSES}/${id}`)
  return data
}

export const createExpense = async (payload: ExpensePayload): Promise<Expense> => {
  const { data } = await api.post<Expense>(EXPENSES, payload)
  return data
}

export const updateExpense = async (
  id: string,
  payload: Partial<ExpensePayload>,
): Promise<Expense> => {
  const { data } = await api.patch<Expense>(`${EXPENSES}/${id}`, payload)
  return data
}

export const deleteExpense = async (id: string): Promise<void> => {
  await api.delete(`${EXPENSES}/${id}`)
}

export const addExpenseAttachment = async (
  expenseId: string,
  uploadId: string,
  description?: string,
): Promise<void> => {
  await api.post(`${EXPENSES}/${expenseId}/attachments`, {
    uploadId,
    description,
  })
}

export const removeExpenseAttachment = async (
  expenseId: string,
  attachmentId: string,
): Promise<void> => {
  await api.delete(`${EXPENSES}/${expenseId}/attachments/${attachmentId}`)
}

export const uploadExpenseFile = async (file: File): Promise<string> => {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<{ id: string }>('/api/uploads', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.id
}
