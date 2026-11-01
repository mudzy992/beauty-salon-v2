import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import api from '../../../../services/api';
import { getApiErrorMessage } from '../utils/reservation-detail';
import type { ReservationActionIdentity } from './use-reservation-action-identity';

type UseStaffConfirmAttendanceParams = {
  reservationId: string | undefined;
  fetchReservation: () => Promise<void>;
  identity: ReservationActionIdentity;
};

export const useStaffConfirmAttendance = ({
  reservationId,
  fetchReservation,
  identity,
}: UseStaffConfirmAttendanceParams) => {
  const { t } = useTranslation();
  const { beginAction, isCurrent, reservationId: currentReservationId, userId } = identity;
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubmitting(false);
  }, [currentReservationId, userId]);

  const submit = useCallback(async () => {
    if (!reservationId || reservationId !== currentReservationId || !isCurrent()) return;
    const isCurrentAction = beginAction();
    if (!isCurrentAction()) return;
    setSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservationId}/staff-confirm-attendance`);
      if (!isCurrentAction()) return;
      await fetchReservation();
    } catch (err) {
      if (!isCurrentAction()) return;
      Alert.alert(
        t('common.error'),
        getApiErrorMessage(err, t('stylist.reservationDetail.actions.confirmAttendanceErrorFallback')),
      );
    } finally {
      if (isCurrentAction()) setSubmitting(false);
    }
  }, [beginAction, currentReservationId, fetchReservation, isCurrent, reservationId, t]);

  return { submitting, submit };
};
