export const RESERVATION_STATUS_OPTIONS = [
  { value: '', label: 'Svi statusi' },
  { value: 'PENDING', label: 'Na čekanju' },
  { value: 'STYLIST_REVIEW', label: 'Pregled stiliste' },
  { value: 'CONFIRMED', label: 'Potvrđena' },
  { value: 'ATTENDANCE_CONFIRMED', label: 'Dolazak potvrđen' },
  { value: 'IN_PROGRESS', label: 'U toku' },
  { value: 'AWAITING_DAILY_LOG', label: 'Na čekanju (dnevnik)' },
  { value: 'COMPLETED', label: 'Završena' },
  { value: 'CANCELLED_BY_CLIENT', label: 'Otkazao klijent' },
  { value: 'CANCELLED_BY_STYLISTS', label: 'Otkazali stilisti' },
  { value: 'NO_SHOW', label: 'Nije došao' },
] as const

export const getReservationStatusLabel = (
  status: string,
  cancelReason?: string | null,
) => {
  if (
    status === 'CANCELLED_BY_CLIENT' &&
    (cancelReason ?? '').trim() === 'Nije potvrđen dolazak u roku'
  ) {
    return 'Otkazano (nepotvrđen dolazak)'
  }
  return RESERVATION_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status
}

export const getReservationStatusColor = (status: string) => {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'CONFIRMED' || status === 'ATTENDANCE_CONFIRMED') return 'brand'
  if (status === 'IN_PROGRESS') return 'slate'
  if (status === 'PENDING' || status === 'STYLIST_REVIEW' || status === 'AWAITING_DAILY_LOG') return 'amber'
  if (status === 'CANCELLED_BY_CLIENT' || status === 'CANCELLED_BY_STYLISTS' || status === 'NO_SHOW') return 'rose'
  return 'slate'
}

/** Admin cancel — aligned with FSM (IN_PROGRESS → CANCELLED_BY_STYLISTS). */
export const canAdminCancelReservation = (status: string) =>
  ['PENDING', 'STYLIST_REVIEW', 'CONFIRMED', 'ATTENDANCE_CONFIRMED', 'IN_PROGRESS'].includes(
    status,
  )

export const canAdminConfirmAttendance = (r: {
  status: string
  attendancePolicy?: string | null
  reservationDate: string
  startTime: string
}): boolean => {
  if (r.status !== 'CONFIRMED' || r.attendancePolicy === 'STAFF_WAIVED') return false
  const [year, month, day] = r.reservationDate.slice(0, 10).split('-').map(Number)
  const [hours, minutes] = r.startTime.slice(0, 5).split(':').map(Number)
  const start = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0, 0, 0)
  return Date.now() < start.getTime()
}

