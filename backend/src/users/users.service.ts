import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  private static readonly DEFAULT_INITIAL_PASSWORD = 'Init2026!';

  constructor(private readonly prisma: PrismaService) {}

  /** Lista korisnika za odabir klijenta u dnevnoj knjizi (stilist ili admin). */
  async findForDailyLog(roles: string[]) {
    if (!this.isAdminOrOwner(roles) && !roles.includes('STYLIST')) {
      throw new ForbiddenException('Nemate dozvolu.');
    }
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, firstName: true, lastName: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findAll(roles: string[]) {
    this.requireAdminOrOwner(roles);
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        userRoles: { include: { role: true } },
        stylistProfile: true,
      },
    });
  }

  async findOne(id: string, currentUser: CurrentUserPayload) {
    if (currentUser.sub !== id && !this.isAdminOrOwner(currentUser.roles)) {
      throw new ForbiddenException('Nemate dozvolu za pregled ovog korisnika.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: true } },
        stylistProfile: {
          include: {
            stylistServices: { include: { service: true } },
            workingHours: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    return user;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
        lastLoginAt: true,
        createdAt: true,
        userRoles: { include: { role: true } },
        stylistProfile: true,
      },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    return { ...user, roles: user.userRoles.map((ur) => ur.role.name) };
  }

  async create(dto: CreateUserDto, roles: string[]) {
    this.requireAdminOrOwner(roles);
    if (dto.role === 'STYLIST') {
      throw new BadRequestException(
        'Rola Stilist se dodjeljuje automatski kada korisnik bude dodat u Stylists. Pri kreiranju korisnika odaberite drugu ulogu.',
      );
    }
    const username = dto.username
      ? this.normalizeUsername(dto.username)
      : await this.generateUniqueUsername({
          firstName: dto.firstName,
          lastName: dto.lastName,
        });
    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existingUsername) {
      throw new ConflictException('Korisničko ime je već u upotrebi.');
    }
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!role) throw new NotFoundException(`Rola ${dto.role} nije pronađena.`);
    const initialPassword = dto.password?.trim() || UsersService.DEFAULT_INITIAL_PASSWORD;
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const user = await this.prisma.user.create({
      data: {
        username,
        email: null,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        avatar: dto.avatar ?? null,
        mustChangePassword: true,
        isEmailVerified: false,
      },
      include: { userRoles: { include: { role: true } } },
    });
    await this.prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
    return {
      ...fullUser,
      initialPasswordShownOnce: true,
      initialPassword,
    };
  }

  async getUsernameAvailability(username: string, roles: string[]) {
    this.requireAdminOrOwner(roles);
    const normalized = this.normalizeUsername(username);
    if (!normalized) {
      throw new BadRequestException('Korisničko ime nije validno.');
    }
    const existing = await this.prisma.user.findUnique({
      where: { username: normalized },
      select: { id: true },
    });
    const suggestions = await this.generateUsernameSuggestions(normalized, 3);
    return {
      username: normalized,
      available: !existing,
      suggestions,
    };
  }

  async getProfileUsernameAvailability(userId: string, username: string) {
    const normalized = this.normalizeUsername(username);
    if (!normalized) {
      throw new BadRequestException('Korisničko ime nije validno.');
    }
    const existing = await this.prisma.user.findUnique({
      where: { username: normalized },
      select: { id: true },
    });
    const suggestions = await this.generateUsernameSuggestions(normalized, 3);
    const isCurrentUsername = !!existing && existing.id === userId;
    return {
      username: normalized,
      available: !existing || isCurrentUsername,
      isCurrentUsername,
      suggestions,
    };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: CurrentUserPayload,
  ) {
    if (currentUser.sub !== id && !this.isAdminOrOwner(currentUser.roles)) {
      throw new ForbiddenException('Nemate dozvolu za izmjenu ovog korisnika.');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    if (dto.email && dto.email !== user.email) {
      const taken = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (taken) throw new ConflictException('Email je već u upotrebi.');
    }
    if (dto.username && dto.username !== user.username) {
      const taken = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (taken)
        throw new ConflictException('Korisničko ime je već u upotrebi.');
    }
    const nextEmail = dto.email?.trim() ?? null;
    const shouldResetEmailVerification =
      dto.email !== undefined && nextEmail !== user.email;
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName != null && { firstName: dto.firstName }),
        ...(dto.lastName != null && { lastName: dto.lastName }),
        ...(dto.email !== undefined && {
          email: nextEmail,
          isEmailVerified: shouldResetEmailVerification ? false : user.isEmailVerified,
          emailVerificationToken: shouldResetEmailVerification
            ? null
            : user.emailVerificationToken,
          emailVerificationExpiresAt: shouldResetEmailVerification
            ? null
            : user.emailVerificationExpiresAt,
        }),
        ...(dto.username != null && { username: dto.username }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(this.isAdminOrOwner(currentUser.roles) &&
          dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    if (dto.email !== undefined) {
      const nextEmail = dto.email?.trim();
      if (!nextEmail) throw new BadRequestException('Email je obavezan.');
      if (nextEmail !== user.email) {
        const taken = await this.prisma.user.findUnique({
          where: { email: nextEmail },
          select: { id: true },
        });
        if (taken) throw new ConflictException('Email je već u upotrebi.');
      }
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.email !== undefined && {
          email: dto.email.trim(),
          isEmailVerified: dto.email.trim() === user.email ? user.isEmailVerified : false,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
      },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async assignRole(userId: string, dto: AssignRoleDto, roles: string[]) {
    this.requireAdminOrOwner(roles);
    if (dto.role === 'STYLIST') {
      throw new BadRequestException(
        'Rola Stilist se dodjeljuje automatski kada korisnik bude dodat u Stylists (kreiranjem profila stilista). Ne možete je ručno dodati ovdje.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const role = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!role) throw new NotFoundException(`Rola ${dto.role} nije pronađena.`);
    const existing = user.userRoles.find((ur) => ur.role.name === dto.role);
    if (existing) return user;
    await this.prisma.userRole.create({ data: { userId, roleId: role.id } });
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async removeRole(userId: string, roleName: string, roles: string[]) {
    this.requireAdminOrOwner(roles);
    if (roleName === 'STYLIST') {
      throw new BadRequestException(
        'Rolu Stilist ne možete ukloniti ovdje. Uklonite korisnika iz Stylists (obrišite ili deaktivirajte profil stilista) da bi rola bila uklonjena.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const userRole = user.userRoles.find((ur) => ur.role.name === roleName);
    if (!userRole) throw new NotFoundException('Korisnik nema tu rol u.');
    await this.prisma.userRole.delete({ where: { id: userRole.id } });
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async getClientAnalytics(
    userId: string,
    roles: string[],
    fromDate?: string,
    toDate?: string,
  ) {
    this.requireAdminOrOwner(roles);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');

    const dateFilter =
      fromDate && toDate
        ? {
            reservationDate: {
              gte: new Date(fromDate),
              lte: new Date(toDate),
            } as const,
          }
        : {};
    const dailyLogDateFilter =
      fromDate && toDate
        ? { date: { gte: new Date(fromDate), lte: new Date(toDate) } as const }
        : {};
    const reviewDateFilter =
      fromDate && toDate
        ? {
            createdAt: {
              gte: new Date(fromDate),
              lte: new Date(toDate),
            } as const,
          }
        : {};

    const [reservations, reviews, cancellationData, manualEntries] =
      await Promise.all([
        this.prisma.reservation.findMany({
          where: { clientId: userId, ...dateFilter },
          include: {
            service: { select: { id: true, name: true, price: true } },
            confirmedStylist: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, username: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.review.findMany({
          where: { userId, ...reviewDateFilter },
          include: {
            service: { select: { name: true } },
            stylist: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, username: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.clientCancellationCount.findUnique({ where: { userId } }),
        this.prisma.dailyLogEntry.findMany({
          where: { clientId: userId, ...dailyLogDateFilter },
          include: {
            service: { select: { id: true, name: true, price: true } },
            stylistProfile: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, username: true },
                },
              },
            },
          },
          orderBy: { date: 'desc' },
        }),
      ]);

    const totalReservations = reservations.length;
    const completedReservations = reservations.filter(
      (r) => r.status === 'COMPLETED',
    ).length;
    const cancelledReservations = reservations.filter((r) =>
      r.status.startsWith('CANCELLED'),
    ).length;
    const noShowCount = reservations.filter(
      (r) => r.status === 'NO_SHOW',
    ).length;

    const reservationSpent = reservations
      .filter((r) => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + Number(r.service?.price ?? 0), 0);
    const manualSpent = manualEntries.reduce(
      (sum, e) => sum + Number(e.actualPrice ?? 0),
      0,
    );
    const totalSpent = reservationSpent + manualSpent;

    const serviceCounts: Record<
      string,
      { name: string; count: number; totalSpent: number }
    > = {};
    for (const r of reservations.filter((r) => r.status === 'COMPLETED')) {
      const svcId = r.serviceId;
      if (!serviceCounts[svcId])
        serviceCounts[svcId] = {
          name: r.service?.name ?? '-',
          count: 0,
          totalSpent: 0,
        };
      serviceCounts[svcId].count++;
      serviceCounts[svcId].totalSpent += Number(r.service?.price ?? 0);
    }
    for (const e of manualEntries) {
      const svcId = e.serviceId;
      if (!serviceCounts[svcId])
        serviceCounts[svcId] = {
          name: e.service?.name ?? '-',
          count: 0,
          totalSpent: 0,
        };
      serviceCounts[svcId].count++;
      serviceCounts[svcId].totalSpent += Number(e.actualPrice ?? 0);
    }
    const topServices = Object.values(serviceCounts).sort(
      (a, b) => b.count - a.count,
    );

    const avgServiceRating =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.serviceRating, 0) / reviews.length
        : null;

    const isPenalized = cancellationData?.penaltyUntil
      ? new Date(cancellationData.penaltyUntil) > new Date()
      : false;

    return {
      user,
      fromDate: fromDate ?? null,
      toDate: toDate ?? null,
      stats: {
        totalReservations,
        completedReservations,
        cancelledReservations,
        noShowCount,
        totalSpent,
        manualEntryCount: manualEntries.length,
        manualSpent,
        avgServiceRating: avgServiceRating
          ? Math.round(avgServiceRating * 10) / 10
          : null,
        reviewCount: reviews.length,
      },
      penalty: {
        cancellationCount: cancellationData?.cancellationCount ?? 0,
        penaltyUntil: cancellationData?.penaltyUntil ?? null,
        isPenalized,
      },
      topServices,
      reservations,
      reviews,
      manualEntries,
    };
  }

  private isAdminOrOwner(roles: string[]) {
    return roles.includes('SYSTEM_ADMIN') || roles.includes('OWNER');
  }

  private requireAdminOrOwner(roles: string[]) {
    if (!this.isAdminOrOwner(roles))
      throw new ForbiddenException('Samo administrator ili vlasnik.');
  }

  private normalizeUsername(input: string): string {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.\s]/g, '')
      .trim()
      .replace(/\s+/g, '.')
      .replace(/\.+/g, '.')
      .replace(/^\./, '')
      .replace(/\.$/, '');
  }

  private async generateUniqueUsername(input: {
    firstName: string;
    lastName: string;
  }): Promise<string> {
    const first = this.normalizeUsername(input.firstName);
    const last = this.normalizeUsername(input.lastName);
    const base = `${first}.${last}`.replace(/\.+/g, '.').replace(/^\./, '').replace(/\.$/, '');
    if (!base) throw new BadRequestException('Nije moguće generisati korisničko ime.');
    const takenBase = await this.prisma.user.findUnique({
      where: { username: base },
      select: { id: true },
    });
    if (!takenBase) return base;
    let suffix = 2;
    while (suffix < 10000) {
      const candidate = `${base}${suffix}`;
      const taken = await this.prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
      suffix += 1;
    }
    throw new ConflictException('Nije moguće automatski generisati korisničko ime.');
  }

  private async generateUsernameSuggestions(base: string, count: number) {
    const suggestions: string[] = [];
    let suffix = 2;
    while (suggestions.length < count && suffix < 10000) {
      const candidate = `${base}${suffix}`;
      const existing = await this.prisma.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });
      if (!existing) suggestions.push(candidate);
      suffix += 1;
    }
    return suggestions;
  }
}
