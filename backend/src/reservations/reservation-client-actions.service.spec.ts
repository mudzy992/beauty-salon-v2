import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { ReservationClientActionsService } from './reservation-client-actions.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';

const transaction = {
  reservation: { updateMany: jest.fn() },
};
const prisma = {
  $transaction: jest.fn(),
  reservation: { findUnique: jest.fn() },
  salonSettings: { findFirst: jest.fn() },
  stylistProfile: { findUnique: jest.fn() },
};
const events = {
  emitToAdmins: jest.fn(),
  emitToStylists: jest.fn(),
  emitToAll: jest.fn(),
};
const shared = {
  transitionTo: jest.fn((_from: string, to: string) => to),
  incrementCancellationCountInTransaction: jest.fn(),
};
const dates = {
  combineDateAndTime: jest.fn(() => new Date('2099-05-10T10:00:00.000Z')),
  toDateOnlyString: jest.fn(() => '2099-05-10'),
};
const queries = { findOne: jest.fn().mockResolvedValue({ id: 'res-1' }) };
const notifications = { send: jest.fn() };
const reservation = {
  id: 'res-1',
  clientId: 'client-1',
  status: 'CONFIRMED',
  reservationDate: new Date('2099-05-10T00:00:00.000Z'),
  startTime: '10:00',
  serviceId: 'service-1',
  confirmedStylistId: null,
  publicReferenceCode: 'RZ-20990510-ABCDEF',
};

describe('ReservationClientActionsService', () => {
  let service: ReservationClientActionsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof transaction) => unknown) => callback(transaction),
    );
    prisma.reservation.findUnique.mockResolvedValue(reservation);
    prisma.salonSettings.findFirst.mockResolvedValue({
      cancellationDeadlineHours: 24,
      maxCancellationsBeforePenalty: 3,
      penaltyDurationDays: 7,
    });
    transaction.reservation.updateMany.mockResolvedValue({ count: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationClientActionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsGateway, useValue: events },
        { provide: ReservationDateService, useValue: dates },
        { provide: ReservationSharedService, useValue: shared },
        { provide: ReservationQueriesService, useValue: queries },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();
    service = module.get(ReservationClientActionsService);
  });

  it('guards the cancellation write and updates the penalty counter in the same transaction', async () => {
    await service.cancelByClient('res-1', 'client-1');

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.reservation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'res-1', clientId: 'client-1', status: 'CONFIRMED' },
        data: expect.objectContaining({
          status: 'CANCELLED_BY_CLIENT',
        }) as unknown,
      }),
    );
    expect(shared.incrementCancellationCountInTransaction).toHaveBeenCalledWith(
      'client-1',
      expect.objectContaining({ maxCancellationsBeforePenalty: 3 }),
      transaction,
    );
  });

  it('does not count or publish cancellation side effects when a concurrent transition wins', async () => {
    transaction.reservation.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.cancelByClient('res-1', 'client-1')).rejects.toThrow(
      ConflictException,
    );

    expect(
      shared.incrementCancellationCountInTransaction,
    ).not.toHaveBeenCalled();
    expect(queries.findOne).not.toHaveBeenCalled();
    expect(events.emitToAdmins).not.toHaveBeenCalled();
  });
});
