import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acceptReservationForStylist,
  fetchStylistReservations,
  lockReservationForStylist,
  rejectReservationForStylist,
} from '../api/stylist-portal.api'
import type { Reservation } from '../types'

export const useStylistInboxReservations = (params: { stylistProfileId: string | null }) => {
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: ['stylistReservations', 'inbox'],
    queryFn: () => fetchStylistReservations(),
  })

  const pending = useMemo(() => {
    const all = listQuery.data ?? []
    return all.filter((r) => r.status === 'PENDING' || r.status === 'STYLIST_REVIEW')
  }, [listQuery.data])

  const lockMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      if (!params.stylistProfileId) return
      await lockReservationForStylist({ reservationId, stylistProfileId: params.stylistProfileId })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations'] })
    },
  })

  const acceptMutation = useMutation({
    mutationFn: async (reservation: Reservation) => {
      if (!params.stylistProfileId) return
      await acceptReservationForStylist({ reservationId: reservation.id, stylistProfileId: params.stylistProfileId })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (args: { reservationId: string; rejectionReason?: string }) => {
      if (!params.stylistProfileId) return
      await rejectReservationForStylist({
        reservationId: args.reservationId,
        stylistProfileId: params.stylistProfileId,
        rejectionReason: args.rejectionReason,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stylistReservations'] })
    },
  })

  return {
    reservations: pending,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
    refetch: listQuery.refetch,
    lock: lockMutation,
    accept: acceptMutation,
    reject: rejectMutation,
  }
}

export const useStylistScheduleReservations = (params: {
  stylistProfileId: string | null
  fromDate: string
  toDate: string
}) => {
  const listQuery = useQuery({
    queryKey: ['stylistReservations', 'schedule', params.fromDate, params.toDate],
    queryFn: () => fetchStylistReservations({ fromDate: params.fromDate, toDate: params.toDate }),
    enabled: !!params.fromDate && !!params.toDate,
  })

  const reservations = useMemo(() => {
    const profileId = params.stylistProfileId
    const all = listQuery.data ?? []
    const filtered = all
      .filter((r) => r.status !== 'CANCELLED_BY_CLIENT' && r.status !== 'CANCELLED_BY_STYLISTS')
      .filter((r) => (profileId ? r.confirmedStylistId === profileId || r.status === 'IN_PROGRESS' : r.status === 'IN_PROGRESS'))
    return filtered
  }, [listQuery.data, params.stylistProfileId])

  return {
    reservations,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
    refetch: listQuery.refetch,
  }
}

