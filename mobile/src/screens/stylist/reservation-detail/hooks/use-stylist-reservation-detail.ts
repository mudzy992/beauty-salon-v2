import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import api from '../../../../services/api';
import { useReservationSocketRefresh } from '../../../../hooks/useReservationSocketRefresh';
import type { Reservation } from '../../../../types';

type UseStylistReservationDetailParams = {
  reservationId: string;
};

export const useStylistReservationDetail = ({ reservationId }: UseStylistReservationDetailParams) => {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const requestGeneration = useRef(0);

  const fetchReservation = useCallback(async () => {
    const generation = ++requestGeneration.current;
    setLoadError(false);
    setNotFound(false);
    setRetrying(true);
    try {
      const { data } = await api.get<Reservation>(`/api/reservations/${reservationId}`);
      if (generation === requestGeneration.current) setReservation(data);
    } catch (error: unknown) {
      if (generation === requestGeneration.current) {
        const status = typeof error === 'object' && error !== null && 'response' in error
          ? (error as { response?: { status?: unknown } }).response?.status
          : undefined;
        if (status === 404) {
          setReservation(null);
          setNotFound(true);
        } else {
          setLoadError(true);
        }
      }
    } finally {
      if (generation === requestGeneration.current) {
        setLoading(false);
        setRetrying(false);
      }
    }
  }, [reservationId]);

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
    setRefreshing(true);
    await fetchReservation();
    setRefreshing(false);
  }, [fetchReservation]);

  return {
    reservation,
    loading,
    refreshing,
    loadError,
    notFound,
    retrying,
    fetchReservation,
    onRefresh,
  };
};
