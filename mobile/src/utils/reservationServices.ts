import type { Reservation, Service } from '../types';

function stableHashInt(input: string): number {
  // djb2 (deterministic, fast, good enough for stable UI pick)
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
  }
  return h >>> 0;
}

export function getReservationServices(reservation: Reservation | null | undefined): Service[] {
  if (!reservation) return [];

  const fromItems =
    Array.isArray(reservation.items) && reservation.items.length > 0
      ? reservation.items
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
          .map((it) => it.service)
          .filter((s): s is Service => !!s)
      : [];

  if (fromItems.length > 0) return fromItems;
  return reservation.service ? [reservation.service] : [];
}

export function getReservationServicesLabel(reservation: Reservation | null | undefined): string {
  const services = getReservationServices(reservation);
  if (services.length === 0) return 'Usluga';
  return services
    .map((s) => s.name)
    .filter(Boolean)
    .join(', ')
    .trim() || 'Usluga';
}

export function getReservationTotalDurationMinutes(reservation: Reservation | null | undefined): number {
  const services = getReservationServices(reservation);
  const sum = services.reduce((acc, s) => acc + (Number(s.durationMinutes) || 0), 0);
  if (sum > 0) return sum;

  // Fallback: derive from planned start/end (string HH:mm)
  if (!reservation) return 0;
  const start = reservation.startTime?.slice(0, 5) ?? '';
  const end = reservation.endTime?.slice(0, 5) ?? '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (![sh, sm, eh, em].every((x) => Number.isFinite(x))) return 0;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

export function pickReservationBackdropHeroImage(reservation: Reservation | null | undefined): string | null {
  if (!reservation) return null;
  const services = getReservationServices(reservation);
  const candidates = services.map((s) => s.heroImage).filter((p): p is string => !!p);
  if (candidates.length === 0) return reservation.service?.heroImage ?? null;
  const idx = stableHashInt(reservation.id) % candidates.length;
  return candidates[idx] ?? candidates[0] ?? null;
}

