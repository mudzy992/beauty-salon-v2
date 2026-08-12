/** Parse "HH:mm" or "HH:mm:ss" → minutes from midnight; null if invalid. */
export const parseHmToMinutes = (value: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec((value ?? '').trim())
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null
  return hours * 60 + minutes
}

export const minutesToHm = (total: number): string => {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.floor(total)))
  const h = Math.floor(clamped / 60)
  const m = clamped % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const durationMinutesFromRange = (startTime: string, endTime: string): number => {
  const start = parseHmToMinutes(startTime)
  const end = parseHmToMinutes(endTime)
  if (start == null || end == null || end <= start) return 0
  return end - start
}

/** Keep HH:mm for API; strip seconds from time inputs. */
export const normalizeHm = (value: string): string => {
  const mins = parseHmToMinutes(value)
  return mins == null ? '' : minutesToHm(mins)
}

export const endTimeFromStartAndDuration = (
  startTime: string,
  durationMinutes: number,
): string => {
  const start = parseHmToMinutes(startTime)
  if (start == null || durationMinutes <= 0) return ''
  return minutesToHm(start + durationMinutes)
}
