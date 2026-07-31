import api from '../../../api/client'
import type {
  IncomeBook,
  IncomeBookIntegrity,
  ManualEntryPayload,
} from '../finance.types'

const BASE = '/api/income-books'

export const fetchIncomeBooks = async (): Promise<IncomeBook[]> => {
  const { data } = await api.get<IncomeBook[]>(BASE)
  return Array.isArray(data) ? data : []
}

export const fetchIncomeBook = async (id: string): Promise<IncomeBook> => {
  const { data } = await api.get<IncomeBook>(`${BASE}/${id}`)
  return data
}

export const fetchIncomeBookForMonth = async (
  year: number,
  month: number,
): Promise<IncomeBook> => {
  const { data } = await api.get<IncomeBook>(`${BASE}/month/${year}/${month}`)
  return data
}

export const fetchIncomeBookIntegrity = async (
  id: string,
): Promise<IncomeBookIntegrity> => {
  const { data } = await api.get<IncomeBookIntegrity>(`${BASE}/${id}/integrity`)
  return data
}

export const resyncIncomeBook = async (id: string): Promise<void> => {
  await api.post(`${BASE}/${id}/resync`)
}

export const lockIncomeBook = async (id: string): Promise<void> => {
  await api.post(`${BASE}/${id}/lock`)
}

export const unlockIncomeBook = async (
  id: string,
  reason: string,
): Promise<void> => {
  await api.post(`${BASE}/${id}/unlock`, { reason })
}

export const createManualEntry = async (
  bookId: string,
  payload: ManualEntryPayload,
): Promise<void> => {
  await api.post(`${BASE}/${bookId}/manual-entries`, payload)
}

export const updateManualEntry = async (
  bookId: string,
  entryId: string,
  payload: ManualEntryPayload,
): Promise<void> => {
  await api.patch(`${BASE}/${bookId}/manual-entries/${entryId}`, payload)
}

export const deleteManualEntry = async (
  bookId: string,
  entryId: string,
): Promise<void> => {
  await api.delete(`${BASE}/${bookId}/manual-entries/${entryId}`)
}
