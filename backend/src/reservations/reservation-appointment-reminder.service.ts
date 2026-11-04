import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { SettingsService } from '../settings/settings.service'
import { NotificationsService } from '../notifications/notifications.service'
import { ReservationDateService } from './reservation-date.service'
import { RESERVATION_STATUS } from './constants'
import { loadReservationPushContext } from '../notifications/utils/load-reservation-push-context'
import { buildAppointmentReminderCopy } from '../notifications/utils/reservation-push-copy'

const EVENT_TYPE = 'reservation.appointment_reminder'
const WINDOW_MINUTES = 20
const ELIGIBLE_STATUSES = [
  RESERVATION_STATUS.CONFIRMED,
  RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
]

type AppointmentReminderPayload = {
  reservationId: string
  clientId: string
  reservationDate: string
  startTime: string
}

@Injectable()
export class ReservationAppointmentReminderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly dates: ReservationDateService,
    private readonly notifications: NotificationsService,
  ) {}

  async processAppointmentReminders(): Promise<{ queuedCount: number }> {
    await this.dates.refreshTimezone()
    const hours = await this.settings.getNumber('system_notif_reminder_hours')
    const now = Date.now()
    const windowMs = WINDOW_MINUTES * 60 * 1000
    const rows = await this.prisma.reservation.findMany({
      where: {
        reminderSentAt: null,
        status: { in: ELIGIBLE_STATUSES as never },
      },
      select: {
        id: true,
        clientId: true,
        reservationDate: true,
        startTime: true,
      },
    })

    let queuedCount = 0
    for (const row of rows) {
      const start = this.dates.combineDateAndTime(
        row.reservationDate,
        row.startTime,
      )
      const reminderAt = this.dates
        .addSalonWallClockHours(start, -hours)
        .getTime()
      if (reminderAt < now - windowMs || reminderAt > now + windowMs) continue

      const reservationDate = this.dates.toDateOnlyString(row.reservationDate)
      const payload: AppointmentReminderPayload = {
        reservationId: row.id,
        clientId: row.clientId,
        reservationDate,
        startTime: row.startTime,
      }
      const inserted = await this.prisma.outboxEvent.createMany({
        data: [
          {
            eventType: EVENT_TYPE,
            aggregateId: row.id,
            dedupeKey: `reservation:${row.id}:appointment-reminder:${reservationDate}:${row.startTime}`,
            payload: payload as unknown as Prisma.InputJsonValue,
          },
        ],
        skipDuplicates: true,
      })
      queuedCount += inserted.count
    }
    return { queuedCount }
  }

  async deliverOutboxEvent(eventId: string, rawPayload: unknown): Promise<void> {
    const payload = this.parsePayload(rawPayload)
    await this.dates.refreshTimezone()
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: payload.reservationId },
      select: {
        id: true,
        clientId: true,
        reservationDate: true,
        startTime: true,
        reminderSentAt: true,
        status: true,
      },
    })

    if (
      !reservation ||
      reservation.clientId !== payload.clientId ||
      reservation.reminderSentAt !== null ||
      !ELIGIBLE_STATUSES.includes(reservation.status as (typeof ELIGIBLE_STATUSES)[number]) ||
      this.dates.toDateOnlyString(reservation.reservationDate) !== payload.reservationDate ||
      reservation.startTime !== payload.startTime
    ) {
      return
    }

    const hours = await this.settings.getNumber('system_notif_reminder_hours')
    const start = this.dates.combineDateAndTime(
      reservation.reservationDate,
      reservation.startTime,
    )
    const reminderAt = this.dates
      .addSalonWallClockHours(start, -hours)
      .getTime()
    const now = Date.now()
    const windowMs = WINDOW_MINUTES * 60 * 1000
    if (reminderAt < now - windowMs || reminderAt > now + windowMs) return

    const loaded = await loadReservationPushContext(this.prisma, reservation.id)
    const copy = buildAppointmentReminderCopy({
      ref: loaded?.ref ?? reservation.id.slice(0, 8),
      serviceNames: loaded?.serviceNames?.length ? loaded.serviceNames : ['uslugu'],
      date: payload.reservationDate,
      startTime: reservation.startTime,
      endTime: loaded?.endTime ?? reservation.startTime,
      attendanceRequired: loaded?.attendanceRequired ?? true,
    })
    await this.notifications.send({
      userId: payload.clientId,
      title: copy.title,
      body: copy.body,
      type: 'reservation_reminder',
      data: {
        kind: 'appointment_reminder',
        reservationId: reservation.id,
      },
      channel: 'BOTH',
      sourceEventId: eventId,
    })
    await this.prisma.reservation.updateMany({
      where: {
        id: reservation.id,
        clientId: payload.clientId,
        reservationDate: reservation.reservationDate,
        startTime: payload.startTime,
        reminderSentAt: null,
        status: { in: ELIGIBLE_STATUSES as never },
      },
      data: { reminderSentAt: new Date() },
    })
  }

  private parsePayload(rawPayload: unknown): AppointmentReminderPayload {
    if (
      !rawPayload ||
      typeof rawPayload !== 'object' ||
      !('reservationId' in rawPayload) ||
      typeof rawPayload.reservationId !== 'string' ||
      !('clientId' in rawPayload) ||
      typeof rawPayload.clientId !== 'string' ||
      !('reservationDate' in rawPayload) ||
      typeof rawPayload.reservationDate !== 'string' ||
      !('startTime' in rawPayload) ||
      typeof rawPayload.startTime !== 'string'
    ) {
      throw new Error('Neispravan appointment reminder outbox payload.')
    }
    return rawPayload as AppointmentReminderPayload
  }
}
