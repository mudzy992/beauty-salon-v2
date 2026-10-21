jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockRepo = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
  userRole: {
    create: jest.fn(),
  },
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

    const result = await service.getClientAnalytics('u1', ['OWNER']);
    expect(result.stats.manualEntryCount).toBe(2);
    expect(result.stats.manualSpent).toBe(70);
    expect(result.manualEntries).toHaveLength(2);
    expect(result.manualEntries[0].id).toBe('m1');
    expect(result.manualEntries[0].isManual).toBe(true);
  });
});
