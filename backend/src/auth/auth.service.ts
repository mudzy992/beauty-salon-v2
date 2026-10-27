import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
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

const SALT_ROUNDS = 10;
const EMAIL_VERIFICATION_EXPIRY_HOURS = 24;
const VERIFICATION_CODE_LENGTH = 6;
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
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        avatar: dto.avatar ?? null,
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    await this.prisma.userRole.create({
      data: { userId: user.id, roleId: clientRole.id },
    });

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
      throw new UnauthorizedException('Nalog je deaktiviran.');
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
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
        passwordChangedAt: nextPasswordChangedAt,
      },
      select: { passwordChangedAt: true },
    });

    this.eventsGateway.disconnectUserSockets(userId);
    if (!updatedUser.passwordChangedAt) {
      throw new InternalServerErrorException(
        'Password change could not be confirmed.',
      );
    }
    const roles = user.userRoles.map((userRole) => userRole.role.name);
    const access_token = await this.createAccessToken(
      user.id,
      user.email,
      user.username,
      roles,
      updatedUser.passwordChangedAt,
    );
    return {
      message: 'Lozinka je uspješno promijenjena.',
      access_token,
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
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EMAIL_VERIFICATION_EXPIRY_HOURS);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: code,
        emailVerificationExpiresAt: expiresAt,
      },
    });
    await this.notifications.sendVerificationCodeEmail({
      to: user.email,
      code,
    });
    return {
      message:
        'Verifikacijski kod je poslan na vašu email adresu. Kod vrijedi 24 sata.',
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: { gt: new Date() },
      },
    });
    if (!user) {
      throw new BadRequestException(
        'Kod nije ispravan ili je istekao. Zatražite novi kod.',
      );
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
    return { message: 'Email adresa je uspješno potvrđena.' };
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
