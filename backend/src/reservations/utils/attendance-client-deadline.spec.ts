import { resolveAttendanceClientDeadlineAt } from './attendance-client-deadline';

describe('resolveAttendanceClientDeadlineAt', () => {
  const combine = (date: Date, time: string) => {
    const [hh, mm] = time.split(':').map(Number);
    return new Date(Date.UTC(2026, 2, 10, hh, mm));
  };

  it('vraća ISO rok za CONFIRMED + CLIENT_REQUIRED', () => {
    const actual = resolveAttendanceClientDeadlineAt(
      {
        status: 'CONFIRMED',
        attendancePolicy: 'CLIENT_REQUIRED',
        reservationDate: new Date('2026-03-10T00:00:00.000Z'),
        startTime: '10:00',
      },
      12,
      combine,
    );
    expect(actual).toBe(new Date(Date.UTC(2026, 2, 9, 22, 0)).toISOString());
  });

  it('vraća null za STAFF_WAIVED i ne-CONFIRMED', () => {
    expect(
      resolveAttendanceClientDeadlineAt(
        {
          status: 'CONFIRMED',
          attendancePolicy: 'STAFF_WAIVED',
          reservationDate: new Date('2026-03-10T00:00:00.000Z'),
          startTime: '10:00',
        },
        12,
        combine,
      ),
    ).toBeNull();
    expect(
      resolveAttendanceClientDeadlineAt(
        {
          status: 'ATTENDANCE_CONFIRMED',
          attendancePolicy: 'CLIENT_REQUIRED',
          reservationDate: new Date('2026-03-10T00:00:00.000Z'),
          startTime: '10:00',
        },
        12,
        combine,
      ),
    ).toBeNull();
  });
});
