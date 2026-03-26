import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  role: { findUnique: jest.fn() },
  userRole: { create: jest.fn() },
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
};

const mockConfigService = {
  get: jest.fn(
    (key: string, defaultValue?: string) => defaultValue ?? 'test-secret',
  ),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const validDto: RegisterDto = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('baca ConflictException ako email već postoji', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: '1',
        email: validDto.email,
      });
      await expect(service.register(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(validDto)).rejects.toThrow(
        'Email je već u upotrebi.',
      );
    });

    it('baca ConflictException ako username već postoji', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: '1',
        username: validDto.username,
      });
      await expect(service.register(validDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(validDto)).rejects.toThrow(
        'Korisničko ime je već u upotrebi.',
      );
    });

    it('baca BadRequestException ako rola CLIENT ne postoji', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue(null);
      await expect(service.register(validDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(validDto)).rejects.toThrow(
        'Rola CLIENT nije pronađena',
      );
    });

    it('registruje novog korisnika i vraća access_token i user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role-1',
        name: 'CLIENT',
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      const createdUser = {
        id: 'user-1',
        username: validDto.username,
        email: validDto.email,
        firstName: validDto.firstName,
        lastName: validDto.lastName,
        userRoles: [{ role: { name: 'CLIENT' } }],
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockPrisma.userRole.create.mockResolvedValue({});

      const result = await service.register(validDto);

      expect(result).toHaveProperty('access_token', 'mock-jwt-token');
      expect(result.user).toMatchObject({
        id: 'user-1',
        username: validDto.username,
        email: validDto.email,
        firstName: validDto.firstName,
        lastName: validDto.lastName,
        roles: ['CLIENT'],
      });
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.userRole.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      login: 'test@example.com',
      password: 'password123',
    };
    const dbUser = {
      id: 'user-1',
      email: 'test@example.com',
      username: 'testuser',
      passwordHash: 'hashed',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      mustChangePassword: false,
      phone: null,
      isEmailVerified: false,
      userRoles: [{ role: { name: 'CLIENT' } }],
    };

    it('baca UnauthorizedException ako korisnik ne postoji', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Pogrešno korisničko ime ili lozinka.',
      );
    });

    it('baca UnauthorizedException ako lozinka nije ispravna', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('baca UnauthorizedException ako je nalog deaktiviran', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        ...dbUser,
        isActive: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      await expect(service.login(loginDto)).rejects.toThrow(
        'Nalog je deaktiviran.',
      );
    });

    it('vraća access_token i user kada su kredencijali ispravni', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(dbUser);
      mockPrisma.user.update.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(loginDto);

      expect(result.access_token).toBe('mock-jwt-token');
      expect(result.user).toMatchObject({
        id: 'user-1',
        email: dbUser.email,
        username: dbUser.username,
        roles: ['CLIENT'],
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: dbUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });
  });

  describe('validateUser', () => {
    it('vraća null ako korisnik ne postoji', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await service.validateUser('unknown-id')).toBeNull();
    });

    it('vraća null ako korisnik nije aktivan', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        username: 'x',
        email: 'x@x.com',
        isActive: false,
        userRoles: [],
      });
      expect(await service.validateUser('u1')).toBeNull();
    });

    it('vraća payload sa sub, username, email, roles ako korisnik postoji i aktivan je', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        username: 'john',
        email: 'john@example.com',
        isActive: true,
        userRoles: [{ role: { name: 'CLIENT' } }],
      });
      const result = await service.validateUser('u1');
      expect(result).toEqual({
        sub: 'u1',
        username: 'john',
        email: 'john@example.com',
        roles: ['CLIENT'],
      });
    });
  });

  describe('changePassword', () => {
    it('resetuje mustChangePassword nakon promjene lozinke', async () => {
      const dto: ChangePasswordDto = {
        currentPassword: 'Init2026!',
        newPassword: 'NovaLozinka123!',
      };
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        passwordHash: 'old-hash',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockPrisma.user.update.mockResolvedValue({});

      await service.changePassword('u1', dto);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: {
          passwordHash: 'new-hash',
          mustChangePassword: false,
          passwordChangedAt: expect.any(Date),
        },
      });
    });
  });
});
