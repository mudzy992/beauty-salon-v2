import { useCallback } from 'react'

import { useSocketEvent } from '../../context/SocketContext'

/** Admin list/calendar: refetch on reservation realtime events. */
export function useReservationSocketRefresh(onRefresh: () => void): void {
  const handler = useCallback(() => {
    onRefresh()
  }, [onRefresh])

  useSocketEvent('reservation:created', handler)
  useSocketEvent('reservation:updated', handler)
  useSocketEvent('reservation:cancelled', handler)
  useSocketEvent('reservation:confirmed', handler)
  useSocketEvent('reservation:stylist_response', handler)
}
