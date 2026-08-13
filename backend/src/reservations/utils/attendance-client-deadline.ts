type AttendanceDeadlineRow = {
  status: string;
  attendancePolicy?: string | null;
  reservationDate: Date;
  startTime: string;
};

export const resolveAttendanceClientDeadlineAt = (
  row: AttendanceDeadlineRow,
  deadlineHours: number,
  combineDateAndTime: (date: Date, time: string) => Date,
): string | null => {
  if (row.status !== 'CONFIRMED') return null;
  if (row.attendancePolicy === 'STAFF_WAIVED') return null;
  const startAt = combineDateAndTime(row.reservationDate, row.startTime);
  return new Date(
    startAt.getTime() - deadlineHours * 60 * 60 * 1000,
  ).toISOString();
};
