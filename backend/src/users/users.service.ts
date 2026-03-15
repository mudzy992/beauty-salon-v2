import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
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
        stylistProfile: { include: { stylistServices: { include: { service: true } }, workingHours: true } },
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
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      if (existing.email === dto.email) throw new ConflictException('Email je već u upotrebi.');
      throw new ConflictException('Korisničko ime je već u upotrebi.');
    }
    const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
    if (!role) throw new NotFoundException(`Rola ${dto.role} nije pronađena.`);
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(dto.password, 10);
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
      include: { userRoles: { include: { role: true } } },
    });
    await this.prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });
    return this.prisma.user.findUnique({
      where: { id: user.id },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async update(id: string, dto: UpdateUserDto, currentUser: CurrentUserPayload) {
    if (currentUser.sub !== id && !this.isAdminOrOwner(currentUser.roles)) {
      throw new ForbiddenException('Nemate dozvolu za izmjenu ovog korisnika.');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    if (dto.email && dto.email !== user.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (taken) throw new ConflictException('Email je već u upotrebi.');
    }
    if (dto.username && dto.username !== user.username) {
      const taken = await this.prisma.user.findUnique({ where: { username: dto.username } });
      if (taken) throw new ConflictException('Korisničko ime je već u upotrebi.');
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName != null && { firstName: dto.firstName }),
        ...(dto.lastName != null && { lastName: dto.lastName }),
        ...(dto.email != null && { email: dto.email }),
        ...(dto.username != null && { username: dto.username }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(this.isAdminOrOwner(currentUser.roles) && dto.isActive !== undefined && { isActive: dto.isActive }),
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
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { userRoles: { include: { role: true } } } });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const role = await this.prisma.role.findUnique({ where: { name: dto.role } });
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
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { userRoles: { include: { role: true } } } });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const userRole = user.userRoles.find((ur) => ur.role.name === roleName);
    if (!userRole) throw new NotFoundException('Korisnik nema tu rol u.');
    await this.prisma.userRole.delete({ where: { id: userRole.id } });
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async getClientAnalytics(userId: string, roles: string[]) {
    this.requireAdminOrOwner(roles);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, username: true, email: true, firstName: true, lastName: true,
        phone: true, isActive: true, createdAt: true,
        userRoles: { include: { role: true } },
      },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');

    const [reservations, reviews, cancellationData, manualEntries] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { clientId: userId },
        include: {
          service: { select: { id: true, name: true, price: true } },
          confirmedStylist: { include: { user: { select: { firstName: true, lastName: true, username: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.review.findMany({
        where: { userId },
        include: {
          service: { select: { name: true } },
          stylist: { include: { user: { select: { firstName: true, lastName: true, username: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.clientCancellationCount.findUnique({ where: { userId } }),
      this.prisma.dailyLogEntry.findMany({
        where: { clientId: userId },
        include: {
          service: { select: { id: true, name: true, price: true } },
          stylistProfile: { include: { user: { select: { firstName: true, lastName: true, username: true } } } },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    const totalReservations = reservations.length;
    const completedReservations = reservations.filter((r) => r.status === 'COMPLETED').length;
    const cancelledReservations = reservations.filter((r) => r.status.startsWith('CANCELLED')).length;
    const noShowCount = reservations.filter((r) => r.status === 'NO_SHOW').length;

    const reservationSpent = reservations
      .filter((r) => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + Number(r.service?.price ?? 0), 0);
    const manualSpent = manualEntries.reduce((sum, e) => sum + Number(e.actualPrice ?? 0), 0);
    const totalSpent = reservationSpent + manualSpent;

    const serviceCounts: Record<string, { name: string; count: number; totalSpent: number }> = {};
    for (const r of reservations.filter((r) => r.status === 'COMPLETED')) {
      const svcId = r.serviceId;
      if (!serviceCounts[svcId]) serviceCounts[svcId] = { name: r.service?.name ?? '-', count: 0, totalSpent: 0 };
      serviceCounts[svcId].count++;
      serviceCounts[svcId].totalSpent += Number(r.service?.price ?? 0);
    }
    for (const e of manualEntries) {
      const svcId = e.serviceId;
      if (!serviceCounts[svcId]) serviceCounts[svcId] = { name: e.service?.name ?? '-', count: 0, totalSpent: 0 };
      serviceCounts[svcId].count++;
      serviceCounts[svcId].totalSpent += Number(e.actualPrice ?? 0);
    }
    const topServices = Object.values(serviceCounts).sort((a, b) => b.count - a.count);

    const avgServiceRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.serviceRating, 0) / reviews.length : null;

    const isPenalized = cancellationData?.penaltyUntil ? new Date(cancellationData.penaltyUntil) > new Date() : false;

    return {
      user,
      stats: {
        totalReservations,
        completedReservations,
        cancelledReservations,
        noShowCount,
        totalSpent,
        manualEntryCount: manualEntries.length,
        manualSpent,
        avgServiceRating: avgServiceRating ? Math.round(avgServiceRating * 10) / 10 : null,
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
    if (!this.isAdminOrOwner(roles)) throw new ForbiddenException('Samo administrator ili vlasnik.');
  }
}
