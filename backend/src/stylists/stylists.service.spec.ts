jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { EventsGateway } from '../events/events.gateway';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import type { PrismaService } from '../prisma/prisma.service';
import { StylistsService } from './stylists.service';

type ProfileUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

const mockEventsGateway = {
  disconnectUserSockets: jest.fn(),
};

const mockPrisma = {
  user: { findUnique: jest.fn() },
  reservation: { findMany: jest.fn() },
  dailyLogEntry: { findMany: jest.fn() },
  incomeBookManualEntry: { findMany: jest.fn() },
  stylistService: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  stylistWorkingHours: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
  },
  stylistProfile: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn<(args: ProfileUpdateArgs) => Promise<unknown>>(),
    delete: jest.fn(),
  },
  role: { findUnique: jest.fn() },
  userRole: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const owner: CurrentUserPayload = {
  sub: 'owner-1',
  username: 'owner',
  email: '',
  roles: ['OWNER'],
};

describe('StylistsService socket revocation', () => {
  let service: StylistsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StylistsService(
      mockPrisma as unknown as PrismaService,
      mockEventsGateway as unknown as EventsGateway,
    );
  });

  it('returns a bounded, stable stylist page with total metadata', async () => {
    const items = [{ id: 'profile-1' }];
    mockPrisma.stylistProfile.findMany.mockResolvedValue(items);
    mockPrisma.stylistProfile.count.mockResolvedValue(4);

    await expect(
      service.findAll(true, { page: 1, pageSize: 2 }),
    ).resolves.toEqual({
      items,
      total: 4,
      page: 1,
      pageSize: 2,
      hasMore: true,
      nextPage: 2,
    });
    expect(mockPrisma.stylistProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        include: expect.objectContaining({
          stylistServices: {
            take: 50,
            include: { service: true },
            orderBy: [{ service: { sortOrder: 'asc' } }, { serviceId: 'asc' }],
          },
        }) as unknown,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 2,
        take: 2,
      }),
    );
    expect(mockPrisma.stylistProfile.count).toHaveBeenCalledWith({
      where: { isActive: true },
    });
  });

  it('rejects a stylist offset beyond the public catalog cap before querying Prisma', async () => {
    await expect(
      service.findAll(false, { page: 21, pageSize: 50 }),
    ).rejects.toThrow('Raspon kataloga stilista prelazi dozvoljeni limit.');
    expect(mockPrisma.stylistProfile.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.stylistProfile.count).not.toHaveBeenCalled();
  });

  it('caps nested service associations on public stylist detail', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({ id: 'profile-1' });

    await service.findOne('profile-1');

    expect(mockPrisma.stylistProfile.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          stylistServices: {
            take: 50,
            orderBy: [{ service: { sortOrder: 'asc' } }, { serviceId: 'asc' }],
            include: {
              service: {
                include: { subcategory: { include: { category: true } } },
              },
            },
          },
        }) as unknown,
      }),
    );
  });

  it('returns a bounded, ordered page for a stylist service catalog', async () => {
    const items = [{ serviceId: 'service-1' }];
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
    mockPrisma.stylistService.findMany.mockResolvedValue(items);
    mockPrisma.stylistService.count.mockResolvedValue(3);

    await expect(
      service.getServices('profile-1', { page: 1, pageSize: 2 }),
    ).resolves.toEqual({
      items,
      total: 3,
      page: 1,
      pageSize: 2,
      hasMore: false,
      nextPage: null,
    });
    expect(mockPrisma.stylistService.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stylistProfileId: 'profile-1' },
        orderBy: [{ service: { sortOrder: 'asc' } }, { serviceId: 'asc' }],
        skip: 2,
        take: 2,
      }),
    );
    expect(mockPrisma.stylistService.count).toHaveBeenCalledWith({
      where: { stylistProfileId: 'profile-1' },
    });
  });

  it('rejects out-of-range stylist service pages before database access', async () => {
    await expect(
      service.getServices('profile-1', { page: 21, pageSize: 50 }),
    ).rejects.toThrow('Raspon servisa stiliste prelazi dozvoljeni limit.');
    expect(mockPrisma.stylistProfile.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.stylistService.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.stylistService.count).not.toHaveBeenCalled();
  });

  it('rejects incomplete analytics ranges before reading a stylist profile', async () => {
    await expect(
      service.getStylistAnalytics('profile-1', ['OWNER'], '2026-01-01'),
    ).rejects.toThrow('fromDate i toDate moraju biti navedeni zajedno.');
    expect(mockPrisma.stylistProfile.findUnique).not.toHaveBeenCalled();
  });

  it('applies inclusive date bounds to every stylist analytics query', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      user: {
        id: 'user-1',
        username: 'stylist',
        firstName: 'Ana',
        lastName: 'A',
        email: null,
      },
    });
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    mockPrisma.incomeBookManualEntry.findMany.mockResolvedValue([]);

    const result = await service.getStylistAnalytics(
      'profile-1',
      ['OWNER'],
      '2026-03-01',
      '2026-03-31',
    );
    const dateBounds = {
      gte: new Date('2026-03-01T00:00:00.000Z'),
      lt: new Date('2026-04-01T00:00:00.000Z'),
    };

    expect(result).toMatchObject({
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    });
    expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          confirmedStylistId: 'profile-1',
          status: 'COMPLETED',
          reservationDate: dateBounds,
        },
      }),
    );
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stylistProfileId: 'profile-1',
          status: 'COMPLETED',
          deletedAt: null,
          date: dateBounds,
        },
      }),
    );
    expect(mockPrisma.incomeBookManualEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stylistProfileId: 'profile-1', date: dateBounds },
      }),
    );
  });

  it('disconnects the stylist after profile eligibility changes', async () => {
    const activeProfile = {
      id: 'profile-1',
      userId: 'stylist-user-1',
      isActive: true,
      status: 'ACTIVE',
    };
    mockPrisma.stylistProfile.findUnique
      .mockResolvedValueOnce(activeProfile)
      .mockResolvedValueOnce(activeProfile);
    mockPrisma.stylistProfile.update.mockResolvedValue({
      ...activeProfile,
      isActive: false,
    });

    await service.update('profile-1', { isActive: false }, owner);

    expect(mockPrisma.stylistProfile.update).toHaveBeenCalledTimes(1);
    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'stylist-user-1',
    );
  });

  it('disconnects the stylist when its status becomes pending', async () => {
    const activeProfile = {
      id: 'profile-1',
      userId: 'stylist-user-1',
      isActive: true,
      status: 'ACTIVE',
    };
    mockPrisma.stylistProfile.findUnique
      .mockResolvedValueOnce(activeProfile)
      .mockResolvedValueOnce({ ...activeProfile, status: 'PENDING' });
    mockPrisma.stylistProfile.update.mockResolvedValue({
      ...activeProfile,
      status: 'PENDING',
    });

    await service.update('profile-1', { status: 'PENDING' }, owner);

    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'stylist-user-1',
    );
  });

  it('stores hireDate as a strict UTC date-only value', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'stylist-user-1' });
    mockPrisma.stylistProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'profile-1', userId: 'stylist-user-1' });
    mockPrisma.stylistProfile.create.mockResolvedValue({
      id: 'profile-1',
      userId: 'stylist-user-1',
    });
    mockPrisma.role.findUnique.mockResolvedValue(null);

    await service.create(
      { userId: 'stylist-user-1', hireDate: '2026-04-01' },
      ['OWNER'],
    );

    expect(mockPrisma.stylistProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          hireDate: new Date('2026-04-01T00:00:00.000Z'),
        }),
      }),
    );
  });

  it('rejects an invalid date override before deleting existing working hours', async () => {
    await expect(
      service.setWorkingHours('profile-1', [
        {
          dayOfWeek: 0,
          dateOverride: '2026-02-30',
          startTime: '09:00',
          endTime: '17:00',
        },
      ]),
    ).rejects.toThrow('Datum mora biti validan YYYY-MM-DD.');

    expect(mockPrisma.stylistWorkingHours.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.stylistProfile.findUnique).not.toHaveBeenCalled();
  });

  it('disconnects existing sessions when creating a stylist profile and role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'stylist-user-1' });
    mockPrisma.stylistProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'profile-1',
        userId: 'stylist-user-1',
        isActive: true,
        status: 'ACTIVE',
      });
    mockPrisma.stylistProfile.create.mockResolvedValue({
      id: 'profile-1',
      userId: 'stylist-user-1',
    });
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'stylist-role-1' });
    mockPrisma.userRole.findFirst.mockResolvedValue(null);
    mockPrisma.userRole.create.mockResolvedValue({});

    await service.create({ userId: 'stylist-user-1' }, ['OWNER']);

    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'stylist-user-1',
    );
    expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'stylist-user-1', roleId: 'stylist-role-1' },
    });
  });

  it('disconnects the stylist immediately after profile removal', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      userId: 'stylist-user-1',
    });
    mockPrisma.stylistProfile.delete.mockResolvedValue({});
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'stylist-role-1' });
    mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.remove('profile-1', ['OWNER'])).resolves.toEqual({
      deleted: true,
    });

    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'stylist-user-1',
    );
    expect(
      mockPrisma.stylistProfile.delete.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mockEventsGateway.disconnectUserSockets.mock.invocationCallOrder[0],
    );
  });
});
