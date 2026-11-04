import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { ReservationListService } from './reservation-list.service';

const prisma = {
  reservation: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};
const shared = {
  getStylistProfileIdByUserId: jest.fn(),
};
const dates = {
  getAttendanceConfirmDeadlineHours: jest.fn().mockResolvedValue(24),
  combineDateAndTime: jest.fn((date: Date) => date),
};

const client: CurrentUserPayload = {
  sub: 'client-1',
  username: 'client',
  email: 'client@example.test',
  roles: ['CLIENT'],
};
const stylist: CurrentUserPayload = {
  sub: 'stylist-1',
  username: 'stylist',
  email: 'stylist@example.test',
  roles: ['STYLIST'],
};
const owner: CurrentUserPayload = {
  sub: 'owner-1',
  username: 'owner',
  email: 'owner@example.test',
  roles: ['OWNER'],
};

describe('ReservationListService access scopes', () => {
  let service: ReservationListService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.reservation.findMany.mockResolvedValue([]);
    prisma.reservation.count.mockResolvedValue(0);
    shared.getStylistProfileIdByUserId.mockResolvedValue('profile-1');
    service = new ReservationListService(
      prisma as never,
      shared as never,
      dates as never,
    );
  });

  it('rejects an unscoped reservation list for ordinary users', async () => {
    await expect(service.findAll({}, client)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.reservation.findMany).not.toHaveBeenCalled();
  });

  it('scopes client queries to the authenticated user', async () => {
    await service.findAll({ asClient: true }, client);

    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: client.sub },
        omit: {
          clientViewToken: true,
          idempotencyKey: true,
          idempotencyRequestHash: true,
        },
      }),
    );
    expect(shared.getStylistProfileIdByUserId).not.toHaveBeenCalled();
  });

  it('rejects stylist scope for callers without the stylist role', async () => {
    await expect(
      service.findAll({ asStylist: true }, client),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(shared.getStylistProfileIdByUserId).not.toHaveBeenCalled();
    expect(prisma.reservation.findMany).not.toHaveBeenCalled();
  });

  it('rejects stylist scope when no stylist profile is attached', async () => {
    shared.getStylistProfileIdByUserId.mockResolvedValue(null);

    await expect(
      service.findAll({ asStylist: true }, stylist),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.reservation.findMany).not.toHaveBeenCalled();
  });

  it('scopes stylist queries to confirmed and inbox reservations for that profile', async () => {
    await service.findAll({ asStylist: true }, stylist);

    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { confirmedStylistId: 'profile-1' },
            { stylistResponses: { some: { stylistProfileId: 'profile-1' } } },
          ],
        },
      }),
    );
  });

  it('requires paired bounded reservation pagination with a safe computed offset', async () => {
    await expect(
      service.findAll({ asClient: true, page: 0 }, client),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.findAll({ asClient: true, page: 21, pageSize: 50 }, client),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.findAll({ asClient: true, page: 0, pageSize: 51 }, client),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.reservation.findMany).not.toHaveBeenCalled();

    await service.findAll(
      { asClient: true, page: 20, pageSize: 50 },
      client,
    );
    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 1000,
        take: 50,
        orderBy: [
          { reservationDate: 'asc' },
          { startTime: 'asc' },
          { id: 'asc' },
        ],
      }),
    );
  });

  it('preserves unscoped admin/owner access', async () => {
    await service.findAll({}, owner);

    expect(prisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});
