import { DailyLogRestoreService } from './daily-log-restore.service';
import { RESERVATION_ACCEPTANCE_MODE } from '../reservations/constants';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

const targetDate = '2099-04-12';

const makeFixture = () => {
  const entry = {
    id: 'daily-log-1',
    date: new Date('2025-01-01T00:00:00.000Z'),
    clientId: 'client-1',
    serviceId: 'service-1',
    isManual: false,
    deletedAt: new Date('2025-01-02T00:00:00.000Z'),
    items: [{ serviceId: 'service-1' }, { serviceId: 'service-2' }],
    reservation: {
      id: 'old-reservation-1',
      status: 'CANCELLED',
      bookingOrigin: 'CLIENT',
      acceptanceMode: RESERVATION_ACCEPTANCE_MODE.DIRECT_ASSIGN,
      attendancePolicy: 'STANDARD',
      confirmedStylistId: 'stylist-1',
      startTime: '10:00',
      endTime: '11:00',
      serviceId: 'service-1',
      clientId: 'client-1',
    },
  };

  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([{ acquired: true }]),
    dailyLogEntry: {
      findUnique: jest.fn().mockResolvedValue({
        id: entry.id,
        deletedAt: entry.deletedAt,
      }),
      update: jest.fn().mockResolvedValue({
        id: entry.id,
        reservationId: 'new-reservation-1',
      }),
    },
    reservation: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'new-reservation-1' }),
    },
    reservationServiceItem: {
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
    dailyLogEntry: {
      findUnique: jest.fn().mockResolvedValue(entry),
    },
  };
  const dailyLog = {
    isAdminOrOwner: jest.fn().mockReturnValue(true),
    entryInclude: jest.fn().mockReturnValue({ items: true }),
  };
  const incomeSync = {
    assertBookOpenForDate: jest.fn(),
  };
  const shared = {
    allocateReservationPublicCodes: jest.fn().mockResolvedValue({
      publicReferenceCode: 'RZ-20990412-ABC123',
      clientViewToken: 'client-view-token',
    }),
  };
  const dates = {
    parseDateOnly: jest
      .fn()
      .mockReturnValue(new Date(`${targetDate}T00:00:00.000Z`)),
    toSalonDateOnlyString: jest
      .fn()
      .mockReturnValue(new Date().toISOString().slice(0, 10)),
  };
  const service = new DailyLogRestoreService(
    prisma as never,
    dailyLog as never,
    incomeSync as never,
    shared as never,
    dates as never,
  );

  return { service, entry, tx, prisma, dailyLog, incomeSync, shared };
};

const user = { sub: 'staff-1' } as CurrentUserPayload;

describe('DailyLogRestoreService future reservation restore', () => {
  it('atomically creates the reservation and restores the linked daily-log entry', async () => {
    const { service, tx, prisma, shared, dailyLog } = makeFixture();

    await service.restore('daily-log-1', { date: targetDate } as never, user);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.reservation.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.reservation.findMany).toHaveBeenCalledTimes(1);
    expect(shared.allocateReservationPublicCodes).toHaveBeenCalledWith(
      new Date(`${targetDate}T00:00:00.000Z`),
      tx,
    );
    expect(tx.reservation.create).toHaveBeenCalledTimes(1);
    expect(tx.reservationServiceItem.createMany).toHaveBeenCalledTimes(1);
    expect(tx.dailyLogEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'daily-log-1' },
        data: expect.objectContaining({
          deletedAt: null,
          reservationId: 'new-reservation-1',
        }),
        include: dailyLog.entryInclude(),
      }),
    );
  });

  it('does not restore the daily-log entry when reservation creation fails', async () => {
    const { service, tx } = makeFixture();
    tx.reservation.create.mockRejectedValue(
      new Error('reservation write failed'),
    );

    await expect(
      service.restore('daily-log-1', { date: targetDate } as never, user),
    ).rejects.toThrow('reservation write failed');

    expect(tx.dailyLogEntry.update).not.toHaveBeenCalled();
    expect(tx.reservationServiceItem.createMany).not.toHaveBeenCalled();
  });

  it('rejects a concurrent restore when the entry is no longer deleted', async () => {
    const { service, tx } = makeFixture();
    tx.dailyLogEntry.findUnique.mockResolvedValue({
      id: 'daily-log-1',
      deletedAt: null,
    });

    await expect(
      service.restore('daily-log-1', { date: targetDate } as never, user),
    ).rejects.toThrow('Zapis više nije obrisan.');

    expect(tx.reservation.create).not.toHaveBeenCalled();
    expect(tx.dailyLogEntry.update).not.toHaveBeenCalled();
  });
});
