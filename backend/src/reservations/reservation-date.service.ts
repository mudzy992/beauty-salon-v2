import { Injectable } from '@nestjs/common'
import { toLocalDateOnlyString } from '../common/utils/date-only'
import { getDayStartEnd } from '../common/utils/date-range'

@Injectable()
export class ReservationDateService {
  parseDateOnly(value: Date | string): Date {
    const d = new Date(value)
    d.setHours(0, 0, 0, 0)
    return d
  }

  toLocalDateOnlyString(date: Date): string {
    return toLocalDateOnlyString(date)
  }

  getDayStartEnd(date: Date) {
    return getDayStartEnd(date)
  }

  combineDateAndTime(date: Date, time: string): Date {
    const [hh, mm] = (time ?? '').split(':').map((x) => Number(x))
    const hours = Number.isFinite(hh) ? hh : 0
    const minutes = Number.isFinite(mm) ? mm : 0
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hours,
      minutes,
      0,
      0,
    )
  }
}
