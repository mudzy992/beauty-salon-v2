import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import api from '../../../../services/api';
import { useReservationSocketRefresh } from '../../../../hooks/useReservationSocketRefresh';
import { normalizeReservationDetail } from '../../../../utils/apiPayload';
import type { Reservation } from '../../../../types';
import type { ReservationActionIdentity } from './use-reservation-action-identity';

type UseStylistReservationDetailParams = {
  reservationId: string;
  identity: ReservationActionIdentity;
};

type ReadIdentity = { userId: string | undefined; reservationId: string };

const sameIdentity = (left: ReadIdentity | null, right: ReadIdentity) =>
  left !== null && left.userId === right.userId && left.reservationId === right.reservationId;

export const useStylistReservationDetail = ({ reservationId, identity }: UseStylistReservationDetailParams) => {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [reservationIdentity, setReservationIdentity] = useState<ReadIdentity | null>(null);
  const [requestIdentity, setRequestIdentity] = useState<ReadIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshingIdentity, setRefreshingIdentity] = useState<ReadIdentity | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const requestGeneration = useRef(0);
  const reservationIdentityRef = useRef<ReadIdentity | null>(null);
  const { isCurrent, userId } = identity;

  const fetchReservation = useCallback(async () => {
    if (!isCurrent()) return;
    const generation = ++requestGeneration.current;
    const requested: ReadIdentity = { userId, reservationId };
    const isCurrentRequest = () =>
      generation === requestGeneration.current && isCurrent();

    setRequestIdentity(requested);
    if (!sameIdentity(reservationIdentityRef.current, requested)) setLoading(true);
    setLoadError(false);
    setNotFound(false);
    setRetrying(true);
    try {
      const { data } = await api.get<unknown>(`/api/reservations/${reservationId}`);
      const parsed = normalizeReservationDetail(data);
      if (!parsed || parsed.id !== reservationId) {
        if (isCurrentRequest()) {
          setLoadError(true);
          setRequestIdentity(requested);
        }
        return;
      }
      if (isCurrentRequest()) {
        setReservation(parsed);
        reservationIdentityRef.current = requested;
        setReservationIdentity(requested);
      }
    } catch (error: unknown) {
      if (isCurrentRequest()) {
        const status = typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: unknown } }).response?.status
          : undefined;
        if (status === 404) {
          setReservation(null);
          reservationIdentityRef.current = null;
          setReservationIdentity(null);
          setNotFound(true);
        } else {
          setLoadError(true);
        }
      }
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
        setRetrying(false);
      }
    }
  }, [isCurrent, reservationId, userId]);

  useEffect(() => {
    setRefreshingIdentity(null);
  }, [reservationId, userId]);

  useEffect(() => {
    void fetchReservation();
    return () => { requestGeneration.current += 1; };
  }, [fetchReservation]);

  useFocusEffect(
    useCallback(() => {
      void fetchReservation();
    }, [fetchReservation]),
  );

  useReservationSocketRefresh(fetchReservation);

  const onRefresh = useCallback(async () => {
    if (!isCurrent()) return;
    const requested: ReadIdentity = { userId, reservationId };
    setRefreshingIdentity(requested);
    await fetchReservation();
    if (isCurrent()) setRefreshingIdentity(null);
  }, [fetchReservation, isCurrent, reservationId, userId]);

  const currentIdentity: ReadIdentity = { userId, reservationId };
  const requestMatchesCurrent = sameIdentity(requestIdentity, currentIdentity);
  const reservationMatchesCurrent = sameIdentity(reservationIdentity, currentIdentity);
  const currentError = requestMatchesCurrent && loadError;
  const currentNotFound = requestMatchesCurrent && notFound;

  return {
    reservation: reservationMatchesCurrent ? reservation : null,
    loading: !requestMatchesCurrent || loading,
    refreshing: sameIdentity(refreshingIdentity, currentIdentity),
    loadError: currentError,
    notFound: currentNotFound,
    retrying: requestMatchesCurrent && retrying,
    fetchReservation,
    onRefresh,
  };
};
