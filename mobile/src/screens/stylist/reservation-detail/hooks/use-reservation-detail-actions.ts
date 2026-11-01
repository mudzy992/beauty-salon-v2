import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import api from '../../../../services/api';
import {
  durationMinutesFromRange,
  endTimeFromStartAndDuration,
  normalizeHm,
  parseHmToMinutes,
} from '../../../../utils/reservation-time';
import { getReservationTotalDurationMinutes } from '../../../../utils/reservationServices';
import type { Reservation } from '../../../../types';
import type {
  NativeStackNavigationProp,
  StylistScheduleStackParamList,
} from '../../../../navigation/types';
import { getApiErrorMessage } from '../utils/reservation-detail';
import { useReservationCompleteFlow } from './use-reservation-complete-flow';
import type { ReservationActionIdentity } from './use-reservation-action-identity';

type RescheduleMode = 'actual_overrun' | 'manual_minutes' | 'use_break_only';

type Navigation = NativeStackNavigationProp<
  StylistScheduleStackParamList,
  'StylistReservationDetail'
>;

type UseReservationDetailActionsParams = {
  reservation: Reservation | null;
  fetchReservation: () => Promise<void>;
  navigation: Navigation;
  identity: ReservationActionIdentity;
};

export const useReservationDetailActions = ({
  reservation,
  fetchReservation,
  navigation,
  identity,
}: UseReservationDetailActionsParams) => {
  const { t } = useTranslation();
  const { beginAction, isCurrent, reservationId, userId } = identity;
  const completeFlow = useReservationCompleteFlow({ reservation, fetchReservation, navigation, identity });

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [noShowModalOpen, setNoShowModalOpen] = useState(false);
  const [noShowReason, setNoShowReason] = useState('');
  const [noShowApplyPenalty, setNoShowApplyPenalty] = useState(true);
  const [noShowSubmitting, setNoShowSubmitting] = useState(false);
  const [startSubmitting, setStartSubmitting] = useState(false);
  const [overrunModalOpen, setOverrunModalOpen] = useState(false);
  const [manualShiftMinutes, setManualShiftMinutes] = useState('5');
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderStartTime, setReorderStartTime] = useState('');
  const [reorderEndTime, setReorderEndTime] = useState('');
  const [reorderSubmitting, setReorderSubmitting] = useState(false);

  useEffect(() => {
    setCancelModalOpen(false);
    setCancelReason('');
    setCancelSubmitting(false);
    setNoShowModalOpen(false);
    setNoShowReason('');
    setNoShowApplyPenalty(true);
    setNoShowSubmitting(false);
    setStartSubmitting(false);
    setOverrunModalOpen(false);
    setReorderModalOpen(false);
    setReorderStartTime('');
    setReorderEndTime('');
    setReorderSubmitting(false);
  }, [reservationId, userId]);

  const navigateToReschedulePreview = useCallback(
    (mode: RescheduleMode) => {
      if (!isCurrent() || !reservation || reservation.id !== reservationId) return;
      (
        navigation.getParent() as { navigate: (name: string, params: object) => void } | undefined
      )?.navigate('DailyLogTab', {
        screen: 'ReschedulePreview',
        params: {
          reservationId: reservation.id,
          includeBreaks: false,
          mode,
          manualShiftMinutes:
            mode === 'manual_minutes'
              ? Math.max(0, parseInt(manualShiftMinutes || '0', 10) || 0)
              : undefined,
        },
      });
    },
    [isCurrent, navigation, reservation, reservationId, manualShiftMinutes],
  );

  const submitStart = useCallback(async () => {
    if (!isCurrent() || !reservation || reservation.id !== reservationId) return;
    const isCurrentAction = beginAction();
    if (!isCurrentAction()) return;
    setStartSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservationId}/stylist-start`);
      if (!isCurrentAction()) return;
      await fetchReservation();
      if (!isCurrentAction()) return;
      navigation.goBack();
    } catch (err: unknown) {
      if (!isCurrentAction()) return;
      Alert.alert(
        t('common.error'),
        getApiErrorMessage(err, t('stylist.reservationDetail.actions.startErrorFallback')),
      );
    } finally {
      if (isCurrentAction()) setStartSubmitting(false);
    }
  }, [beginAction, fetchReservation, isCurrent, navigation, reservation, reservationId, t]);

  const openCancel = useCallback(() => {
    if (!isCurrent()) return;
    setCancelReason('');
    setCancelModalOpen(true);
  }, [isCurrent]);

  const openNoShow = useCallback(() => {
    if (!isCurrent()) return;
    setNoShowReason('');
    setNoShowApplyPenalty(true);
    setNoShowModalOpen(true);
  }, [isCurrent]);

  const submitCancel = useCallback(async () => {
    if (!isCurrent() || !reservation || reservation.id !== reservationId) return;
    const reason = cancelReason.trim();
    if (!reason) {
      Alert.alert(t('common.error'), t('stylist.reservationDetail.cancel.reasonRequired'));
      return;
    }
    const isCurrentAction = beginAction();
    if (!isCurrentAction()) return;
    setCancelSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservationId}/stylist-cancel`, { cancelReason: reason });
      if (!isCurrentAction()) return;
      setCancelModalOpen(false);
      await fetchReservation();
      if (!isCurrentAction()) return;
      Alert.alert(
        t('stylist.reservationDetail.cancel.cancelledTitle'),
        t('stylist.reservationDetail.cancel.cancelledMessage'),
      );
      navigation.goBack();
    } catch (err: unknown) {
      if (!isCurrentAction()) return;
      Alert.alert(
        t('common.error'),
        getApiErrorMessage(err, t('stylist.reservationDetail.cancel.errorFallback')),
      );
    } finally {
      if (isCurrentAction()) setCancelSubmitting(false);
    }
  }, [beginAction, cancelReason, fetchReservation, isCurrent, navigation, reservation, reservationId, t]);

  const submitNoShow = useCallback(async () => {
    if (!isCurrent() || !reservation || reservation.id !== reservationId) return;
    const reason = noShowReason.trim();
    if (!reason) {
      Alert.alert(t('common.error'), t('stylist.reservationDetail.noShow.reasonRequired'));
      return;
    }
    const isCurrentAction = beginAction();
    if (!isCurrentAction()) return;
    setNoShowSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservationId}/stylist-no-show`, {
        reason,
        applyPenalty: noShowApplyPenalty,
      });
      if (!isCurrentAction()) return;
      setNoShowModalOpen(false);
      await fetchReservation();
      if (!isCurrentAction()) return;
      Alert.alert(
        t('stylist.reservationDetail.noShow.markedTitle'),
        t('stylist.reservationDetail.noShow.markedMessage'),
      );
      navigation.goBack();
    } catch (err: unknown) {
      if (!isCurrentAction()) return;
      Alert.alert(
        t('common.error'),
        getApiErrorMessage(err, t('stylist.reservationDetail.noShow.errorFallback')),
      );
    } finally {
      if (isCurrentAction()) setNoShowSubmitting(false);
    }
  }, [beginAction, fetchReservation, isCurrent, navigation, noShowApplyPenalty, noShowReason, reservation, reservationId, t]);

  const submitReorderRequest = useCallback(async () => {
    if (!isCurrent() || !reservation || reservation.id !== reservationId) return;
    const start = normalizeHm(reorderStartTime);
    const end = normalizeHm(reorderEndTime);
    if (!start || !end || (parseHmToMinutes(end) as number) <= (parseHmToMinutes(start) as number)) {
      Alert.alert(t('common.error'), t('stylist.reservationDetail.reorder.invalidTime'));
      return;
    }
    const isCurrentAction = beginAction();
    if (!isCurrentAction()) return;
    setReorderSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservationId}/reorder/request`, {
        targetStartTime: start,
        targetEndTime: end,
      });
      if (!isCurrentAction()) return;
      setReorderModalOpen(false);
      setReorderStartTime('');
      setReorderEndTime('');
      await fetchReservation();
      if (!isCurrentAction()) return;
      Alert.alert(
        t('stylist.reservationDetail.reorder.sentTitle'),
        t('stylist.reservationDetail.reorder.sentMessage'),
      );
    } catch (err: unknown) {
      if (!isCurrentAction()) return;
      Alert.alert(
        t('common.error'),
        getApiErrorMessage(err, t('stylist.reservationDetail.reorder.errorFallback')),
      );
    } finally {
      if (isCurrentAction()) setReorderSubmitting(false);
    }
  }, [beginAction, fetchReservation, isCurrent, reorderEndTime, reorderStartTime, reservation, reservationId, t]);

  const openReorderModal = useCallback(() => {
    if (!isCurrent() || !reservation || reservation.id !== reservationId) return;
    const start = normalizeHm(reservation.startTime) || '09:00';
    const duration =
      durationMinutesFromRange(reservation.startTime, reservation.endTime) ||
      getReservationTotalDurationMinutes(reservation) ||
      30;
    setReorderStartTime(start);
    setReorderEndTime(endTimeFromStartAndDuration(start, duration));
    setReorderModalOpen(true);
  }, [isCurrent, reservation, reservationId]);

  const handleReorderStartChange = useCallback(
    (raw: string) => {
      if (!isCurrent() || !reservation || reservation.id !== reservationId) return;
      setReorderStartTime(raw);
      const duration =
        durationMinutesFromRange(reservation.startTime, reservation.endTime) ||
        getReservationTotalDurationMinutes(reservation) ||
        30;
      const computed = endTimeFromStartAndDuration(normalizeHm(raw) || raw, duration);
      if (computed) setReorderEndTime(computed);
    },
    [isCurrent, reservation, reservationId],
  );

  return {
    ...completeFlow,
    cancelModalOpen,
    cancelReason,
    cancelSubmitting,
    setCancelReason,
    setCancelModalOpen,
    submitCancel,
    openCancel,
    noShowModalOpen,
    noShowReason,
    noShowApplyPenalty,
    noShowSubmitting,
    setNoShowReason,
    setNoShowApplyPenalty,
    setNoShowModalOpen,
    submitNoShow,
    openNoShow,
    startSubmitting,
    submitStart,
    overrunModalOpen,
    manualShiftMinutes,
    setOverrunModalOpen,
    setManualShiftMinutes,
    navigateToReschedulePreview,
    reorderModalOpen,
    reorderStartTime,
    reorderEndTime,
    reorderSubmitting,
    setReorderModalOpen,
    submitReorderRequest,
    openReorderModal,
    handleReorderStartChange,
    setReorderEndTime,
  };
};
