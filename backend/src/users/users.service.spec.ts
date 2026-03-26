import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  role: {
    findUnique: jest.fn(),
  },
  userRole: {
    create: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('predlaže slobodan username kada je bazni zauzet', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ id: 'taken' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.getUsernameAvailability('ime.prezime', ['OWNER']);
    expect(result.available).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('kreira korisnika sa init lozinkom i mustChangePassword', async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'user-1',
        username: 'ime.prezime',
        userRoles: [{ role: { name: 'CLIENT' } }],
        stylistProfile: null,
      });
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-1', name: 'CLIENT' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      username: 'ime.prezime',
      userRoles: [{ role: { name: 'CLIENT' } }],
    });
    mockPrisma.userRole.create.mockResolvedValue({});

    const result = await service.create(
      {
        firstName: 'Ime',
        lastName: 'Prezime',
        role: 'CLIENT',
      },
      ['OWNER'],
    );

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mustChangePassword: true,
          email: null,
        }),
      }),
    );
    expect(result).toMatchObject({
      initialPasswordShownOnce: true,
      initialPassword: 'Init2026!',
    });
  });

  it('baca grešku kada je ručno uneseni username zauzet', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'taken' });
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
});
