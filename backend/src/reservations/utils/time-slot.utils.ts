/**
 * Pomocne funkcije za rad sa vremenskim slotovima (format "HH:mm").
 */

/** Pretvori "HH:mm" u minute od ponoći (0-1439). */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Pretvori minute od ponoći u "HH:mm". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Generiši slotove između start i end, korak = durationMinutes + pauseMinutes. */
export function generateSlots(
  openTime: string,
  closeTime: string,
  durationMinutes: number,
  pauseMinutes: number,
): Array<{ startTime: string; endTime: string }> {
  const step = durationMinutes + pauseMinutes;
  const startMin = timeToMinutes(openTime);
  const endMin = timeToMinutes(closeTime);
  const slots: Array<{ startTime: string; endTime: string }> = [];
  for (let t = startMin; t + durationMinutes <= endMin; t += step) {
    slots.push({
      startTime: minutesToTime(t),
      endTime: minutesToTime(t + durationMinutes),
    });
  }
  return slots;
}

/** Provjeri da li se interval [start1, end1) preklapa sa [start2, end2) (u minutama). */
export function intervalsOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number,
): boolean {
  return start1 < end2 && start2 < end1;
}
