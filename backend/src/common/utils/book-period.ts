import { BadRequestException } from '@nestjs/common'
import { DEFAULT_SALON_TIMEZONE, getZonedDateParts } from './zoned-time'
import { parseDateOnlyString } from './date-only'

export type BookPeriod = { year: number; month: number }

const MIN_YEAR = 2000
const MAX_YEAR = 2100

export const getCurrentPeriod = (
  now = new Date(),
  timeZone = DEFAULT_SALON_TIMEZONE,
): BookPeriod => {
  const { year, month } = getZonedDateParts(now, timeZone)
  return { year, month }
}

export const getPreviousPeriod = ({ year, month }: BookPeriod): BookPeriod =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }

export const isPastMonth = (year: number, month: number): boolean => {
  const current = getCurrentPeriod()
  if (year !== current.year) return year < current.year
  return month < current.month
}

export const isFutureMonth = (year: number, month: number): boolean => {
  const current = getCurrentPeriod()
  if (year !== current.year) return year > current.year
  return month > current.month
}

export const assertValidPeriod = (year: number, month: number): void => {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new BadRequestException('Godina nije validna.')
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new BadRequestException('Mjesec nije validan.')
  }
}

export const parseAndNormalizeDate = (value: string): Date => {
  try {
    return parseDateOnlyString(value)
  } catch {
    throw new BadRequestException('Datum nije validan.')
  }
}

/** Period of a Prisma @db.Date value; use UTC calendar components. */
export const getPeriodOfDate = (date: Date): BookPeriod => ({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
})

export const getBookPeriodDateBounds = (year: number, month: number) => {
  assertValidPeriod(year, month)
  const gte = new Date(0)
  gte.setUTCFullYear(year, month - 1, 1)
  gte.setUTCHours(0, 0, 0, 0)
  const lt = new Date(gte)
  lt.setUTCMonth(lt.getUTCMonth() + 1)
  return { gte, lt }
}

export const ensureDateMatchesPeriod = (
  date: Date,
  year: number,
  month: number,
): void => {
  const period = getPeriodOfDate(date)
  if (period.year !== year || period.month !== month) {
    throw new BadRequestException('Datum mora biti unutar mjeseca knjige.')
  }
}
