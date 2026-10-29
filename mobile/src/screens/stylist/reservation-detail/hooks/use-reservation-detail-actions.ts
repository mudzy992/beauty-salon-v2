import { useCallback, useState } from 'react';
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

type RescheduleMode = 'actual_overrun' | 'manual_minutes' | 'use_break_only';

type Navigation = NativeStackNavigationProp<
  StylistScheduleStackParamList,
  'StylistReservationDetail'
>;

type UseReservationDetailActionsParams = {
  reservation: Reservation | null;
  fetchReservation: () => Promise<void>;
  navigation: Navigation;
};

export const useReservationDetailActions = ({
  reservation,
  fetchReservation,
  navigation,
}: UseReservationDetailActionsParams) => {
  const { t } = useTranslation();
  const completeFlow = useReservationCompleteFlow({ reservation, fetchReservation, navigation });

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

  const navigateToReschedulePreview = useCallback(
    (mode: RescheduleMode) => {
      if (!reservation) return;
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
    [navigation, reservation, manualShiftMinutes],
  );

  const submitStart = useCallback(async () => {
    if (!reservation) return;
    setStartSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservation.id}/stylist-start`);
      await fetchReservation();
      navigation.goBack();
    } catch (err: unknown) {
      Alert.alert('Greška', getApiErrorMessage(err, 'Greška pri startovanju.'));
    } finally {
      setStartSubmitting(false);
    }
  }, [reservation, fetchReservation, navigation]);

  const openCancel = useCallback(() => {
    setCancelReason('');
    setCancelModalOpen(true);
  }, []);

  const openNoShow = useCallback(() => {
    setNoShowReason('');
    setNoShowApplyPenalty(true);
    setNoShowModalOpen(true);
  }, []);

  const submitCancel = useCallback(async () => {
    if (!reservation) return;
    const reason = cancelReason.trim();
    if (!reason) {
      Alert.alert(t('common.error'), t('stylist.reservationDetail.cancel.reasonRequired'));
      return;
    }
    setCancelSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservation.id}/stylist-cancel`, { cancelReason: reason });
      setCancelModalOpen(false);
      await fetchReservation();
      Alert.alert(
        t('stylist.reservationDetail.cancel.cancelledTitle'),
        t('stylist.reservationDetail.cancel.cancelledMessage'),
      );
      navigation.goBack();
    } catch (err: unknown) {
      Alert.alert(
        t('common.error'),
        getApiErrorMessage(err, t('stylist.reservationDetail.cancel.errorFallback')),
      );
    } finally {
      setCancelSubmitting(false);
    }
  }, [reservation, cancelReason, fetchReservation, navigation, t]);

  const submitNoShow = useCallback(async () => {
    if (!reservation) return;
    const reason = noShowReason.trim();
    if (!reason) {
      Alert.alert(t('common.error'), t('stylist.reservationDetail.noShow.reasonRequired'));
      return;
    }
    setNoShowSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservation.id}/stylist-no-show`, {
        reason,
        applyPenalty: noShowApplyPenalty,
      });
      setNoShowModalOpen(false);
      await fetchReservation();
      Alert.alert(
        t('stylist.reservationDetail.noShow.markedTitle'),
        t('stylist.reservationDetail.noShow.markedMessage'),
      );
      navigation.goBack();
    } catch (err: unknown) {
      Alert.alert(
        t('common.error'),
        getApiErrorMessage(err, t('stylist.reservationDetail.noShow.errorFallback')),
      );
    } finally {
      setNoShowSubmitting(false);
    }
  }, [reservation, noShowReason, noShowApplyPenalty, fetchReservation, navigation, t]);

  const submitReorderRequest = useCallback(async () => {
    if (!reservation) return;
    const start = normalizeHm(reorderStartTime);
    const end = normalizeHm(reorderEndTime);
    if (!start || !end || (parseHmToMinutes(end) as number) <= (parseHmToMinutes(start) as number)) {
      Alert.alert('Greška', 'Odaberite valjan početak i kraj (HH:mm).');
      return;
    }
    setReorderSubmitting(true);
    try {
      await api.post(`/api/reservations/${reservation.id}/reorder/request`, {
        targetStartTime: start,
        targetEndTime: end,
      });
      setReorderModalOpen(false);
      setReorderStartTime('');
      setReorderEndTime('');
      await fetchReservation();
      Alert.alert('Poslano', 'Klijentu je poslan prijedlog pomjeranja termina.');
    } catch (err: unknown) {
      Alert.alert('Greška', getApiErrorMessage(err, 'Greška pri slanju prijedloga.'));
    } finally {
      setReorderSubmitting(false);
    }
  }, [reservation, reorderStartTime, reorderEndTime, fetchReservation]);

  const openReorderModal = useCallback(() => {
    if (!reservation) return;
    const start = normalizeHm(reservation.startTime) || '09:00';
    const duration =
      durationMinutesFromRange(reservation.startTime, reservation.endTime) ||
      getReservationTotalDurationMinutes(reservation) ||
      30;
    setReorderStartTime(start);
    setReorderEndTime(endTimeFromStartAndDuration(start, duration));
    setReorderModalOpen(true);
  }, [reservation]);

  const handleReorderStartChange = useCallback(
    (raw: string) => {
      setReorderStartTime(raw);
      if (!reservation) return;
      const duration =
        durationMinutesFromRange(reservation.startTime, reservation.endTime) ||
        getReservationTotalDurationMinutes(reservation) ||
        30;
      const computed = endTimeFromStartAndDuration(normalizeHm(raw) || raw, duration);
      if (computed) setReorderEndTime(computed);
    },
    [reservation],
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
