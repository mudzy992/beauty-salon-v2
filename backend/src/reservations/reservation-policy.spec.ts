import {
  RESERVATION_ACCEPTANCE_MODE,
  RESERVATION_ATTENDANCE_POLICY,
  RESERVATION_STATUS,
} from './constants';
import {
  canConfirmAttendance,
  canStartReservation,
  getAutoStartEligibleStatuses,
  isDirectAssignedReservation,
  shouldRunAttendanceCron,
} from './reservation-policy';

describe('reservation-policy', () => {
  it('prepoznaje direct assign rezervacije', () => {
    expect(
      isDirectAssignedReservation({
        acceptanceMode: RESERVATION_ACCEPTANCE_MODE.DIRECT_ASSIGN,
      }),
    ).toBe(true);
    expect(isDirectAssignedReservation({ acceptanceMode: 'INBOX' })).toBe(false);
  });

  it('dozvoljava attendance potvrdu samo za client-required confirmed rezervacije', () => {
    expect(
      canConfirmAttendance({
        status: RESERVATION_STATUS.CONFIRMED,
        attendancePolicy: RESERVATION_ATTENDANCE_POLICY.CLIENT_REQUIRED,
      }),
    ).toBe(true);
    expect(
      canConfirmAttendance({
        status: RESERVATION_STATUS.CONFIRMED,
        attendancePolicy: RESERVATION_ATTENDANCE_POLICY.STAFF_WAIVED,
      }),
    ).toBe(false);
  });

  it('dozvoljava start za attendance-confirmed i waived direct confirmed rezervacije', () => {
    expect(
      canStartReservation({
        status: RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
        attendancePolicy: RESERVATION_ATTENDANCE_POLICY.CLIENT_REQUIRED,
        confirmedStylistId: 'stylist-1',
      }),
    ).toBe(true);
    expect(
      canStartReservation({
        status: RESERVATION_STATUS.CONFIRMED,
        attendancePolicy: RESERVATION_ATTENDANCE_POLICY.STAFF_WAIVED,
        confirmedStylistId: 'stylist-1',
      }),
    ).toBe(true);
    expect(
      canStartReservation({
        status: RESERVATION_STATUS.CONFIRMED,
        attendancePolicy: RESERVATION_ATTENDANCE_POLICY.CLIENT_REQUIRED,
        confirmedStylistId: 'stylist-1',
      }),
    ).toBe(false);
  });

  it('skida waived rezervacije sa attendance cron-a', () => {
    expect(
      shouldRunAttendanceCron({
        status: RESERVATION_STATUS.CONFIRMED,
        attendancePolicy: RESERVATION_ATTENDANCE_POLICY.CLIENT_REQUIRED,
        confirmedStylistId: 'stylist-1',
      }),
    ).toBe(true);
    expect(
      shouldRunAttendanceCron({
        status: RESERVATION_STATUS.CONFIRMED,
        attendancePolicy: RESERVATION_ATTENDANCE_POLICY.STAFF_WAIVED,
        confirmedStylistId: 'stylist-1',
      }),
    ).toBe(false);
  });

  it('ograničava auto-start na policy-allowed statuse', () => {
    expect(
      getAutoStartEligibleStatuses(
        RESERVATION_ATTENDANCE_POLICY.CLIENT_REQUIRED,
      ),
    ).toEqual([RESERVATION_STATUS.ATTENDANCE_CONFIRMED]);
    expect(
      getAutoStartEligibleStatuses(RESERVATION_ATTENDANCE_POLICY.STAFF_WAIVED),
    ).toEqual([
      RESERVATION_STATUS.CONFIRMED,
      RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
    ]);
  });
});
