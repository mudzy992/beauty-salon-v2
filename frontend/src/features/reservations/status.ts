export const RESERVATION_STATUS_OPTIONS = [
  { value: '', label: 'Svi statusi' },
  { value: 'PENDING', label: 'Na čekanju' },
  { value: 'STYLIST_REVIEW', label: 'Pregled stiliste' },
  { value: 'CONFIRMED', label: 'Potvrđena' },
  { value: 'ATTENDANCE_CONFIRMED', label: 'Dolazak potvrđen' },
  { value: 'IN_PROGRESS', label: 'U toku' },
  { value: 'COMPLETED', label: 'Završena' },
  { value: 'CANCELLED_BY_CLIENT', label: 'Otkazao klijent' },
  { value: 'CANCELLED_BY_STYLISTS', label: 'Otkazali stilisti' },
  { value: 'NO_SHOW', label: 'Nije došao' },
] as const

export const getReservationStatusLabel = (status: string) =>
  RESERVATION_STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status

export const getReservationStatusColor = (status: string) => {
  if (status === 'COMPLETED') return 'emerald'
  if (status === 'CONFIRMED' || status === 'ATTENDANCE_CONFIRMED') return 'brand'
  if (status === 'IN_PROGRESS') return 'slate'
  if (status === 'PENDING' || status === 'STYLIST_REVIEW') return 'amber'
  if (status === 'CANCELLED_BY_CLIENT' || status === 'CANCELLED_BY_STYLISTS' || status === 'NO_SHOW') return 'rose'
  return 'slate'
}

