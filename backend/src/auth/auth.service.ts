import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventsGateway } from '../events/events.gateway';
import { getPasswordVersion, matchesPasswordVersion } from './password-version';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  lockUploadPathReferences,
  uploadPathsInReferences,
} from '../uploads/upload-reference-lock';

const SALT_ROUNDS = 10;
const EMAIL_VERIFICATION_EXPIRY_MINUTES = 15;
const VERIFICATION_CODE_LENGTH = 6;
const PASSWORD_RESET_LINK_EXPIRY_DAYS = 7;
const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CLIENT_ROLE_NAME = 'CLIENT';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { username: dto.username }],
      },
    });
    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email je već u upotrebi.');
      }
      throw new ConflictException('Korisničko ime je već u upotrebi.');
    }

    const clientRole = await this.prisma.role.findUnique({
      where: { name: CLIENT_ROLE_NAME },
    });
    if (!clientRole) {
      throw new BadRequestException(
        'Rola CLIENT nije pronađena. Pokrenite seed.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const createArgs = {
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        avatar: dto.avatar ?? null,
        userRoles: {
          create: { roleId: clientRole.id },
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    } as const;
    const user = uploadPathsInReferences([dto.avatar]).length
      ? await this.prisma.$transaction(async (tx) => {
          await lockUploadPathReferences(tx, [dto.avatar]);
          return tx.user.create(createArgs);
        })
      : await this.prisma.user.create(createArgs);

    const token = await this.createAccessToken(
      user.id,
      user.email,
      user.username,
      ['CLIENT'],
      user.passwordChangedAt,
    );
    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar ?? undefined,
        gender: user.gender ?? null,
        genderOnboardingCompleted: user.genderOnboardingCompleted,
        roles: ['CLIENT'],
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.login }, { username: dto.login }],
      },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Pogrešno korisničko ime ili lozinka.');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Pogrešno korisničko ime ili lozinka.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Pogrešno korisničko ime ili lozinka.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const access_token = await this.createAccessToken(
      user.id,
      user.email,
      user.username,
      roles,
      user.passwordChangedAt,
    );

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar ?? undefined,
        isEmailVerified: user.isEmailVerified,
        mustChangePassword: user.mustChangePassword,
        phone: user.phone ?? null,
        gender: user.gender ?? null,
        genderOnboardingCompleted: user.genderOnboardingCompleted,
        roles,
      },
    };
  }

  async validateUser(userId: string, tokenPasswordVersion?: unknown) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
        mustChangePassword: true,
        passwordChangedAt: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (
      !user?.isActive ||
      !matchesPasswordVersion(user.passwordChangedAt, tokenPasswordVersion)
    ) {
      return null;
    }
    return {
      sub: user.id,
      username: user.username,
      email: user.email ?? '',
      roles: user.userRoles.map((userRole) => userRole.role.name),
      mustChangePassword: user.mustChangePassword,
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string; access_token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        passwordChangedAt: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Promjena lozinke nije moguća za ovaj nalog (prijava putem društvene mreže).',
      );
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid)
      throw new UnauthorizedException('Trenutna lozinka nije ispravna.');
    const newHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    const nextPasswordChangedAt = new Date(
      Math.max(Date.now(), getPasswordVersion(user.passwordChangedAt) + 1),
    );
    const updated = await this.prisma.user.updateMany({
      where: {
        id: userId,
        passwordHash: user.passwordHash,
        passwordChangedAt: user.passwordChangedAt,
      },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        passwordChangedAt: nextPasswordChangedAt,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException(
        'Lozinka je u međuvremenu promijenjena. Pokušajte ponovo.',
      );
    }

    this.eventsGateway.disconnectUserSockets(userId);
    const roles = user.userRoles.map((userRole) => userRole.role.name);
    const access_token = await this.createAccessToken(
      user.id,
      user.email,
      user.username,
      roles,
      nextPasswordChangedAt,
    );
    return {
      message: 'Lozinka je uspješno promijenjena.',
      access_token,
    };
  }

  async issueInitialPasswordResetLink(
    userId: string,
  ): Promise<{ message: string; expiresAt: Date }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        isEmailVerified: true,
        mustChangePassword: true,
        passwordHash: true,
        passwordChangedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    if (!user.mustChangePassword) {
      throw new BadRequestException(
        'Nalog nema početnu lozinku na čekanju za reset.',
      );
    }
    if (!user.email || !user.isEmailVerified) {
      throw new BadRequestException(
        'Reset link se šalje samo na potvrđenu email adresu.',
      );
    }
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Za ovaj nalog nije moguće izdati reset link.',
      );
    }

    await this.notifications.assertInitialPasswordResetLinkEmailReady();

    const token = crypto
      .randomBytes(PASSWORD_RESET_TOKEN_BYTES)
      .toString('base64url');
    const tokenHash = this.hashPasswordResetToken(token);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    const unusablePasswordHash = await bcrypt.hash(
      crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('base64url'),
      SALT_ROUNDS,
    );
    const nextPasswordChangedAt = new Date(
      Math.max(Date.now(), getPasswordVersion(user.passwordChangedAt) + 1),
    );
    const issued = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        mustChangePassword: true,
        email: user.email,
        isEmailVerified: true,
        passwordHash: user.passwordHash,
        passwordChangedAt: user.passwordChangedAt,
      },
      data: {
        passwordHash: unusablePasswordHash,
        passwordChangedAt: nextPasswordChangedAt,
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });
    if (issued.count !== 1) {
      throw new ConflictException(
        'Nalog je promijenjen prije izdavanja reset linka. Osvježite stranicu i pokušajte ponovo.',
      );
    }

    this.eventsGateway.disconnectUserSockets(user.id);
    await this.notifications.sendInitialPasswordResetLinkEmail({
      to: user.email,
      firstName: user.firstName,
      token,
      expiresAt,
    });
    return {
      message: 'Reset link je poslan na potvrđenu email adresu.',
      expiresAt,
    };
  }

  async resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    if (!PASSWORD_RESET_TOKEN_PATTERN.test(token)) {
      throw new BadRequestException(
        'Reset link nije ispravan ili je istekao. Zatražite novi link od administratora.',
      );
    }

    const now = new Date();
    const tokenHash = this.hashPasswordResetToken(token);
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: now },
        mustChangePassword: true,
        isEmailVerified: true,
      },
      select: { id: true, passwordChangedAt: true },
    });
    if (!user) {
      throw new BadRequestException(
        'Reset link nije ispravan ili je istekao. Zatražite novi link od administratora.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const nextPasswordChangedAt = new Date(
      Math.max(Date.now(), getPasswordVersion(user.passwordChangedAt) + 1),
    );
    const consumed = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { gt: now },
        mustChangePassword: true,
        isEmailVerified: true,
        passwordChangedAt: user.passwordChangedAt,
      },
      data: {
        passwordHash,
        mustChangePassword: false,
        passwordChangedAt: nextPasswordChangedAt,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
    if (consumed.count !== 1) {
      throw new BadRequestException(
        'Reset link nije ispravan ili je istekao. Zatražite novi link od administratora.',
      );
    }

    this.eventsGateway.disconnectUserSockets(user.id);
    return {
      message:
        'Lozinka je postavljena. Sada se možete prijaviti novom lozinkom.',
    };
  }

  async sendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isEmailVerified: true },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    if (!user.email) {
      throw new BadRequestException('Prvo unesite email adresu u profilu.');
    }
    if (user.isEmailVerified) {
      throw new BadRequestException('Email adresa je već potvrđena.');
    }
    const code = crypto
      .randomInt(0, 10 ** VERIFICATION_CODE_LENGTH)
      .toString()
      .padStart(VERIFICATION_CODE_LENGTH, '0');
    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: this.hashVerificationCode(code),
        emailVerificationExpiresAt: expiresAt,
      },
    });
    await this.notifications.sendVerificationCodeEmail({
      to: user.email,
      code,
    });
    return {
      message:
        'Verifikacijski kod je poslan na vašu email adresu. Kod vrijedi 15 minuta.',
    };
  }

  async verifyEmail(
    userId: string,
    token: string,
  ): Promise<{ message: string }> {
    if (!/^\d{6}$/.test(token)) {
      throw new BadRequestException(
        'Kod nije ispravan ili je istekao. Zatražite novi kod.',
      );
    }
    const now = new Date();
    const tokenDigest = this.hashVerificationCode(token);
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isEmailVerified: false,
        emailVerificationToken: tokenDigest,
        emailVerificationExpiresAt: { gt: now },
      },
      select: { id: true, emailVerificationExpiresAt: true },
    });
    const maximumExpiry =
      now.getTime() + EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000;
    if (
      !user ||
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() > maximumExpiry
    ) {
      throw new BadRequestException(
        'Kod nije ispravan ili je istekao. Zatražite novi kod.',
      );
    }
    const consumed = await this.prisma.user.updateMany({
      where: {
        id: userId,
        isEmailVerified: false,
        emailVerificationToken: tokenDigest,
        emailVerificationExpiresAt: { gt: now },
      },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
    if (consumed.count !== 1) {
      throw new BadRequestException(
        'Kod nije ispravan ili je istekao. Zatražite novi kod.',
      );
    }
    return { message: 'Email adresa je uspješno potvrđena.' };
  }

  private hashPasswordResetToken(token: string): string {
    return crypto
      .createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`admin-initial-password-reset:v1:${token}`)
      .digest('hex');
  }

  private hashVerificationCode(code: string): string {
    return crypto
      .createHmac('sha256', this.config.getOrThrow<string>('JWT_SECRET'))
      .update(`email-verification:v1:${code}`)
      .digest('hex');
  }

  private async createAccessToken(
    sub: string,
    email: string | null,
    username: string,
    roles: string[],
    passwordChangedAt: Date | null | undefined,
  ): Promise<string> {
    const payload = {
      sub,
      email: email ?? '',
      username,
      roles,
      pwdv: getPasswordVersion(passwordChangedAt),
    };
    return this.jwtService.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_SECRET'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d') as '7d',
    });
  }
}
