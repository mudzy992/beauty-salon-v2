import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useReservationSocketRefresh } from '../../reservations/use-reservation-socket-refresh'

/** Invalidate stylist portal + workbook queries on reservation realtime events. */
export function useStylistPortalSocketRefresh(): void {
  const queryClient = useQueryClient()
  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['stylistReservations'] })
    void queryClient.invalidateQueries({ queryKey: ['dailyLog'] })
    void queryClient.invalidateQueries({ queryKey: ['clientDebts'] })
  }, [queryClient])
  useReservationSocketRefresh(invalidate)
}
