import api from '../../../api/client'

import type { ClientDebt, DailyLogEntry, Reservation } from '../types'

export const fetchStylistReservations = async (params?: {
  fromDate?: string
  toDate?: string
}): Promise<Reservation[]> => {
  const { data } = await api.get<Reservation[]>('/api/reservations', {
    params: { asStylist: true, ...params },
  })
  return Array.isArray(data) ? data : []
}

export const fetchReservationById = async (reservationId: string): Promise<Reservation> => {
  const { data } = await api.get<Reservation>(`/api/reservations/${reservationId}`)
  return data
}

export const lockReservationForStylist = async (params: {
  reservationId: string
  stylistProfileId: string
}): Promise<void> => {
  await api.post(`/api/reservations/${params.reservationId}/stylist/${params.stylistProfileId}/lock`)
}

export const acceptReservationForStylist = async (params: {
  reservationId: string
  stylistProfileId: string
}): Promise<void> => {
  await api.post(`/api/reservations/${params.reservationId}/stylist/${params.stylistProfileId}/accept`)
}

export const rejectReservationForStylist = async (params: {
  reservationId: string
  stylistProfileId: string
  rejectionReason?: string
}): Promise<void> => {
  await api.post(`/api/reservations/${params.reservationId}/stylist/${params.stylistProfileId}/reject`, {
    rejectionReason: params.rejectionReason?.trim().slice(0, 500) || undefined,
  })
}

export const stylistStartReservation = async (reservationId: string): Promise<void> => {
  await api.post(`/api/reservations/${reservationId}/stylist-start`)
}

export const stylistCancelReservation = async (params: {
  reservationId: string
  cancelReason: string
}): Promise<void> => {
  await api.post(`/api/reservations/${params.reservationId}/stylist-cancel`, {
    cancelReason: params.cancelReason,
  })
}

export const stylistNoShowReservation = async (params: {
  reservationId: string
  reason: string
  applyPenalty: boolean
}): Promise<void> => {
  await api.post(`/api/reservations/${params.reservationId}/stylist-no-show`, {
    reason: params.reason,
    applyPenalty: params.applyPenalty,
  })
}

export const requestReorder = async (params: {
  reservationId: string
  targetStartTime: string
  targetEndTime: string
}): Promise<void> => {
  await api.post(`/api/reservations/${params.reservationId}/reorder/request`, {
    targetStartTime: params.targetStartTime,
    targetEndTime: params.targetEndTime,
  })
}

export const fetchClientDebts = async (clientId: string): Promise<ClientDebt[]> => {
  const { data } = await api.get<ClientDebt[]>('/api/client-debts', { params: { clientId } })
  return Array.isArray(data) ? data : []
}

export const settleClientDebt = async (debtId: string): Promise<void> => {
  await api.patch(`/api/client-debts/${debtId}/settle`)
}

export const createDailyLogFromReservation = async (params: {
  reservationId: string
  paidAmount: number
  tipAmount: number
  notes?: string
  settledDebtIds?: string[]
  debtHandling?: 'CREATE_DEBT' | 'IGNORE_DEBT'
}): Promise<DailyLogEntry> => {
  const { data } = await api.post<DailyLogEntry>(`/api/daily-log/from-reservation/${params.reservationId}`, {
    paidAmount: params.paidAmount,
    tipAmount: params.tipAmount,
    notes: params.notes,
    debtHandling: params.debtHandling,
    settledDebtIds: params.settledDebtIds ?? [],
  })
  return data
}

