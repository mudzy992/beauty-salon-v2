import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const SALT_ROUNDS = 10;
const CLIENT_ROLE_NAME = 'CLIENT';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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
      throw new BadRequestException('Rola CLIENT nije pronađena. Pokrenite seed.');
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
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    await this.prisma.userRole.create({
      data: { userId: user.id, roleId: clientRole.id },
    });

    // TODO: send verification email with token (Phase 3 - notifications)
    // For now we can auto-verify or use a simple token in DB
    const token = await this.createAccessToken(user.id, user.email, user.username, ['CLIENT']);
    return {
      access_token: token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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
    const access_token = await this.createAccessToken(user.id, user.email, user.username, roles);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || !user.isActive) return null;
    return {
      sub: user.id,
      username: user.username,
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }

  private async createAccessToken(
    sub: string,
    email: string,
    username: string,
    roles: string[],
  ): Promise<string> {
    const payload = { sub, email, username, roles };
    return this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_SECRET', 'change-me-in-production'),
      expiresIn: this.config.get('JWT_EXPIRES_IN', '7d') as '7d',
    });
  }
}
