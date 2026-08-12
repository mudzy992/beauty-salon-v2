import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

import api from '../../../../services/api';
import { formatTime } from '../../../../utils/date';
import type { Reservation } from '../../../../types';
import { getPlannedReservationDateTime, canStartReservationUi } from '../utils/reservation-detail';

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
  const [startBlockedReason, setStartBlockedReason] = useState<string | null>(null);
  const [timeTick, setTimeTick] = useState(0);
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

  const hasAnyAction = canStart || canComplete || canCancelByStylist || canMarkNoShow;

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
    async function resolveStartBlockReason() {
      if (!reservation || !profileId || !canStartReservationUi(reservation, true)) {
        if (!cancelled) setStartBlockedReason(null);
        return;
      }
      if (reservation.confirmedStylistId !== profileId) {
        if (!cancelled) setStartBlockedReason(null);
        return;
      }
      const plannedStart = getPlannedReservationDateTime(
        reservation.reservationDate,
        reservation.startTime,
      );
      if (Date.now() < plannedStart.getTime()) {
        if (!cancelled) {
          setStartBlockedReason(
            `Termin još nije počeo. Start je dozvoljen od ${formatTime(reservation.startTime)}.`,
          );
        }
        return;
      }
      try {
        const day = reservation.reservationDate.slice(0, 10);
        const { data } = await api.get<Reservation[]>('/api/reservations', {
          params: { asStylist: true, fromDate: day, toDate: day },
        });
        const list = Array.isArray(data) ? data : [];
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
        if (!cancelled) {
          setStartBlockedReason(
            earlierPending
              ? `Postoji raniji termin (${formatTime(earlierPending.startTime)}–${formatTime(earlierPending.endTime)}) koji prvo treba obraditi.`
              : null,
          );
        }
      } catch {
        if (!cancelled) setStartBlockedReason(null);
      }
    }
    void resolveStartBlockReason();
    return () => {
      cancelled = true;
    };
  }, [reservation, profileId, timeTick]);

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
    canStart,
    hasAnyAction,
    isConfirmedStylist,
    isStartOverdue,
    startBlockedReason,
  };
};
