import type { Reservation } from '../../../../types';

export const getPlannedReservationDateTime = (reservationDate: string, time: string): Date => {
  const [y, m, d] = reservationDate.slice(0, 10).split('-').map(Number);
  const [h, min] = time.slice(0, 5).split(':').map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1, h ?? 0, min ?? 0, 0, 0);
};

export const canStaffConfirmAttendanceUi = (
  reservation: Pick<Reservation, 'status' | 'attendancePolicy' | 'reservationDate' | 'startTime'>,
  now = Date.now(),
): boolean => {
  if (reservation.status !== 'CONFIRMED') return false;
  if (reservation.attendancePolicy === 'STAFF_WAIVED') return false;
  return (
    now <
    getPlannedReservationDateTime(reservation.reservationDate, reservation.startTime).getTime()
  );
};

export const isStaffWaivedAttendance = (
  reservation: Pick<Reservation, 'attendancePolicy' | 'acceptanceMode'>,
): boolean =>
  reservation.attendancePolicy === 'STAFF_WAIVED' ||
  reservation.acceptanceMode === 'DIRECT_ASSIGN';

/** Mirrors backend `canStartReservation` for stylist UI. */
export const canStartReservationUi = (
  reservation: Reservation,
  isConfirmedStylist: boolean,
): boolean => {
  if (!isConfirmedStylist || !reservation.confirmedStylistId) return false;
  if (reservation.status === 'ATTENDANCE_CONFIRMED') return true;
  return (
    reservation.status === 'CONFIRMED' && isStaffWaivedAttendance(reservation)
  );
};

export const getReservationStatusLabel = (
  reservation: Pick<Reservation, 'status' | 'cancelReason'>,
  t: (key: string) => string,
): string => {
  if (
    reservation.status === 'CANCELLED_BY_CLIENT' &&
    (reservation.cancelReason ?? '').trim() === 'Nije potvrđen dolazak u roku'
  ) {
    return 'Otkazano (nepotvrđen dolazak)';
  }
  return t(`myReservations.status.${reservation.status}`);
};

export const getApiErrorMessage = (err: unknown, fallback: string): string => {
  const msg =
    err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
      : fallback;
  return Array.isArray(msg) ? (msg[0] ?? fallback) : String(msg ?? fallback);
};

export const computeCompleteMinCharge = (reservation: Reservation): number => {
  const basePrice =
    reservation.service && 'price' in reservation.service
      ? Number((reservation.service as { price?: number }).price)
      : 0;
  return Math.max(0, basePrice - Number(reservation.loyaltyDiscountAmount ?? 0));
};
