import { useCallback, useEffect, useState } from 'react';
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

  const fetchReservation = useCallback(async () => {
    try {
      const { data } = await api.get<Reservation>(`/api/reservations/${reservationId}`);
      setReservation(data);
    } catch {
      setReservation(null);
    }
    setLoading(false);
  }, [reservationId]);

  useEffect(() => {
    void fetchReservation();
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
    fetchReservation,
    onRefresh,
  };
};
