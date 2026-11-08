import {
  resolveReservationStatus,
  type StatusDescriptor,
} from '../shell/admin/ui/status-badge'

/**
 * Razlog koji backend upisuje kada klijent ne potvrdi dolazak u roku.
 *
 * Literal je dijeljen sa `getReservationStatusLabel` iz `./status.ts`
 * (netaknut parity ugovor). Ovdje se samo čita — `status.ts` se ne mijenja.
 */
export const UNCONFIRMED_ATTENDANCE_REASON = 'Nije potvrđen dolazak u roku'

/**
 * Efektivni status za prikaz.
 *
 * `CANCELLED_BY_CLIENT` sa ovim razlogom se korisniku prikazuje kao
 * `CANCELLED_UNCONFIRMED_ATTENDANCE` — isti specijalni slučaj koji već
 * pokriva `getReservationStatusLabel`, samo izražen kao ključ statusa.
 */
export const effectiveReservationStatus = (
  status: string,
  cancelReason?: string | null,
): string =>
  status === 'CANCELLED_BY_CLIENT' &&
  (cancelReason ?? '').trim() === UNCONFIRMED_ATTENDANCE_REASON
    ? 'CANCELLED_UNCONFIRMED_ATTENDANCE'
    : status

/**
 * Deskriptor (ton + ikona) za `StatusBadge`.
 *
 * WCAG 1.4.1 — status se ne prenosi samo bojom: značka ima ikonu i tekst.
 * Nepoznat status se razrješava na neutralni ton umjesto pada, jer API može
 * vratiti korak FSM-a koji još nije u mapi.
 */
export const reservationStatusDescriptor = (
  status: string,
  cancelReason?: string | null,
): StatusDescriptor => resolveReservationStatus(effectiveReservationStatus(status, cancelReason))
