import api from '../../../api/client'
import type { ClientDebtRow, ClientOption, ServiceOption, StylistOption } from '../finance.types'

export const fetchStylists = async (): Promise<StylistOption[]> => {
  const { data } = await api.get<StylistOption[] | { items?: StylistOption[] }>(
    '/api/stylists',
    { params: { limit: 200 } },
  )
  if (Array.isArray(data)) return data
  return Array.isArray(data?.items) ? data.items : []
}

export const fetchServicesForStylist = async (
  stylistProfileId: string,
): Promise<ServiceOption[]> => {
  const { data } = await api.get<ServiceOption[]>(
    `/api/stylists/${stylistProfileId}/services`,
  )
  return Array.isArray(data) ? data : []
}

export const searchClients = async (query: string): Promise<ClientOption[]> => {
  const { data } = await api.get<ClientOption[] | { items?: ClientOption[] }>(
    '/api/users',
    { params: { search: query, role: 'CLIENT', limit: 20 } },
  )
  if (Array.isArray(data)) return data
  return Array.isArray(data?.items) ? data.items : []
}

export const fetchClientDebts = async (
  clientId: string,
): Promise<ClientDebtRow[]> => {
  const { data } = await api.get<ClientDebtRow[]>('/api/client-debts', {
    params: { clientId },
  })
  return Array.isArray(data) ? data : []
}

/** Otpis duga – backend traži obavezan razlog jer se prihod ne knjiži. */
export const writeOffClientDebt = async (
  debtId: string,
  note: string,
): Promise<void> => {
  await api.patch(`/api/client-debts/${debtId}/write-off`, { note })
}

export const repayClientDebt = async (
  debtId: string,
  payload: { date?: string; note?: string },
): Promise<void> => {
  await api.post(`/api/client-debts/${debtId}/repay`, payload)
}
