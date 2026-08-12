export const CLIENT_CANCELABLE_STATUSES = [
  'PENDING',
  'STYLIST_REVIEW',
  'CONFIRMED',
  'ATTENDANCE_CONFIRMED',
] as const

export const canClientCancel = (status: string): boolean =>
  (CLIENT_CANCELABLE_STATUSES as readonly string[]).includes(status)

export const canClientConfirmAttendance = (
  status: string,
  attendanceConfirmedAt?: string | null,
  attendancePolicy?: string | null,
): boolean =>
  status === 'CONFIRMED' &&
  attendancePolicy !== 'STAFF_WAIVED' &&
  !attendanceConfirmedAt

export const canClientDecideReschedule = (rescheduleStatus?: string | null): boolean =>
  rescheduleStatus === 'PENDING'
