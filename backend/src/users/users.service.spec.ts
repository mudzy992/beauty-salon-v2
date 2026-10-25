jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { EventsGateway } from '../events/events.gateway';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

type UserUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
  include?: unknown;
};

const mockEventsGateway = {
  disconnectUserSockets: jest.fn(),
};

const mockRepo = {
  findOwnedAvatarUpload: jest.fn(),
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn<(args: UserUpdateArgs) => Promise<unknown>>(),
  },
  role: {
    findUnique: jest.fn(),
  },
  userRole: {
    create: jest.fn(),
    delete: jest.fn(),
  },
  transaction: jest.fn(),
  reservation: {
    findMany: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
  },
  clientCancellationCount: {
    findUnique: jest.fn(),
  },
  dailyLogEntry: {
    findMany: jest.fn(),
  },
  incomeBookManualEntry: {
    findMany: jest.fn(),
  },
};

type ClientQuery = {
  where: Record<string, unknown>;
  select: Record<string, unknown>;
  skip: number;
  take: number;
};

const firstClientQuery = (mock: {
  mock: { calls: ReadonlyArray<ReadonlyArray<unknown>> };
}): ClientQuery => {
  const query = mock.mock.calls[0]?.[0];
  if (
    typeof query !== 'object' ||
    query === null ||
    !('where' in query) ||
    !('select' in query) ||
    !('skip' in query) ||
    !('take' in query)
  ) {
    throw new Error('Expected a paginated Prisma client query');
  }
  return query as ClientQuery;
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepo },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('client picker is paginated and returns only booking display fields', async () => {
    const client = {
      id: 'client-1',
      username: 'client.one',
      firstName: 'Client',
      lastName: 'One',
      gender: 'FEMALE',
    };
    mockRepo.user.count.mockResolvedValue(12);
    mockRepo.user.findMany.mockResolvedValue([client]);

    const result = await service.findClientPicker(
      ['STYLIST'],
      { page: 0, pageSize: 10 },
      ' Client ',
    );

    expect(result).toEqual({ items: [client], page: 0, pageSize: 10 });
    const query = firstClientQuery(mockRepo.user.findMany);
    expect(query.skip).toBe(0);
    expect(query.take).toBe(10);
    expect(query.select).toEqual({
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      gender: true,
    });
    expect(query.select).not.toHaveProperty('passwordHash');
    expect(query.select).not.toHaveProperty('emailVerificationToken');
    expect(query.select).not.toHaveProperty('email');
    expect(query.where).toMatchObject({
      OR: [
        { username: { contains: 'Client' } },
        { firstName: { contains: 'Client' } },
        { lastName: { contains: 'Client' } },
      ],
    });
    expect(query.where.OR).toEqual([
      { username: { contains: 'Client' } },
      { firstName: { contains: 'Client' } },
      { lastName: { contains: 'Client' } },
    ]);
  });

  it('admin client list is role restricted and uses an allowlist', async () => {
    await expect(service.findClientsForAdmin(['STYLIST'])).rejects.toThrow(
      ForbiddenException,
    );

    const client = { id: 'client-1' };
    mockRepo.user.count.mockResolvedValue(1);
    mockRepo.user.findMany.mockResolvedValue([client]);
    const result = await service.findClientsForAdmin(
      ['OWNER'],
      { page: 5, pageSize: 10 },
      'client@example.com',
    );

    expect(result).toEqual({
      items: [client],
      total: 1,
      page: 0,
      pageSize: 10,
    });
    const query = firstClientQuery(mockRepo.user.findMany);
    expect(query.skip).toBe(0);
    expect(query.take).toBe(10);
    expect(query.where).toMatchObject({
      OR: [
        { username: { contains: 'client@example.com' } },
        { email: { contains: 'client@example.com' } },
        { firstName: { contains: 'client@example.com' } },
        { lastName: { contains: 'client@example.com' } },
      ],
    });
    expect(query.where.OR).toEqual([
      { username: { contains: 'client@example.com' } },
      { email: { contains: 'client@example.com' } },
      { firstName: { contains: 'client@example.com' } },
      { lastName: { contains: 'client@example.com' } },
    ]);
    expect(query.select).toEqual({
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      gender: true,
      avatar: true,
      isActive: true,
      isEmailVerified: true,
      createdAt: true,
      userRoles: { select: { role: { select: { name: true } } } },
    });
    for (const privateField of [
      'passwordHash',
      'emailVerificationToken',
      'emailVerificationExpiresAt',
      'googleId',
      'facebookId',
      'mustChangePassword',
    ]) {
      expect(query.select).not.toHaveProperty(privateField);
    }
  });

  it('predlaže slobodan username kada je bazni zauzet', async () => {
    mockRepo.user.findUnique
      .mockResolvedValueOnce({ id: 'taken' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.getUsernameAvailability('ime.prezime', [
      'OWNER',
    ]);
    expect(result.available).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('kreira korisnika sa init lozinkom i mustChangePassword', async () => {
    mockRepo.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'user-1',
        username: 'ime.prezime',
        userRoles: [{ role: { name: 'CLIENT' } }],
        stylistProfile: null,
      });
    mockRepo.role.findUnique
      .mockResolvedValueOnce({ id: 'role-1', name: 'CLIENT' })
      .mockResolvedValueOnce({ id: 'role-1', name: 'CLIENT' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
    mockRepo.user.create.mockResolvedValue({
      id: 'user-1',
      username: 'ime.prezime',
      userRoles: [{ role: { name: 'CLIENT' } }],
    });

    const result = await service.create(
      {
        firstName: 'Ime',
        lastName: 'Prezime',
        gender: 'FEMALE',
        role: 'CLIENT',
      },
      ['OWNER'],
    );

    expect(mockRepo.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mustChangePassword: true,
          email: null,
          genderOnboardingCompleted: false,
        }),
      }),
    );
    expect(result).toMatchObject({
      initialPasswordShownOnce: true,
      initialPassword: 'Init2026!',
    });
  });

  it('baca grešku kada je ručno uneseni username zauzet', async () => {
    mockRepo.user.findUnique.mockResolvedValue({ id: 'taken' });
    await expect(
      service.create(
        {
          firstName: 'Ime',
          lastName: 'Prezime',
          username: 'zauzet.username',
          role: 'CLIENT',
        },
        ['OWNER'],
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('getClientAnalytics vraća manualEntries iz daily log + income book manual entries', async () => {
    mockRepo.user.findUnique.mockResolvedValue({
      id: 'u1',
      username: 'u1',
      email: null,
      firstName: 'Belma',
      lastName: 'Kadrić',
      phone: null,
      isActive: true,
      createdAt: new Date('2026-03-27T00:00:00Z'),
      userRoles: [{ role: { name: 'CLIENT' } }],
    });
    mockRepo.reservation.findMany.mockResolvedValue([]);
    mockRepo.review.findMany.mockResolvedValue([]);
    mockRepo.clientCancellationCount.findUnique.mockResolvedValue(null);
    mockRepo.dailyLogEntry.findMany.mockResolvedValue([
      {
        id: 'd1',
        serviceId: 's1',
        date: new Date('2026-03-05T00:00:00Z'),
        actualPrice: 20,
        tipAmount: 0,
        isManual: true,
        notes: null,
        status: 'COMPLETED',
        service: { id: 's1', name: 'Manicure', price: 20 },
        stylistProfile: {
          user: { firstName: 'Ana', lastName: 'A', username: 'ana' },
        },
      },
    ]);
    mockRepo.incomeBookManualEntry.findMany.mockResolvedValue([
      {
        id: 'm1',
        serviceId: 's2',
        date: new Date('2026-03-06T00:00:00Z'),
        amount: 50,
        tipAmount: 5,
        notes: 'ručno kroz knjigu',
        service: { id: 's2', name: 'Pedicure', price: 50 },
        stylistProfile: {
          user: { firstName: 'Ena', lastName: 'E', username: 'ena' },
        },
      },
    ]);

    const result = await service.getClientAnalytics(
      'u1',
      ['OWNER'],
      '2026-03-01',
      '2026-03-31',
    );
    const dateBounds = {
      gte: new Date('2026-03-01T00:00:00.000Z'),
      lt: new Date('2026-04-01T00:00:00.000Z'),
    };
    const reviewInstantBounds = {
      gte: new Date('2026-02-28T23:00:00.000Z'),
      lt: new Date('2026-03-31T22:00:00.000Z'),
    };
    expect(mockRepo.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'u1', reservationDate: dateBounds },
      }),
    );
    expect(mockRepo.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1', createdAt: reviewInstantBounds },
      }),
    );
    expect(mockRepo.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clientId: 'u1', deletedAt: null, date: dateBounds },
      }),
    );
    expect(mockRepo.incomeBookManualEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'u1', date: dateBounds } }),
    );
    expect(result.fromDate).toBe('2026-03-01');
    expect(result.toDate).toBe('2026-03-31');
    expect(result.stats.manualEntryCount).toBe(2);
    expect(result.stats.manualSpent).toBe(70);
    expect(result.manualEntries).toHaveLength(2);
    expect(result.manualEntries[0].id).toBe('m1');
    expect(result.manualEntries[0].isManual).toBe(true);
  });

  it('rejects incomplete or overlong client analytics ranges before database reads', async () => {
    await expect(
      service.getClientAnalytics('user-1', ['OWNER'], '2026-01-01'),
    ).rejects.toThrow('fromDate i toDate moraju biti navedeni zajedno.');
    await expect(
      service.getClientAnalytics('user-1', ['OWNER'], '2020-01-01', '2025-01-02'),
    ).rejects.toThrow('Analytics date range ne može biti duži od 60 mjeseci.');
    expect(mockRepo.user.findUnique).not.toHaveBeenCalled();
  });

  it('admin ne može postaviti niti mijenjati tuđi avatar', async () => {
    const admin: CurrentUserPayload = {
      sub: 'admin-1',
      username: 'admin',
      email: '',
      roles: ['OWNER'],
    };

    await expect(
      service.update(
        'client-1',
        { avatar: 'private/avatars/client-thumb.webp' },
        admin,
      ),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.update('client-1', { isAvatarPublic: true }, admin),
    ).rejects.toThrow(ForbiddenException);
    expect(mockRepo.user.findUnique).not.toHaveBeenCalled();
  });

  it('korisnik ne može učiniti nepostojeći avatar javnim', async () => {
    mockRepo.user.findUnique.mockResolvedValue({ avatar: null });

    await expect(service.setAvatarVisibility('user-1', true)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRepo.user.update).not.toHaveBeenCalled();
  });

  it('ne objavljuje avatar koji nije validna privatna varijanta vlasnika', async () => {
    mockRepo.user.findUnique.mockResolvedValue({
      avatar: 'private/avatars/other-thumb.webp',
    });
    mockRepo.findOwnedAvatarUpload.mockResolvedValue(null);

    await expect(service.setAvatarVisibility('user-1', true)).rejects.toThrow(
      BadRequestException,
    );
    expect(mockRepo.user.update).not.toHaveBeenCalled();
  });

  it('self-service avatar visibility updates only the current user setting', async () => {
    mockRepo.user.findUnique.mockResolvedValue({
      avatar: 'private/avatars/user-thumb.webp',
    });
    mockRepo.findOwnedAvatarUpload.mockResolvedValue({
      id: 'avatar-upload',
      mimeType: 'image/jpeg',
      pathOriginal: 'private/avatars/user-original.jpg',
      pathThumb: 'private/avatars/user-thumb.webp',
      pathSmall: 'private/avatars/user-small.webp',
      pathMedium: 'private/avatars/user-medium.webp',
      uploadedById: 'user-1',
      storageClass: 'PRIVATE',
    });
    mockRepo.user.update.mockResolvedValue({
      id: 'user-1',
      avatar: 'private/avatars/user-thumb.webp',
      isAvatarPublic: true,
    });

    await expect(service.setAvatarVisibility('user-1', true)).resolves.toMatchObject({
      isAvatarPublic: true,
    });
    expect(mockRepo.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { isAvatarPublic: true },
      }),
    );
  });

  it('disconnects sockets after an account activity change', async () => {
    const user = {
      id: 'user-1',
      username: 'user.one',
      email: null,
      gender: 'FEMALE',
      isActive: true,
      isEmailVerified: false,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    };
    const updated = { ...user, isActive: false };
    mockRepo.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce({
      ...user,
      userRoles: [{ role: { name: 'CLIENT' } }],
    });
    let userUpdateCall: UserUpdateArgs | undefined;
    mockRepo.user.update.mockImplementationOnce((args: UserUpdateArgs) => {
      userUpdateCall = args;
      return Promise.resolve(updated);
    });

    const currentUser: CurrentUserPayload = {
      sub: 'admin-1',
      username: 'admin',
      email: '',
      roles: ['OWNER'],
    };
    await service.update('user-1', { isActive: false }, currentUser);

    expect(userUpdateCall?.where).toEqual({ id: 'user-1' });
    expect(userUpdateCall?.data.isActive).toBe(false);
    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('disconnects sockets after assigning or removing a role', async () => {
    mockRepo.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        userRoles: [{ role: { name: 'CLIENT' } }],
      })
      .mockResolvedValueOnce({ id: 'user-1', userRoles: [] });
    mockRepo.role.findUnique.mockResolvedValue({
      id: 'role-admin',
      name: 'SYSTEM_ADMIN',
    });
    mockRepo.userRole.create.mockResolvedValue({});

    await service.assignRole('user-1', { role: 'SYSTEM_ADMIN' }, ['OWNER']);
    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'user-1',
    );

    jest.clearAllMocks();
    mockRepo.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        userRoles: [{ id: 'user-role-1', role: { name: 'SYSTEM_ADMIN' } }],
      })
      .mockResolvedValueOnce({ id: 'user-1', userRoles: [] });
    mockRepo.userRole.delete.mockResolvedValue({});

    await service.removeRole('user-1', 'SYSTEM_ADMIN', ['OWNER']);
    expect(mockRepo.userRole.delete).toHaveBeenCalledWith({
      where: { id: 'user-role-1' },
    });
    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'user-1',
    );
  });

  it('disconnects sockets after the stylist-role removal transaction commits', async () => {
    mockRepo.user.findUnique.mockResolvedValue({
      id: 'user-1',
      stylistProfile: { id: 'stylist-profile-1' },
      userRoles: [{ role: { name: 'STYLIST' } }],
    });
    const removedUser = { id: 'user-1', stylistProfile: null };
    mockRepo.transaction.mockResolvedValue(removedUser);

    const result = await service.removeStylistRole(
      'user-1',
      {
        dailyLogs: { mode: 'DELETE' },
        confirmedReservations: { mode: 'DELETE' },
        reservationResponses: { mode: 'DELETE' },
        reviews: { mode: 'DELETE' },
      },
      ['OWNER'],
    );

    expect(result).toBe(removedUser);
    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'user-1',
    );
  });
});
