export const DEFAULT_SALON_TIMEZONE = 'Europe/Sarajevo'

export const zonedWallTimeToUtc = (
  year: number,
  monthIndex0: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date => {
  const guess = new Date(Date.UTC(year, monthIndex0, day, hour, minute, 0, 0))
  const parts = getZonedDateParts(guess, timeZone)

  const diffH = parts.hour - hour
  const diffM = parts.minute - minute

  let offsetMs = (diffH * 60 + diffM) * 60_000
  let adjusted = new Date(guess.getTime() - offsetMs)

  const verify = getZonedDateParts(adjusted, timeZone)
  if (verify.hour !== hour || verify.minute !== minute) {
    const diffH2 = verify.hour - hour
    const diffM2 = verify.minute - minute
    offsetMs = (diffH2 * 60 + diffM2) * 60_000
    adjusted = new Date(adjusted.getTime() - offsetMs)
  }

  return adjusted
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
