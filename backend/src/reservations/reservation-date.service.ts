import { Injectable, OnModuleInit } from '@nestjs/common'
import { SettingsService } from '../settings/settings.service'
import {
  DEFAULT_SALON_TIMEZONE,
  getZonedDateParts,
  zonedWallTimeToUtc,
} from '../common/utils/zoned-time'
import { ATTENDANCE_CONFIRM_DEADLINE_HOURS, DAILY_LOG_REMINDER_HOURS, INBOX_TIMEOUT_HOURS } from './constants'

const ATTENDANCE_HOURS_SETTING = 'system_reservation_attendance_hours'
const INBOX_HOURS_SETTING = 'system_reservation_inbox_timeout_hours'
const DAILY_LOG_REMINDER_HOURS_SETTING = 'system_reservation_daily_log_reminder_hours'

@Injectable()
export class ReservationDateService implements OnModuleInit {
  private tz = DEFAULT_SALON_TIMEZONE

  constructor(private readonly settings: SettingsService) {}

  async onModuleInit(): Promise<void> {
    await this.refreshTimezone()
  }

  async refreshTimezone(): Promise<void> {
    try {
      this.tz = await this.settings.getString('salon.timezone')
    } catch {
      this.tz = DEFAULT_SALON_TIMEZONE
    }
  }

  getTimezone(): string {
    return this.tz
  }

  async getAttendanceConfirmDeadlineHours(): Promise<number> {
    try {
      return await this.settings.getNumber(ATTENDANCE_HOURS_SETTING)
    } catch {
      return ATTENDANCE_CONFIRM_DEADLINE_HOURS
    }
  }

  async getInboxTimeoutHours(): Promise<number> {
    try {
      return await this.settings.getNumber(INBOX_HOURS_SETTING)
    } catch {
      return INBOX_TIMEOUT_HOURS
    }
  }

  async getDailyLogReminderHours(): Promise<number> {
    try {
      return await this.settings.getNumber(DAILY_LOG_REMINDER_HOURS_SETTING)
    } catch {
      return DAILY_LOG_REMINDER_HOURS
    }
  }

  /**
   * Combine a calendar date + HH:mm wall time → UTC instant.
   * `date` is expected from Prisma @db.Date (UTC midnight) — calendar Y/M/D
   * are taken from UTC components. `time` is interpreted as salon wall clock.
   */
  combineDateAndTime(date: Date, time: string): Date {
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const day = date.getUTCDate()
    const [hh, mm] = (time ?? '').split(':').map((x) => Number(x))
    const hours = Number.isFinite(hh) ? hh : 0
    const minutes = Number.isFinite(mm) ? mm : 0
    return zonedWallTimeToUtc(year, month, day, hours, minutes, this.tz)
  }

  /**
   * Parse a value to a stable UTC-midnight date for calendar-day comparison.
   * - string `YYYY-MM-DD`: UTC midnight of that day
   * - Date: calendar day **in salon TZ** → UTC midnight of that day
   */
  parseDateOnly(value: Date | string): Date {
    if (typeof value === 'string') {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
      if (match) {
        return new Date(
          Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
        )
      }
    }
    const d = value instanceof Date ? value : new Date(value)
    const parts = getZonedDateParts(d, this.tz)
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  }

  toLocalDateOnlyString(date: Date): string {
    const parts = getZonedDateParts(date, this.tz)
    const m = String(parts.month).padStart(2, '0')
    const d = String(parts.day).padStart(2, '0')
    return `${parts.year}-${m}-${d}`
  }

  getDayStartEnd(date: Date) {
    const parts = getZonedDateParts(date, this.tz)
    const start = zonedWallTimeToUtc(
      parts.year, parts.month - 1, parts.day, 0, 0, this.tz,
    )
    const endDay = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day + 1),
    )
    const end = zonedWallTimeToUtc(
      endDay.getUTCFullYear(), endDay.getUTCMonth(), endDay.getUTCDate(),
      0, 0, this.tz,
    )
    end.setMilliseconds(end.getMilliseconds() - 1)
    return { start, end }
  }
}
