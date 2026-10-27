export const DEFAULT_SALON_TIMEZONE = 'Europe/Sarajevo'

const makeUtcDate = (
  year: number,
  monthIndex0: number,
  day: number,
  hour: number,
  minute: number,
): Date => {
  const date = new Date(0)
  date.setUTCFullYear(year, monthIndex0, day)
  date.setUTCHours(hour, minute, 0, 0)
  return date
}

const sameWallTime = (
  parts: ZonedDateParts,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): boolean =>
  parts.year === year &&
  parts.month === month &&
  parts.day === day &&
  parts.hour === hour &&
  parts.minute === minute

/**
 * Convert a wall-clock calendar value to an instant without consulting the
 * process timezone. For a repeated fall-back time, choose the later instant;
 * for a spring-forward gap, move forward by the gap while preserving minutes.
 */
export const zonedWallTimeToUtc = (
  year: number,
  monthIndex0: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date => {
  const targetDate = makeUtcDate(year, monthIndex0, day, hour, minute)
  if (
    year < 1 ||
    year > 9999 ||
    targetDate.getUTCFullYear() !== year ||
    targetDate.getUTCMonth() !== monthIndex0 ||
    targetDate.getUTCDate() !== day ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new RangeError('Invalid wall-clock date or time.')
  }

  const targetWallEpoch = targetDate.getTime()
  const sampleOffsets = new Set<number>()
  for (const hours of [-36, -24, -12, 0, 12, 24, 36]) {
    const sample = new Date(targetWallEpoch + hours * 60 * 60 * 1000)
    const parts = getZonedDateParts(sample, timeZone)
    const localEpoch = makeUtcDate(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
    ).getTime()
    sampleOffsets.add(localEpoch - sample.getTime())
  }

  const candidates = [...sampleOffsets].map((offset) => {
    const instant = new Date(targetWallEpoch - offset)
    const observed = getZonedDateParts(instant, timeZone)
    const observedWallEpoch = makeUtcDate(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
    ).getTime()
    return { instant, observed, observedWallEpoch }
  })

  const exact = candidates.filter(({ observed }) =>
    sameWallTime(observed, year, monthIndex0 + 1, day, hour, minute),
  )
  if (exact.length > 0) {
    // An overlap has two exact instants. Preserve the existing policy of
    // selecting the second occurrence, i.e. the later instant.
    return exact.reduce((later, candidate) =>
      candidate.instant.getTime() > later.instant.getTime() ? candidate : later,
    ).instant
  }

  const afterGap = candidates
    .filter(({ observedWallEpoch }) => observedWallEpoch > targetWallEpoch)
    .sort((a, b) => a.observedWallEpoch - b.observedWallEpoch)
  if (afterGap.length > 0) return afterGap[0].instant

  throw new RangeError('Unable to resolve wall-clock time in timezone.')
}

interface ZonedDateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

export const getZonedDateParts = (
  date: Date,
  timeZone: string,
): ZonedDateParts => {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new RangeError('Expected a valid instant.')
  }
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const map = new Map<string, string>()
  for (const { type, value } of fmt.formatToParts(date)) {
    map.set(type, value)
  }
  return {
    year: Number(map.get('year')),
    month: Number(map.get('month')),
    day: Number(map.get('day')),
    hour: Number(map.get('hour')) % 24,
    minute: Number(map.get('minute')),
  }
}
