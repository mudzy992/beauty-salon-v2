import { BadRequestException } from '@nestjs/common'

export type BookPeriod = { year: number; month: number }

const MIN_YEAR = 2000
const MAX_YEAR = 2100

export const getCurrentPeriod = (): BookPeriod => {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
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
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException('Datum nije validan.')
  }
  date.setHours(0, 0, 0, 0)
  return date
}

export const getPeriodOfDate = (date: Date): BookPeriod => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
})

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
