import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReservationsService } from './reservations.service';
import { ReservationAppointmentReminderService } from './reservation-appointment-reminder.service';
import { ReservationDelayReminderService } from './reservation-delay-reminder.service';
import { DEFAULT_SALON_TIMEZONE } from '../common/utils/zoned-time';

@Injectable()
export class ReservationDelayCron {
  constructor(
    private readonly reservations: ReservationsService,
    private readonly appointmentReminders: ReservationAppointmentReminderService,
    private readonly delayReminders: ReservationDelayReminderService,
  ) {}

  /**
   * Svake minute pokreće reservation maintenance i queue work;
   * slanje reminder notifikacija obavlja durable outbox worker.
   */
  @Cron('*/1 * * * *', {
    timeZone: DEFAULT_SALON_TIMEZONE,
    waitForCompletion: true,
  })
  async tick() {
    await this.reservations.processPendingRescheduleTimeouts();
    const attendanceResult = await this.reservations.processAttendanceDeadlines();
    if ((attendanceResult?.cancelledCount ?? 0) > 0) {
      await this.reservations.processAutoReordersAfterAttendanceCancellations();
    }
    await this.reservations.processDirectBookingDailyLogSeeds();
    await this.reservations.processPendingDailyLogReminders();
    await this.appointmentReminders.processAppointmentReminders();
    await this.reservations.processExpiredLocks();
    await this.reservations.processInboxTimeouts();
    await this.delayReminders.processReservationDelayReminders();
  }
}
