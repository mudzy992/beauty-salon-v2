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
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('bcrypt');
jest.mock('expo-server-sdk', () => {
  class MockExpo {
    static isExpoPushToken() {
      return true;
    }
    chunkPushNotifications(messages: unknown[]) {
      return [messages];
    }
    async sendPushNotificationsAsync() {
      return [];
    }
  }
  return { __esModule: true, default: MockExpo };
});

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  role: { findUnique: jest.fn() },
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
};

const mockConfigService = {
  get: jest.fn(
    (key: string, defaultValue?: string) => defaultValue ?? 'test-secret',
  ),
  getOrThrow: jest.fn(() => 'test-secret'),
};
const mockNotifications = {
  sendVerificationCodeEmail: jest.fn(),
  assertInitialPasswordResetLinkEmailReady: jest
    .fn()
    .mockResolvedValue(undefined),
  sendInitialPasswordResetLinkEmail: jest.fn(),
};
const mockEventsGateway = {
  disconnectUserSockets: jest.fn(),
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
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: EventsGateway, useValue: mockEventsGateway },
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
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userRoles: { create: { roleId: 'role-1' } },
        }),
        include: { userRoles: { include: { role: true } } },
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-1', pwdv: 0 }),
        expect.any(Object),
      );
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
      passwordChangedAt: null,
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
        'Pogrešno korisničko ime ili lozinka.',
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
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: dbUser.id, pwdv: 0 }),
        expect.any(Object),
      );
    });
  });

  describe('verifyEmail', () => {
    it('accepts a valid hashed code and consumes it once', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        emailVerificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.verifyEmail('u1', '123456')).resolves.toMatchObject({
        message: 'Email adresa je uspješno potvrđena.',
      });
      const expectedDigest = crypto
        .createHmac('sha256', 'test-secret')
        .update('email-verification:v1:123456')
        .digest('hex');
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'u1',
          isEmailVerified: false,
          emailVerificationToken: expectedDigest,
          emailVerificationExpiresAt: { gt: expect.any(Date) },
        },
        select: { id: true, emailVerificationExpiresAt: true },
      });
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'u1',
          isEmailVerified: false,
          emailVerificationToken: expectedDigest,
          emailVerificationExpiresAt: { gt: expect.any(Date) },
        },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });
    });

    it('rejects malformed codes before database access', async () => {
      await expect(service.verifyEmail('u1', 'not-six-digits')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
    });

    it('rejects verification records with more than 15 minutes remaining', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        emailVerificationExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await expect(service.verifyEmail('u1', '123456')).rejects.toThrow(
        BadRequestException,
      );
      const expectedDigest = crypto
        .createHmac('sha256', 'test-secret')
        .update('email-verification:v1:123456')
        .digest('hex');
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'u1',
          isEmailVerified: false,
          emailVerificationToken: expectedDigest,
          emailVerificationExpiresAt: { gt: expect.any(Date) },
        },
        select: { id: true, emailVerificationExpiresAt: true },
      });
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });

    it('rejects a code if its conditional single-use consume loses a race', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        emailVerificationExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.verifyEmail('u1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('sendVerificationEmail', () => {
    it('stores a six-digit code with a 15-minute expiry', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'john@example.com',
        isEmailVerified: false,
      });
      mockPrisma.user.update.mockResolvedValue({});
      const before = Date.now();

      const result = await service.sendVerificationEmail('u1');

      const updateData = mockPrisma.user.update.mock.calls[0][0].data;
      expect(updateData.emailVerificationToken).toMatch(/^[a-f0-9]{64}$/);
      const sentCode =
        mockNotifications.sendVerificationCodeEmail.mock.calls[0][0].code;
      expect(sentCode).toMatch(/^\d{6}$/);
      expect(updateData.emailVerificationToken).not.toBe(sentCode);
      const remainingMs =
        updateData.emailVerificationExpiresAt.getTime() - Date.now();
      expect(remainingMs).toBeGreaterThan(14 * 60 * 1000);
      expect(remainingMs).toBeLessThanOrEqual(15 * 60 * 1000);
      expect(mockNotifications.sendVerificationCodeEmail).toHaveBeenCalledWith({
        to: 'john@example.com',
        code: sentCode,
      });
      expect(result.message).toContain('15 minuta');
      expect(updateData.emailVerificationExpiresAt.getTime()).toBeGreaterThan(
        before,
      );
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
        passwordChangedAt: null,
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
        mustChangePassword: true,
        passwordChangedAt: null,
        userRoles: [{ role: { name: 'CLIENT' } }],
      });
      const result = await service.validateUser('u1');
      expect(result).toEqual({
        sub: 'u1',
        username: 'john',
        email: 'john@example.com',
        roles: ['CLIENT'],
        mustChangePassword: true,
      });
    });

    it('rejects tokens minted before the recorded password change', async () => {
      const changedAt = new Date('2026-10-25T12:34:56.789Z');
      const user = {
        id: 'u1',
        username: 'john',
        email: 'john@example.com',
        isActive: true,
        passwordChangedAt: changedAt,
        userRoles: [{ role: { name: 'CLIENT' } }],
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      expect(await service.validateUser('u1', 0)).toBeNull();
      expect(await service.validateUser('u1', undefined)).toBeNull();
      await expect(
        service.validateUser('u1', changedAt.getTime()),
      ).resolves.toMatchObject({ sub: 'u1', roles: ['CLIENT'] });
    });
  });

  describe('changePassword', () => {
    it('invalidates existing sessions and returns a replacement access token', async () => {
      const dto: ChangePasswordDto = {
        currentPassword: 'temporary-test-password',
        newPassword: 'NovaLozinka123!',
      };
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        username: 'john',
        email: 'john@example.com',
        passwordHash: 'old-hash',
        passwordChangedAt: null,
        userRoles: [{ role: { name: 'CLIENT' } }],
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });

      await expect(service.changePassword('u1', dto)).resolves.toEqual({
        message: 'Lozinka je uspješno promijenjena.',
        access_token: 'mock-jwt-token',
      });

      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'u1',
          passwordHash: 'old-hash',
          passwordChangedAt: null,
        },
        data: {
          passwordHash: 'new-hash',
          mustChangePassword: false,
          passwordChangedAt: expect.any(Date),
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });
      expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
        'u1',
      );
      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'u1', pwdv: expect.any(Number) }),
        expect.any(Object),
      );
    });
  });

  describe('admin-issued initial password reset links', () => {
    const pendingUser = {
      id: 'u1',
      email: 'john@example.com',
      firstName: 'John',
      isEmailVerified: true,
      mustChangePassword: true,
      passwordHash: 'legacy-hash',
      passwordChangedAt: null,
    };

    it('invalidates the pending password and mails only a hashed, seven-day token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(pendingUser);
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
      (bcrypt.hash as jest.Mock).mockResolvedValue('unusable-hash');

      const startedAt = Date.now();
      await expect(
        service.issueInitialPasswordResetLink('u1'),
      ).resolves.toMatchObject({
        message: 'Reset link je poslan na potvrđenu email adresu.',
        expiresAt: expect.any(Date),
      });

      const email =
        mockNotifications.sendInitialPasswordResetLinkEmail.mock.calls[0][0];
      expect(email.to).toBe('john@example.com');
      expect(email.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(email.expiresAt.getTime()).toBeGreaterThanOrEqual(
        startedAt + 7 * 24 * 60 * 60 * 1000,
      );
      expect(email.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      );
      const expectedTokenHash = crypto
        .createHmac('sha256', 'test-secret')
        .update(`admin-initial-password-reset:v1:${email.token}`)
        .digest('hex');
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'u1',
          mustChangePassword: true,
          email: 'john@example.com',
          isEmailVerified: true,
          passwordHash: 'legacy-hash',
          passwordChangedAt: null,
        },
        data: {
          passwordHash: 'unusable-hash',
          passwordChangedAt: expect.any(Date),
          passwordResetTokenHash: expectedTokenHash,
          passwordResetExpiresAt: email.expiresAt,
        },
      });
      expect(
        mockNotifications.sendInitialPasswordResetLinkEmail,
      ).toHaveBeenCalledTimes(1);
      expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
        'u1',
      );
    });

    it('does not issue a reset link to an unverified or missing email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...pendingUser,
        isEmailVerified: false,
      });

      await expect(service.issueInitialPasswordResetLink('u1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
      expect(
        mockNotifications.sendInitialPasswordResetLinkEmail,
      ).not.toHaveBeenCalled();
    });

    it('consumes a valid reset token once and clears the forced-change state', async () => {
      const token = crypto.randomBytes(32).toString('base64url');
      const tokenHash = crypto
        .createHmac('sha256', 'test-secret')
        .update(`admin-initial-password-reset:v1:${token}`)
        .digest('hex');
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        passwordChangedAt: null,
      });
      mockPrisma.user.updateMany.mockResolvedValue({ count: 1 });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-password-hash');

      await expect(
        service.resetPasswordWithToken(token, 'new-password'),
      ).resolves.toEqual({
        message:
          'Lozinka je postavljena. Sada se možete prijaviti novom lozinkom.',
      });
      expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'u1',
          passwordResetTokenHash: tokenHash,
          passwordResetExpiresAt: { gt: expect.any(Date) },
          mustChangePassword: true,
          isEmailVerified: true,
          passwordChangedAt: null,
        },
        data: {
          passwordHash: 'new-password-hash',
          mustChangePassword: false,
          passwordChangedAt: expect.any(Date),
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
        },
      });
      expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
        'u1',
      );
    });

    it('rejects malformed tokens without database access', async () => {
      await expect(
        service.resetPasswordWithToken('not-a-reset-token', 'new-password'),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
    });
  });
});
