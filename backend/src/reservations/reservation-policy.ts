import {
  RESERVATION_ACCEPTANCE_MODE,
  RESERVATION_ATTENDANCE_POLICY,
  RESERVATION_STATUS,
  type ReservationAcceptanceMode,
  type ReservationAttendancePolicy,
  type ReservationStatus,
} from './constants';

type ReservationPolicyShape = {
  status: string;
  confirmedStylistId?: string | null;
  acceptanceMode?: string | null;
  attendancePolicy?: string | null;
};

const DEFAULT_ACCEPTANCE_MODE: ReservationAcceptanceMode =
  RESERVATION_ACCEPTANCE_MODE.INBOX;
const DEFAULT_ATTENDANCE_POLICY: ReservationAttendancePolicy =
  RESERVATION_ATTENDANCE_POLICY.CLIENT_REQUIRED;

export const getReservationAcceptanceMode = (
  reservation: Pick<ReservationPolicyShape, 'acceptanceMode'>,
): ReservationAcceptanceMode =>
  (reservation.acceptanceMode as ReservationAcceptanceMode | null) ??
  DEFAULT_ACCEPTANCE_MODE;

export const getReservationAttendancePolicy = (
  reservation: Pick<ReservationPolicyShape, 'attendancePolicy'>,
): ReservationAttendancePolicy =>
  (reservation.attendancePolicy as ReservationAttendancePolicy | null) ??
  DEFAULT_ATTENDANCE_POLICY;

export const isDirectAssignedReservation = (
  reservation: Pick<ReservationPolicyShape, 'acceptanceMode'>,
): boolean =>
  getReservationAcceptanceMode(reservation) ===
  RESERVATION_ACCEPTANCE_MODE.DIRECT_ASSIGN;

export const canConfirmAttendance = (
  reservation: Pick<ReservationPolicyShape, 'status' | 'attendancePolicy'>,
): boolean =>
  reservation.status === RESERVATION_STATUS.CONFIRMED &&
  getReservationAttendancePolicy(reservation) ===
    RESERVATION_ATTENDANCE_POLICY.CLIENT_REQUIRED;

export const canStartReservation = (
  reservation: Pick<
    ReservationPolicyShape,
    'status' | 'attendancePolicy' | 'confirmedStylistId'
  >,
): boolean => {
  if (!reservation.confirmedStylistId) return false;
  if (reservation.status === RESERVATION_STATUS.ATTENDANCE_CONFIRMED) {
    return true;
  }
  return (
    reservation.status === RESERVATION_STATUS.CONFIRMED &&
    getReservationAttendancePolicy(reservation) ===
      RESERVATION_ATTENDANCE_POLICY.STAFF_WAIVED
  );
};

export const shouldRunAttendanceCron = (
  reservation: Pick<
    ReservationPolicyShape,
    'status' | 'attendancePolicy' | 'confirmedStylistId'
  >,
): boolean =>
  reservation.status === RESERVATION_STATUS.CONFIRMED &&
  getReservationAttendancePolicy(reservation) ===
    RESERVATION_ATTENDANCE_POLICY.CLIENT_REQUIRED;

export const getAutoStartEligibleStatuses = (
  attendancePolicy: string | null | undefined,
): ReservationStatus[] =>
  attendancePolicy === RESERVATION_ATTENDANCE_POLICY.STAFF_WAIVED
    ? [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.ATTENDANCE_CONFIRMED]
    : [RESERVATION_STATUS.ATTENDANCE_CONFIRMED];

export const isDirectStaffWaived = (
  reservation: Pick<
    ReservationPolicyShape,
    'acceptanceMode' | 'attendancePolicy'
  >,
): boolean =>
  isDirectAssignedReservation(reservation) &&
  getReservationAttendancePolicy(reservation) ===
    RESERVATION_ATTENDANCE_POLICY.STAFF_WAIVED;

export const shouldAutoSeedDailyLog = (
  reservation: Pick<
    ReservationPolicyShape,
    'status' | 'acceptanceMode' | 'attendancePolicy' | 'confirmedStylistId'
  >,
): boolean => {
  if (!reservation.confirmedStylistId) return false;
  if (!isDirectStaffWaived(reservation)) return false;
  return (
    reservation.status === RESERVATION_STATUS.CONFIRMED ||
    reservation.status === RESERVATION_STATUS.IN_PROGRESS
  );
};
