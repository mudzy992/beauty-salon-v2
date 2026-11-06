import { DailyLogDispositionService } from './daily-log-disposition.service';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { RESERVATION_STATUS } from '../reservations/constants';

const reservationDate = new Date('2026-11-20T00:00:00.000Z');
const targetDate = '2026-11-21';

const makeFixture = () => {
  const reservation = {
    id: 'reservation-1',
    clientId: 'client-1',
    serviceId: 'service-1',
    confirmedStylistId: 'stylist-1',
    reservationDate,
    startTime: '10:00',
    endTime: '11:00',
    status: RESERVATION_STATUS.AWAITING_DAILY_LOG,
    items: [],
    publicReferenceCode: 'RZ-20261120-ABC123',
    clientViewToken: 'client-view-token',
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ acquired: true }]),
    dailyLogEntry: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'daily-log-1',
        status: 'PENDING',
        deletedAt: null,
        reservationId: reservation.id,
      }),
    },
    reservation: {
      findUnique: jest.fn().mockResolvedValue(reservation),
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest
        .fn()
        .mockResolvedValue({ ...reservation, status: 'CONFIRMED' }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    reservation: {
      findUnique: jest.fn().mockResolvedValue(reservation),
    },
  };
  const dailyLog = {
    findOne: jest.fn().mockResolvedValue({
      id: 'daily-log-1',
      status: 'PENDING',
      reservationId: reservation.id,
    }),
    isAdminOrOwner: jest.fn().mockReturnValue(true),
  };
  const dailyLogAdmin = {
    softDeletePendingInTransaction: jest.fn().mockResolvedValue({}),
  };
  const shared = {
    getStylistProfileIdByUserId: jest.fn(),
    transitionTo: jest.fn().mockReturnValue('CONFIRMED'),
  };
  const dates = {
    parseDateOnly: jest
      .fn()
      .mockReturnValue(new Date(`${targetDate}T00:00:00.000Z`)),
    toDateOnlyString: jest.fn().mockReturnValue('2026-11-20'),
  };
  const queries = {
    findOne: jest.fn().mockResolvedValue({
      ...reservation,
      status: RESERVATION_STATUS.CONFIRMED,
      reservationDate: new Date(`${targetDate}T00:00:00.000Z`),
    }),
  };
  const notifications = { send: jest.fn() };
  const events = {
    emitToAdmins: jest.fn(),
    emitToUser: jest.fn(),
    emitToAll: jest.fn(),
  };
  const reservationNotify = { notifyClientTimeChanged: jest.fn() };
  const service = new DailyLogDispositionService(
    prisma as never,
    dailyLog as never,
    dailyLogAdmin as never,
    shared as never,
    dates as never,
    queries as never,
    notifications as never,
    events as never,
    reservationNotify as never,
  );

  return {
    service,
    reservation,
    tx,
    prisma,
    dailyLogAdmin,
    queries,
    reservationNotify,
  };
};

const user = { sub: 'admin-1' } as CurrentUserPayload;
const reorderDto = {
  action: 'reorder',
  reason: 'Promjena termina',
  targetDate,
  targetStartTime: '11:00',
  targetEndTime: '12:00',
};

describe('DailyLogDispositionService', () => {
  it('commits the entry deletion and reorder together, then notifies after commit', async () => {
    const { service, tx, prisma, dailyLogAdmin, reservationNotify } =
      makeFixture();

    await service.dispose('daily-log-1', reorderDto as never, user);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(dailyLogAdmin.softDeletePendingInTransaction).toHaveBeenCalledWith(
      'daily-log-1',
      'Promjena termina',
      user,
      tx,
    );
    expect(tx.reservation.update).toHaveBeenCalledTimes(1);
    expect(reservationNotify.notifyClientTimeChanged).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.invocationCallOrder[0]).toBeLessThan(
      reservationNotify.notifyClientTimeChanged.mock.invocationCallOrder[0],
    );
  });

  it('does not dispatch post-commit effects when the reservation transition fails', async () => {
    const { service, tx, prisma, dailyLogAdmin, queries, reservationNotify } =
      makeFixture();
    tx.reservation.update.mockRejectedValue(
      new Error('reservation write failed'),
    );

    await expect(
      service.dispose('daily-log-1', reorderDto as never, user),
    ).rejects.toThrow('reservation write failed');

    expect(dailyLogAdmin.softDeletePendingInTransaction).toHaveBeenCalledWith(
      'daily-log-1',
      'Promjena termina',
      user,
      tx,
    );
    expect(reservationNotify.notifyClientTimeChanged).not.toHaveBeenCalled();
    expect(queries.findOne).not.toHaveBeenCalled();
  });
});
