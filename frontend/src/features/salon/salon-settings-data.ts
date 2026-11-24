import type { SalonSettings, WorkingHours } from './salon-types'

export const emptySalonForm = {
  name: '', address: '', phone: '', email: '', description: '',
  pauseBetweenServices: 10, cancellationDeadlineHours: 24, maxCancellationsBeforePenalty: 3,
  penaltyDurationDays: 30, reservationLockMinutes: 15,
}
export type SalonForm = typeof emptySalonForm

export function salonFormFrom(s: SalonSettings): SalonForm {
  return {
    name: s.name ?? '', address: s.address ?? '', phone: s.phone ?? '', email: s.email ?? '', description: s.description ?? '',
    pauseBetweenServices: s.pauseBetweenServices ?? 10, cancellationDeadlineHours: s.cancellationDeadlineHours ?? 24,
    maxCancellationsBeforePenalty: s.maxCancellationsBeforePenalty ?? 3, penaltyDurationDays: s.penaltyDurationDays ?? 30,
    reservationLockMinutes: s.reservationLockMinutes ?? 15,
  }
}

export function completeWorkingHours(hours: WorkingHours[] | undefined): WorkingHours[] {
  return Array.from({ length: 7 }, (_, i) => hours?.find(w => w.dayOfWeek === i) ?? {
    dayOfWeek: i, openTime: '09:00', closeTime: '17:00', isWorkingDay: i >= 1 && i <= 5,
  })
}
