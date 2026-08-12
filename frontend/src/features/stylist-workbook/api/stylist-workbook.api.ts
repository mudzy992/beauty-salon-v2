import api from '../../../api/client'
import type {
  ClientOption,
  DailyLogEntry,
  LoyaltyInfo,
  RescheduleMode,
  RescheduleProposal,
  ServiceOption,
} from '../types'

export type StylistProfileMe = { id: string; userId?: string }

export const fetchStylistProfileMe = async (): Promise<StylistProfileMe> => {
  const { data } = await api.get<StylistProfileMe>('/api/stylists/me')
  return data
}

export const fetchDailyLogEntries = async (params: {
  stylistProfileId: string
  fromDate: string
  toDate: string
}): Promise<DailyLogEntry[]> => {
  const { data } = await api.get<DailyLogEntry[]>('/api/daily-log', { params })
  return Array.isArray(data) ? data : []
}

export const fetchDailyLogEntry = async (entryId: string): Promise<DailyLogEntry> => {
  const { data } = await api.get<DailyLogEntry>(`/api/daily-log/${entryId}`)
  return data
}

export const fetchActiveServices = async (): Promise<ServiceOption[]> => {
  const { data } = await api.get<ServiceOption[]>('/api/services', { params: { activeOnly: true } })
  return Array.isArray(data) ? data : []
}

export const fetchClientsForDailyLog = async (): Promise<ClientOption[]> => {
  const { data } = await api.get<ClientOption[]>('/api/users/for-daily-log')
  return Array.isArray(data) ? data : []
}

export const fetchLoyaltyInfoForClient = async (params: {
  clientId: string
  serviceIds: string[]
}): Promise<LoyaltyInfo> => {
  const { data } = await api.get<LoyaltyInfo>(`/api/loyalty/stylist/client/${params.clientId}`, {
    params: { serviceIds: params.serviceIds.join(',') },
  })
  return data
}

export const createDailyLogEntry = async (body: {
  stylistProfileId: string
  serviceIds: string[]
  clientId?: string
  date: string
  paidAmount: number
  actualPrice: number
  tipAmount: number
  notes?: string
  isManual: true
  desiredLoyaltyPercent?: number
  debtHandling?: 'CREATE_DEBT' | 'IGNORE_DEBT'
}): Promise<{ id: string }> => {
  const { data } = await api.post<{ id: string }>('/api/daily-log', body)
  return data
}

export const updateDailyLogEntry = async (params: {
  entryId: string
  body: {
    actualPrice?: number
    tipAmount?: number
    notes?: string
    desiredLoyaltyPercent?: number
  }
}): Promise<DailyLogEntry> => {
  const { data } = await api.patch<DailyLogEntry>(`/api/daily-log/${params.entryId}`, params.body)
  return data
}

export const completeDailyLogEntry = async (entryId: string): Promise<DailyLogEntry> => {
  const { data } = await api.post<DailyLogEntry>(`/api/daily-log/${entryId}/complete`)
  return data
}

export const disposeDailyLogEntry = async (params: {
  entryId: string
  action: 'discard' | 'reorder' | 'cancel_as_client' | 'cancel_as_stylist' | 'no_show'
  reason: string
  targetStartTime?: string
  targetEndTime?: string
  applyPenalty?: boolean
}): Promise<{ ok: boolean }> => {
  const { data } = await api.post<{ ok: boolean }>(`/api/daily-log/${params.entryId}/dispose`, {
    action: params.action,
    reason: params.reason,
    targetStartTime: params.targetStartTime,
    targetEndTime: params.targetEndTime,
    applyPenalty: params.applyPenalty,
  })
  return data
}

export const uploadDailyLogImage = async (file: File): Promise<{ id: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('entity', 'daily-log')
  const { data } = await api.post<{ id: string }>('/api/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const attachDailyLogImage = async (params: {
  entryId: string
  body: { uploadId: string; isBefore?: boolean; isAfter?: boolean }
}): Promise<{ id: string }> => {
  const { data } = await api.post<{ id: string }>(`/api/daily-log/${params.entryId}/images`, params.body)
  return data
}

export const proposeReschedule = async (params: {
  reservationId: string
  includeBreaks: boolean
  mode: RescheduleMode
  manualShiftMinutes?: number
}): Promise<RescheduleProposal> => {
  const { data } = await api.post<RescheduleProposal>(
    `/api/reservations/${params.reservationId}/reschedule/propose`,
    {
      includeBreaks: params.includeBreaks,
      mode: params.mode,
      manualShiftMinutes: params.manualShiftMinutes,
    },
  )
  return data
}

export const commitReschedule = async (params: {
  reservationId: string
  includeBreaks: boolean
  mode: RescheduleMode
  manualShiftMinutes?: number
}): Promise<RescheduleProposal> => {
  const { data } = await api.post<RescheduleProposal>(
    `/api/reservations/${params.reservationId}/reschedule/commit`,
    {
      includeBreaks: params.includeBreaks,
      mode: params.mode,
      manualShiftMinutes: params.manualShiftMinutes,
    },
  )
  return data
}

