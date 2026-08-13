import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import api from '../../../../services/api';
import { getApiErrorMessage } from '../utils/reservation-detail';

type UseStaffConfirmAttendanceParams = {
  reservationId: string | undefined;
  fetchReservation: () => Promise<void>;
};

export const useStaffConfirmAttendance = ({
  reservationId,
  fetchReservation,
}: UseStaffConfirmAttendanceParams) => {
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    if (!reservationId) return;
    setSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservationId}/staff-confirm-attendance`);
      await fetchReservation();
    } catch (err) {
      Alert.alert('Greška', getApiErrorMessage(err, 'Greška pri potvrdi dolaska'));
    } finally {
      setSubmitting(false);
    }
  }, [reservationId, fetchReservation]);

  return { submitting, submit };
};
