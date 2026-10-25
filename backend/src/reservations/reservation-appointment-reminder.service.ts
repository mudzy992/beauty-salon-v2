import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { NotificationsService } from '../notifications/notifications.service'
import { ReservationDateService } from './reservation-date.service'
import { RESERVATION_STATUS } from './constants'
import { loadReservationPushContext } from '../notifications/utils/load-reservation-push-context'
import { buildAppointmentReminderCopy } from '../notifications/utils/reservation-push-copy'

const KIND = 'appointment_reminder'
const WINDOW_MINUTES = 20

@Injectable()
export class ReservationAppointmentReminderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly dates: ReservationDateService,
    private readonly notifications: NotificationsService,
  ) {}

  async processAppointmentReminders(): Promise<{ sentCount: number }> {
    await this.dates.refreshTimezone()
    const hours = await this.settings.getNumber('system_notif_reminder_hours')
    const now = Date.now()
    const windowMs = WINDOW_MINUTES * 60 * 1000
    const target = now + hours * 60 * 60 * 1000
    const rows = await this.prisma.reservation.findMany({
      where: {
        reminderSentAt: null,
        status: {
          in: [RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.ATTENDANCE_CONFIRMED] as never,
        },
      },
      select: {
        id: true,
        clientId: true,
        reservationDate: true,
        startTime: true,
      },
    })
    let sentCount = 0
    for (const row of rows) {
      const start = this.dates.combineDateAndTime(row.reservationDate, row.startTime).getTime()
      if (start < target - windowMs || start > target + windowMs) continue
      const loaded = await loadReservationPushContext(this.prisma, row.id)
      const copy = buildAppointmentReminderCopy({
        ref: loaded?.ref ?? row.id.slice(0, 8),
        serviceNames: loaded?.serviceNames?.length ? loaded.serviceNames : ['uslugu'],
        date: this.dates.toDateOnlyString(row.reservationDate),
        startTime: row.startTime,
        endTime: loaded?.endTime ?? row.startTime,
        attendanceRequired: loaded?.attendanceRequired ?? true,
      })
      await this.notifications.send({
        userId: row.clientId,
        title: copy.title,
        body: copy.body,
        type: 'reservation_reminder',
        data: { kind: KIND, reservationId: row.id },
        channel: 'BOTH',
      })
      await this.prisma.reservation.update({
        where: { id: row.id },
        data: { reminderSentAt: new Date() },
      })
      sentCount += 1
    }
    return { sentCount }
  }
}
