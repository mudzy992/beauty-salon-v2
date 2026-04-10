import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createDailyLogFromReservation,
  fetchClientDebts,
  fetchReservationById,
  requestReorder,
  settleClientDebt,
  stylistCancelReservation,
  stylistNoShowReservation,
  stylistStartReservation,
} from '../api/stylist-portal.api'

export const useStylistReservationDetail = (params: { reservationId: string }) => {
  const query = useQuery({
    queryKey: ['stylistReservations', 'detail', params.reservationId],
    queryFn: () => fetchReservationById(params.reservationId),
    enabled: !!params.reservationId,
  })

  return {
    reservation: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

export const useClientDebts = (params: { clientId: string | null }) => {
  const query = useQuery({
    queryKey: ['clientDebts', params.clientId],
    queryFn: async () => {
      if (!params.clientId) return []
      return fetchClientDebts(params.clientId)
    },
    enabled: !!params.clientId,
  })

  return {
    debts: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  }
}

export const useReservationActions = () => {
  const queryClient = useQueryClient()

  const start = useMutation({
    mutationFn: (reservationId: string) => stylistStartReservation(reservationId),
    onSuccess: async (_, reservationId) => {
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations'] })
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations', 'detail', reservationId] })
    },
  })

  const cancel = useMutation({
    mutationFn: (args: { reservationId: string; cancelReason: string }) => stylistCancelReservation(args),
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations'] })
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations', 'detail', args.reservationId] })
    },
  })

  const noShow = useMutation({
    mutationFn: (args: { reservationId: string; reason: string; applyPenalty: boolean }) =>
      stylistNoShowReservation(args),
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations'] })
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations', 'detail', args.reservationId] })
    },
  })

  const reorder = useMutation({
    mutationFn: (args: { reservationId: string; targetStartTime: string; targetEndTime: string }) =>
      requestReorder(args),
    onSuccess: async (_, args) => {
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations'] })
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations', 'detail', args.reservationId] })
    },
  })

  const completeAndCreateDailyLog = useMutation({
    mutationFn: (args: { reservationId: string; actualPrice: number; tipAmount: number; notes?: string }) =>
      createDailyLogFromReservation(args),
  })

  const settleDebt = useMutation({
    mutationFn: (debtId: string) => settleClientDebt(debtId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clientDebts'] })
    },
  })

  return {
    start,
    cancel,
    noShow,
    reorder,
    completeAndCreateDailyLog,
    settleDebt,
  }
}

export const useSelectedDebtSum = (params: {
  debts: Array<{ id: string; amount: number | string }>
  selectedDebtIds: Record<string, boolean>
}) => {
  return useMemo(() => {
    const selected = params.debts.filter((d) => params.selectedDebtIds[d.id])
    return selected.reduce((acc, d) => acc + (Number(d.amount) || 0), 0)
  }, [params.debts, params.selectedDebtIds])
}

