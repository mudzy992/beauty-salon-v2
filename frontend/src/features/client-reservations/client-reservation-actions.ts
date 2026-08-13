export const CLIENT_CANCELABLE_STATUSES = [
  'PENDING',
  'STYLIST_REVIEW',
  'CONFIRMED',
  'ATTENDANCE_CONFIRMED',
] as const

export const canClientCancel = (status: string): boolean =>
  (CLIENT_CANCELABLE_STATUSES as readonly string[]).includes(status)

export const getAttendanceConfirmHours = (
  reservation: {
    reservationDate: string
    startTime: string
    attendanceClientDeadlineAt?: string | null
  },
  fallback = 12,
): number => {
  if (!reservation.attendanceClientDeadlineAt) return fallback
  const [year, month, day] = reservation.reservationDate.slice(0, 10).split('-').map(Number)
  const [hours, minutes] = reservation.startTime.slice(0, 5).split(':').map(Number)
  const start = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0)
  const deadline = new Date(reservation.attendanceClientDeadlineAt)
  const diffHours = Math.round((start.getTime() - deadline.getTime()) / 3_600_000)
  return diffHours > 0 ? diffHours : fallback
}

export const canClientConfirmAttendance = (
  status: string,
  attendanceConfirmedAt?: string | null,
  attendancePolicy?: string | null,
  attendanceClientDeadlineAt?: string | null,
): boolean => {
  if (status !== 'CONFIRMED') return false
  if (attendancePolicy === 'STAFF_WAIVED') return false
  if (attendanceConfirmedAt) return false
  if (
    attendanceClientDeadlineAt &&
    Date.now() >= new Date(attendanceClientDeadlineAt).getTime()
  ) {
    return false
  }
  return true
}

export const canClientDecideReschedule = (rescheduleStatus?: string | null): boolean =>
  rescheduleStatus === 'PENDING'
