import { useCallback } from 'react';
import { SOCKET_EVENTS } from '../realtime/socket-events';
import {
  normalizeAvailabilityChangedPayload,
  type AvailabilityChangedPayload,
} from '../utils/apiPayload';
import { useSocketEvent } from './useSocketEvent';

export type { AvailabilityChangedPayload } from '../utils/apiPayload';

export function useAvailabilitySocketRefresh(
  serviceIds: string[],
  onChanged: (payload: AvailabilityChangedPayload) => void,
): void {
  const handler = useCallback(
    (data: unknown) => {
      if (serviceIds.length === 0) return;
      const payload = normalizeAvailabilityChangedPayload(data);
      if (!payload) return;
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
