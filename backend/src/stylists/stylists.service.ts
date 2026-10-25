import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  DEFAULT_API_PAGE_LIMIT,
  MAX_API_PAGE_LIMIT,
  MAX_API_PAGE_OFFSET,
} from '../common/pagination.constants';
import {
  analyticsDateBounds,
  resolveAnalyticsDateRange,
} from '../common/analytics-date-range';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStylistProfileDto } from './dto/create-stylist-profile.dto';
import { UpdateStylistProfileDto } from './dto/update-stylist-profile.dto';
import { StylistWorkingHoursDto } from './dto/stylist-working-hours.dto';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { EventsGateway } from '../events/events.gateway';
import { parseDateOnlyString } from '../common/utils/date-only';

const parseDateOnlyInput = (value: string): Date => {
  try {
    return parseDateOnlyString(value);
  } catch {
    throw new BadRequestException('Datum mora biti validan YYYY-MM-DD.');
  }
};

@Injectable()
export class StylistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async findAll(
    activeOnly = false,
    pagination: { page: number; pageSize: number } = {
      page: 0,
      pageSize: DEFAULT_API_PAGE_LIMIT,
    },
  ) {
    const where = activeOnly ? { isActive: true } : {};
    const page = pagination.page;
    const pageSize = pagination.pageSize;
    const offset = page * pageSize;
    if (
      !Number.isSafeInteger(page) ||
      page < 0 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_API_PAGE_LIMIT ||
      !Number.isSafeInteger(offset) ||
      offset > MAX_API_PAGE_OFFSET
    ) {
      throw new BadRequestException(
        'Raspon kataloga stilista prelazi dozvoljeni limit.',
      );
    }
    const [items, total] = await Promise.all([
      this.prisma.stylistProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
              avatar: true,
              isAvatarPublic: true,
            },
          },
          workingHours: {
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
          stylistServices: {
            take: MAX_API_PAGE_LIMIT,
            include: { service: true },
            orderBy: [{ service: { sortOrder: 'asc' } }, { serviceId: 'asc' }],
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: pageSize,
      }),
      this.prisma.stylistProfile.count({ where }),
    ]);
    const nextOffset = offset + items.length;
    const hasMore =
      items.length > 0 &&
      total > nextOffset &&
      nextOffset <= MAX_API_PAGE_OFFSET;
    return {
      items: items.map((item) => this.withPublicAvatar(item)),
      total,
      page,
      pageSize,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    };
  }

  async findOne(id: string, currentUser?: CurrentUserPayload) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            isAvatarPublic: true,
          },
        },
        workingHours: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
        stylistServices: {
          take: MAX_API_PAGE_LIMIT,
          orderBy: [{ service: { sortOrder: 'asc' } }, { serviceId: 'asc' }],
          include: {
            service: {
              include: { subcategory: { include: { category: true } } },
            },
          },
        },
      },
    });
    if (!stylist) throw new NotFoundException('Stilist nije pronađen.');
    return this.withPublicAvatar(stylist);
  }

  async findByUserId(userId: string) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        workingHours: { orderBy: [{ dayOfWeek: 'asc' }] },
        stylistServices: { include: { service: true } },
      },
    });
    if (!stylist) throw new NotFoundException('Stilist nije pronađen.');
    return stylist;
  }

  async create(dto: CreateStylistProfileDto, roles: string[]) {
    this.requireAdminOrOwner(roles);
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const existing = await this.prisma.stylistProfile.findUnique({
      where: { userId: dto.userId },
    });
    if (existing)
      throw new ForbiddenException('Korisnik već ima profil stilista.');
    const stylist = await this.prisma.stylistProfile.create({
      data: {
        userId: dto.userId,
        bio: dto.bio,
        specialization: dto.specialization,
        status: 'ACTIVE',
        isActive: dto.isActive ?? true,
        hireDate: dto.hireDate ? parseDateOnlyInput(dto.hireDate) : null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    this.events.disconnectUserSockets(dto.userId);

    // Automatski dodjeli STYLIST rolu korisniku (ne može se ručno u User managementu)
    const stylistRole = await this.prisma.role.findUnique({
      where: { name: 'STYLIST' },
    });
    if (stylistRole) {
      const existingUserRole = await this.prisma.userRole.findFirst({
        where: { userId: dto.userId, roleId: stylistRole.id },
      });
      if (!existingUserRole) {
        await this.prisma.userRole.create({
          data: { userId: dto.userId, roleId: stylistRole.id },
        });
      }
    }

    if (dto.serviceIds?.length) {
      await this.setServices(stylist.id, dto.serviceIds);
    }
    if (dto.workingHours?.length) {
      await this.setWorkingHours(stylist.id, dto.workingHours);
    }
    return this.findOne(stylist.id);
  }

  async update(
    id: string,
    dto: UpdateStylistProfileDto,
    currentUser: CurrentUserPayload,
  ) {
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id },
    });
    if (!stylist) throw new NotFoundException('Stilist nije pronađen.');
    if (
      currentUser.sub !== stylist.userId &&
      !this.isAdminOrOwner(currentUser.roles)
    ) {
      throw new ForbiddenException('Nemate dozvolu za izmjenu ovog profila.');
    }
    const shouldAllowAdminFields = this.isAdminOrOwner(currentUser.roles);
    const nextIsActive =
      shouldAllowAdminFields && dto.isActive !== undefined
        ? dto.isActive
        : shouldAllowAdminFields &&
            dto.status === 'ACTIVE' &&
            dto.isActive === undefined
          ? true
          : stylist.isActive;
    const nextStatus =
      shouldAllowAdminFields && dto.status !== undefined
        ? dto.status
        : stylist.status;
    const socketAccessChanged =
      (stylist.isActive && stylist.status === 'ACTIVE') !==
      (nextIsActive && nextStatus === 'ACTIVE');

    await this.prisma.stylistProfile.update({
      where: { id },
      data: {
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.specialization !== undefined && {
          specialization: dto.specialization,
        }),
        ...(shouldAllowAdminFields &&
          dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(shouldAllowAdminFields &&
          dto.status !== undefined && {
            status: dto.status,
            ...(dto.status === 'ACTIVE' && dto.isActive === undefined
              ? { isActive: true }
              : {}),
          }),
        ...(dto.hireDate !== undefined && {
          hireDate: dto.hireDate ? parseDateOnlyInput(dto.hireDate) : null,
        }),
      },
    });
    if (socketAccessChanged) {
      this.events.disconnectUserSockets(stylist.userId);
    }
    if (dto.serviceIds) await this.setServices(id, dto.serviceIds);
    if (dto.workingHours) await this.setWorkingHours(id, dto.workingHours);
    return this.findOne(id);
  }

  async remove(id: string, roles: string[]) {
    this.requireAdminOrOwner(roles);
    const stylist = await this.prisma.stylistProfile.findUnique({
      where: { id },
    });
    if (!stylist) throw new NotFoundException('Stilist nije pronađen.');
    const userId = stylist.userId;
    await this.prisma.stylistProfile.delete({ where: { id } });
    this.events.disconnectUserSockets(userId);
    // Ukloni STYLIST rolu korisniku kad više nema profil stilista
    const stylistRole = await this.prisma.role.findUnique({
      where: { name: 'STYLIST' },
    });
    if (stylistRole) {
      await this.prisma.userRole.deleteMany({
        where: { userId, roleId: stylistRole.id },
      });
    }
    return { deleted: true };
  }

  async setWorkingHours(
    stylistProfileId: string,
    hours: StylistWorkingHoursDto[],
  ) {
    const data = hours.map((h) => ({
      stylistProfileId,
      dayOfWeek: h.dayOfWeek,
      dateOverride: h.dateOverride ? parseDateOnlyInput(h.dateOverride) : null,
      startTime: h.startTime,
      endTime: h.endTime,
      isWorkingDay: h.isWorkingDay ?? true,
    }));
    await this.findOne(stylistProfileId);
    await this.prisma.stylistWorkingHours.deleteMany({
      where: { stylistProfileId },
    });
    if (data.length) {
      await this.prisma.stylistWorkingHours.createMany({
        data,
      });
    }
    return this.prisma.stylistWorkingHours.findMany({
      where: { stylistProfileId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getWorkingHours(stylistProfileId: string) {
    await this.findOne(stylistProfileId);
    return this.prisma.stylistWorkingHours.findMany({
      where: { stylistProfileId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async setServices(stylistProfileId: string, serviceIds: string[]) {
    await this.findOne(stylistProfileId);
    await this.prisma.stylistService.deleteMany({
      where: { stylistProfileId },
    });
    if (serviceIds.length) {
      await this.prisma.stylistService.createMany({
        data: serviceIds.map((serviceId) => ({ stylistProfileId, serviceId })),
      });
    }
    return this.prisma.stylistService.findMany({
      where: { stylistProfileId },
      include: { service: true },
    });
  }

  async getServices(
    stylistProfileId: string,
    pagination: { page: number; pageSize: number } = {
      page: 0,
      pageSize: DEFAULT_API_PAGE_LIMIT,
    },
  ) {
    const page = pagination.page;
    const pageSize = pagination.pageSize;
    const offset = page * pageSize;
    if (
      !Number.isSafeInteger(page) ||
      page < 0 ||
      !Number.isSafeInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_API_PAGE_LIMIT ||
      !Number.isSafeInteger(offset) ||
      offset > MAX_API_PAGE_OFFSET
    ) {
      throw new BadRequestException(
        'Raspon servisa stiliste prelazi dozvoljeni limit.',
      );
    }

    const profile = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      select: { id: true },
    });
    if (!profile) throw new NotFoundException('Stilist nije pronađen.');

    const where = { stylistProfileId };
    const [items, total] = await Promise.all([
      this.prisma.stylistService.findMany({
        where,
        include: {
          service: { include: { subcategory: { include: { category: true } } } },
        },
        orderBy: [{ service: { sortOrder: 'asc' } }, { serviceId: 'asc' }],
        skip: offset,
        take: pageSize,
      }),
      this.prisma.stylistService.count({ where }),
    ]);
    const nextOffset = offset + items.length;
    const hasMore =
      items.length > 0 &&
      total > nextOffset &&
      nextOffset <= MAX_API_PAGE_OFFSET;
    return {
      items,
      total,
      page,
      pageSize,
      hasMore,
      nextPage: hasMore ? page + 1 : null,
    };
  }

  async getStylistAnalytics(
    stylistProfileId: string,
    roles: string[],
    fromDate?: string,
    toDate?: string,
  ) {
    this.requireAdminOrOwner(roles);
    const analyticsRange = resolveAnalyticsDateRange(fromDate, toDate);
    const dateFilter = analyticsDateBounds(analyticsRange);
    const profile = await this.prisma.stylistProfile.findUnique({
      where: { id: stylistProfileId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('Stilist nije pronađen.');

    const [fromReservations, fromDailyLog, fromManualIncome] =
      await Promise.all([
        this.prisma.reservation.findMany({
          where: {
            confirmedStylistId: stylistProfileId,
            status: 'COMPLETED',
            ...(Object.keys(dateFilter).length
              ? { reservationDate: dateFilter }
              : {}),
          },
          include: {
            service: { select: { id: true, name: true, price: true } },
            client: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { reservationDate: 'desc' },
          take: 100,
        }),
        this.prisma.dailyLogEntry.findMany({
          where: {
            stylistProfileId,
            status: 'COMPLETED',
            deletedAt: null,
            ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
          },
          include: {
            service: { select: { id: true, name: true } },
            client: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { date: 'desc' },
          take: 100,
        }),
        this.prisma.incomeBookManualEntry.findMany({
          where: {
            stylistProfileId,
            ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
          },
          include: { service: { select: { id: true, name: true } } },
          orderBy: { date: 'desc' },
          take: 100,
        }),
      ]);

    const completedCount =
      fromReservations.length + fromDailyLog.length + fromManualIncome.length;
    const revenue =
      fromReservations.reduce((s, r) => s + Number(r.service?.price ?? 0), 0) +
      fromDailyLog.reduce((s, e) => s + Number(e.actualPrice ?? 0), 0) +
      fromManualIncome.reduce((s, m) => s + Number(m.amount ?? 0), 0);
    const tips =
      fromDailyLog.reduce((s, e) => s + Number(e.tipAmount ?? 0), 0) +
      fromManualIncome.reduce((s, m) => s + Number(m.tipAmount ?? 0), 0);

    const byService = new Map<
      string,
      { name: string; count: number; revenue: number }
    >();
    for (const r of fromReservations) {
      const id = r.serviceId;
      const name = r.service?.name ?? '—';
      const amt = Number(r.service?.price ?? 0);
      if (!byService.has(id)) byService.set(id, { name, count: 0, revenue: 0 });
      const row = byService.get(id)!;
      row.count++;
      row.revenue += amt;
    }
    for (const e of fromDailyLog) {
      const id = e.serviceId;
      const name = e.service?.name ?? '—';
      const amt = Number(e.actualPrice ?? 0);
      if (!byService.has(id)) byService.set(id, { name, count: 0, revenue: 0 });
      const row = byService.get(id)!;
      row.count++;
      row.revenue += amt;
    }
    for (const m of fromManualIncome) {
      const id = m.serviceId;
      const name = m.service?.name ?? '—';
      const amt = Number(m.amount ?? 0);
      if (!byService.has(id)) byService.set(id, { name, count: 0, revenue: 0 });
      const row = byService.get(id)!;
      row.count++;
      row.revenue += amt;
    }
    const topServices = Array.from(byService.entries())
      .map(([serviceId, v]) => ({
        serviceId,
        serviceName: v.name,
        count: v.count,
        revenue: Math.round(v.revenue * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const stylistName =
      [profile.user?.firstName, profile.user?.lastName]
        .filter(Boolean)
        .join(' ') ||
      profile.user?.username ||
      '—';

    return {
      stylist: { id: profile.id, name: stylistName, user: profile.user },
      fromDate: analyticsRange.fromDate,
      toDate: analyticsRange.toDate,
      completedCount,
      revenue: Math.round(revenue * 100) / 100,
      tips: Math.round(tips * 100) / 100,
      topServices,
      recentEntries: fromDailyLog.slice(0, 20).map((e) => ({
        id: e.id,
        date: e.date,
        serviceName: e.service?.name,
        clientName:
          [e.client?.firstName, e.client?.lastName].filter(Boolean).join(' ') ||
          null,
        actualPrice: e.actualPrice,
        tipAmount: e.tipAmount,
      })),
    };
  }

  private withPublicAvatar<
    T extends {
      user: {
        id: string;
        avatar: string | null;
        isAvatarPublic: boolean;
      };
    },
  >(stylist: T) {
    if (!stylist.user) return stylist;
    const { isAvatarPublic, ...user } = stylist.user;
    return {
      ...stylist,
      user: {
        ...user,
        avatar: isAvatarPublic ? `/api/users/${user.id}/avatar` : null,
      },
    };
  }

  private isAdminOrOwner(roles: string[]) {
    return roles.includes('SYSTEM_ADMIN') || roles.includes('OWNER');
  }

  private requireAdminOrOwner(roles: string[]) {
    if (!this.isAdminOrOwner(roles))
      throw new ForbiddenException('Samo administrator ili vlasnik.');
  }
}
