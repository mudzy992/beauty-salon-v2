import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '../../../../store/authStore';

type IdentityState = {
  userId: string | undefined;
  reservationId: string;
  generation: number;
  mounted: boolean;
};

export type ReservationActionIdentity = {
  userId: string | undefined;
  reservationId: string;
  isCurrent: () => boolean;
  beginAction: () => () => boolean;
};

/** Binds reservation-detail reads and actions to the current account, route, and mount. */
export const useReservationActionIdentity = (reservationId: string): ReservationActionIdentity => {
  const userId = useAuthStore((state) => state.user?.id);
  const identityRef = useRef<IdentityState>({
    userId,
    reservationId,
    generation: 0,
    mounted: true,
  });

  if (
    identityRef.current.userId !== userId ||
    identityRef.current.reservationId !== reservationId
  ) {
    identityRef.current = {
      userId,
      reservationId,
      generation: identityRef.current.generation + 1,
      mounted: identityRef.current.mounted,
    };
  }

  useEffect(() => {
    identityRef.current.mounted = true;
    return () => {
      identityRef.current.mounted = false;
      identityRef.current.generation += 1;
    };
  }, []);

  const isCurrent = useCallback(() => {
    const current = identityRef.current;
    return (
      !!userId &&
      current.mounted &&
      current.userId === userId &&
      current.reservationId === reservationId &&
      useAuthStore.getState().user?.id === userId
    );
  }, [reservationId, userId]);

  const beginAction = useCallback(() => {
    if (!isCurrent()) return () => false;
    const generation = ++identityRef.current.generation;
    return () => isCurrent() && identityRef.current.generation === generation;
  }, [isCurrent]);

  return { userId, reservationId, isCurrent, beginAction };
};
