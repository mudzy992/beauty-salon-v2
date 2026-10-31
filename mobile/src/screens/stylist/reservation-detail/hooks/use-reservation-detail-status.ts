import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useTranslation } from 'react-i18next';

import api from '../../../../services/api';
import { formatTime } from '../../../../utils/date';
import { normalizeReservations } from '../../../../utils/apiPayload';
import type { Reservation } from '../../../../types';
import { getPlannedReservationDateTime, canStartReservationUi, canStaffConfirmAttendanceUi } from '../utils/reservation-detail';

type RescheduleMode = 'actual_overrun' | 'manual_minutes' | 'use_break_only';

type UseReservationDetailStatusParams = {
  reservation: Reservation | null;
  profileId: string | undefined;
  onOverrunReschedule: (mode: RescheduleMode) => void;
};

export const useReservationDetailStatus = ({
  reservation,
  profileId,
  onOverrunReschedule,
}: UseReservationDetailStatusParams) => {
  const { t } = useTranslation();
  const [startBlockedReason, setStartBlockedReason] = useState<string | null>(null);
  const [startOrderCheckError, setStartOrderCheckError] = useState(false);
  const [startOrderCheckLoading, setStartOrderCheckLoading] = useState(false);
  const [timeTick, setTimeTick] = useState(0);
  const retryStartOrderCheck = useCallback(() => setTimeTick((value) => value + 1), []);
  const overrunPopupShownForRef = useRef<string | null>(null);
  const isFocused = useIsFocused();

  const isConfirmedStylist = useMemo(() => {
    if (!reservation || !profileId) return false;
    return reservation.confirmedStylistId === profileId;
  }, [reservation, profileId]);

  const canCancelByStylist = useMemo(() => {
    if (!reservation) return false;
    return (
      (reservation.status === 'CONFIRMED' || reservation.status === 'IN_PROGRESS') &&
      isConfirmedStylist
    );
  }, [reservation, isConfirmedStylist]);

  const canMarkNoShow = useMemo(() => {
    if (!reservation) return false;
    return (
      (reservation.status === 'CONFIRMED' || reservation.status === 'ATTENDANCE_CONFIRMED') &&
      isConfirmedStylist
    );
  }, [reservation, isConfirmedStylist]);

  const canStart = useMemo(() => {
    if (!reservation) return false;
    return canStartReservationUi(reservation, isConfirmedStylist);
  }, [reservation, isConfirmedStylist]);

  const canComplete = useMemo(() => {
    if (!reservation) return false;
    return reservation.status === 'IN_PROGRESS' && isConfirmedStylist;
  }, [reservation, isConfirmedStylist]);

  const canStaffConfirm = useMemo(() => {
    if (!reservation) return false;
    return isConfirmedStylist && canStaffConfirmAttendanceUi(reservation);
  }, [reservation, isConfirmedStylist, timeTick]);

  const hasAnyAction =
    canStart || canComplete || canCancelByStylist || canMarkNoShow || canStaffConfirm;

  const isStartOverdue = useMemo(() => {
    if (!reservation || !canStart) return false;
    return (
      Date.now() >
      getPlannedReservationDateTime(reservation.reservationDate, reservation.endTime).getTime()
    );
  }, [reservation, canStart, timeTick]);

  useEffect(() => {
    const id = setInterval(() => setTimeTick((v) => v + 1), 30000);
    return () => {
      clearInterval(id);
      overrunPopupShownForRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (reservation?.status !== 'IN_PROGRESS') overrunPopupShownForRef.current = null;
  }, [reservation?.status]);

  useEffect(() => {
    let cancelled = false;
    const setCheckState = (reason: string | null, hasError: boolean, isLoading = false) => {
      if (cancelled) return;
      setStartBlockedReason(reason);
      setStartOrderCheckError(hasError);
      setStartOrderCheckLoading(isLoading);
    };

    async function resolveStartBlockReason() {
      if (!reservation || !profileId || !canStartReservationUi(reservation, true)) {
        setCheckState(null, false);
        return;
      }
      if (reservation.confirmedStylistId !== profileId) {
        setCheckState(null, false);
        return;
      }
      const plannedStart = getPlannedReservationDateTime(
        reservation.reservationDate,
        reservation.startTime,
      );
      if (Date.now() < plannedStart.getTime()) {
        setCheckState(
          `Termin još nije počeo. Start je dozvoljen od ${formatTime(reservation.startTime)}.`,
          false,
        );
        return;
      }

      setCheckState(t('stylist.reservationDetail.actions.startOrderCheckPending'), false, true);
      try {
        const day = reservation.reservationDate.slice(0, 10);
        const { data } = await api.get<unknown>('/api/reservations', {
          params: { asStylist: true, fromDate: day, toDate: day },
        });
        const list = normalizeReservations(data);
        if (!Array.isArray(data) || !list || list.length !== data.length) {
          setCheckState(t('stylist.reservationDetail.actions.startOrderCheckError'), true);
          return;
        }
        const earlierPending = list
          .filter((r) => r.id !== reservation.id)
          .filter((r) => r.confirmedStylistId === profileId)
          .filter((r) => r.startTime < reservation.startTime)
          .find(
            (r) =>
              r.status === 'ATTENDANCE_CONFIRMED' ||
              (r.status === 'CONFIRMED' &&
                (r.attendancePolicy === 'STAFF_WAIVED' ||
                  r.acceptanceMode === 'DIRECT_ASSIGN')),
          );
        setCheckState(
          earlierPending
            ? `Postoji raniji termin (${formatTime(earlierPending.startTime)}–${formatTime(earlierPending.endTime)}) koji prvo treba obraditi.`
            : null,
          false,
        );
      } catch {
        setCheckState(t('stylist.reservationDetail.actions.startOrderCheckError'), true);
      }
    }
    void resolveStartBlockReason();
    return () => {
      cancelled = true;
    };
  }, [reservation, profileId, timeTick, t]);

  useEffect(() => {
    if (!isFocused || !reservation) return;
    if (reservation.status !== 'IN_PROGRESS') return;
    if (!isConfirmedStylist) return;
    const plannedEnd = getPlannedReservationDateTime(
      reservation.reservationDate,
      reservation.endTime,
    );
    const overrunMinutes = Math.floor((Date.now() - plannedEnd.getTime()) / 60000);
    if (overrunMinutes < 5) return;
    const popupKey = `${reservation.id}:5`;
    if (overrunPopupShownForRef.current === popupKey) return;
    overrunPopupShownForRef.current = popupKey;
    Alert.alert(
      'Termin je probijen',
      `Termin je probijen ${overrunMinutes} min. Želite li odmah otvoriti rekalkulaciju i poslati obavijesti klijentima?`,
      [
        { text: 'Kasnije', style: 'cancel' },
        { text: 'Otvori rekalkulaciju', onPress: () => onOverrunReschedule('actual_overrun') },
      ],
    );
  }, [isFocused, reservation, isConfirmedStylist, onOverrunReschedule, timeTick]);

  return {
    canCancelByStylist,
    canComplete,
    canMarkNoShow,
    canStaffConfirm,
    canStart,
    hasAnyAction,
    isConfirmedStylist,
    isStartOverdue,
    startBlockedReason,
    startOrderCheckError,
    startOrderCheckLoading,
    retryStartOrderCheck,
  };
};
