import 'reflect-metadata';
import { DailyLogCompletionOutboxService } from '../daily-log/daily-log-completion-outbox.service';
import { IncomeCronService } from '../finance/income-cron.service';
import { ReservationDelayCron } from '../reservations/reservation-delay.cron';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class NotificationsService {},
}));
jest.mock('../reservations/reservations.service', () => ({
  ReservationsService: class ReservationsService {},
}));
jest.mock('../reservations/reservation-appointment-reminder.service', () => ({
  ReservationAppointmentReminderService: class ReservationAppointmentReminderService {},
}));
jest.mock('../reservations/reservation-date.service', () => ({
  ReservationDateService: class ReservationDateService {},
}));
jest.mock('../events/events.gateway', () => ({
  EventsGateway: class EventsGateway {},
}));
jest.mock('../daily-log/daily-log-receipt.service', () => ({
  DailyLogReceiptService: class DailyLogReceiptService {},
}));
jest.mock('../finance/income-books.service', () => ({
  IncomeBooksService: class IncomeBooksService {},
}));
jest.mock('../finance/expense-books.service', () => ({
  ExpenseBooksService: class ExpenseBooksService {},
}));

const cronOptions = (prototype: object, method: string) => {
  const handler = (prototype as Record<string, unknown>)[method];
  return Reflect.getMetadata('SCHEDULE_CRON_OPTIONS', handler) as
    { waitForCompletion?: boolean } | undefined;
};

describe('scheduled job overlap policy', () => {
  it.each([
    [ReservationDelayCron.prototype, 'tick'],
    [DailyLogCompletionOutboxService.prototype, 'retryPending'],
    [IncomeCronService.prototype, 'handleIncomeBookCatchUp'],
    [IncomeCronService.prototype, 'handleExpenseBookRollover'],
  ])('%s.%s skips overlapping executions', (prototype, method) => {
    expect(cronOptions(prototype, method)?.waitForCompletion).toBe(true);
  });
});
