import { useCallback } from 'react';
import { SOCKET_EVENTS } from '../realtime/socket-events';
import { useSocketEvent } from './useSocketEvent';

export type AvailabilityChangedPayload = {
  serviceId?: string;
  serviceIds?: string[];
  date?: string;
};

export function useAvailabilitySocketRefresh(
  serviceIds: string[],
  onChanged: (payload: AvailabilityChangedPayload) => void,
): void {
  const handler = useCallback(
    (data: unknown) => {
      if (serviceIds.length === 0) return;
      const payload = data as AvailabilityChangedPayload;
      const intersects = Array.isArray(payload.serviceIds)
        ? payload.serviceIds.some((id) => serviceIds.includes(id))
        : payload.serviceId
          ? serviceIds.includes(payload.serviceId)
          : false;
      if (intersects) onChanged(payload);
    },
    [serviceIds, onChanged],
  );
  useSocketEvent(SOCKET_EVENTS.AVAILABILITY_CHANGED, handler);
}
