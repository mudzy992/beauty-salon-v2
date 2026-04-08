import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RemoveStylistRoleDto } from './dto/remove-stylist-role.dto';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  private static readonly DEFAULT_INITIAL_PASSWORD = 'Init2026!';
  private static readonly CLIENT_ROLE = 'CLIENT';

  constructor(private readonly repo: UsersRepository) {}

  /** Lista korisnika za odabir klijenta u dnevnoj knjizi (stilist ili admin). */
  async findForDailyLog(roles: string[]) {
    if (!this.isAdminOrOwner(roles) && !roles.includes('STYLIST')) {
      throw new ForbiddenException('Nemate dozvolu.');
    }
    return this.repo.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, firstName: true, lastName: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  async findAll(
    roles: string[],
    pagination?: { page?: number; pageSize?: number },
  ) {
    this.requireAdminOrOwner(roles);
    const where = {};
    const hasPagination =
      pagination?.page != null && pagination?.pageSize != null;
    if (!hasPagination) {
      return this.repo.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: { include: { role: true } },
          stylistProfile: true,
        },
      });
    }
    const page = Math.max(0, pagination?.page ?? 0);
    const pageSize = Math.min(100, Math.max(1, pagination?.pageSize ?? 10));
    const [items, total] = await Promise.all([
      this.repo.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          userRoles: { include: { role: true } },
          stylistProfile: true,
        },
        skip: page * pageSize,
        take: pageSize,
      }),
      this.repo.user.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async findSystemAdmins(roles: string[]) {
    this.requireAdminOrOwner(roles);
    return this.repo.user.findMany({
      where: {
        userRoles: { some: { role: { name: 'SYSTEM_ADMIN' } } },
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        userRoles: { include: { role: true } },
        stylistProfile: true,
      },
    });
  }

  async findStylists(roles: string[]) {
    this.requireAdminOrOwner(roles);
    return this.repo.user.findMany({
      where: {
        userRoles: { some: { role: { name: 'STYLIST' } } },
        NOT: { userRoles: { some: { role: { name: 'SYSTEM_ADMIN' } } } },
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        userRoles: { include: { role: true } },
        stylistProfile: true,
      },
    });
  }

  async findStrictClients(
    roles: string[],
    pagination?: { page?: number; pageSize?: number },
    q?: string,
  ) {
    this.requireAdminOrOwner(roles);
    const trimmed = (q ?? '').trim();
    const where = {
      userRoles: {
        some: { role: { name: 'CLIENT' } },
        none: { role: { name: { in: ['SYSTEM_ADMIN', 'STYLIST', 'OWNER'] } } },
      },
      ...(trimmed
        ? {
            OR: [
              { username: { contains: trimmed } },
              { email: { contains: trimmed } },
              { firstName: { contains: trimmed } },
              { lastName: { contains: trimmed } },
            ],
          }
        : {}),
    };
    const hasPagination =
      pagination?.page != null && pagination?.pageSize != null;
    if (!hasPagination) {
      return this.repo.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { userRoles: { include: { role: true } }, stylistProfile: true },
      });
    }
    const page = Math.max(0, pagination?.page ?? 0);
    const pageSize = Math.min(100, Math.max(1, pagination?.pageSize ?? 10));
    const [items, total] = await Promise.all([
      this.repo.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { userRoles: { include: { role: true } }, stylistProfile: true },
        skip: page * pageSize,
        take: pageSize,
      }),
      this.repo.user.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async findOne(id: string, currentUser: CurrentUserPayload) {
    if (currentUser.sub !== id && !this.isAdminOrOwner(currentUser.roles)) {
      throw new ForbiddenException('Nemate dozvolu za pregled ovog korisnika.');
    }
    const user = await this.repo.user.findUnique({
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
    const user = await this.repo.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        genderOnboardingCompleted: true,
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
    const requestedRoleName = (dto.role ?? UsersService.CLIENT_ROLE).trim();
    if (requestedRoleName === 'STYLIST') {
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
    const existingUsername = await this.repo.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existingUsername) {
      throw new ConflictException('Korisničko ime je već u upotrebi.');
    }
    const [requestedRole, clientRole] = await Promise.all([
      this.repo.role.findUnique({ where: { name: requestedRoleName } }),
      this.repo.role.findUnique({ where: { name: UsersService.CLIENT_ROLE } }),
    ]);
    if (!clientRole)
      throw new NotFoundException(`Rola ${UsersService.CLIENT_ROLE} nije pronađena.`);
    if (!requestedRole)
      throw new NotFoundException(`Rola ${requestedRoleName} nije pronađena.`);
    if (!dto.gender) {
      throw new BadRequestException('Spol je obavezan.');
    }
    const initialPassword = dto.password?.trim() || UsersService.DEFAULT_INITIAL_PASSWORD;
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const roleIds = Array.from(
      new Set([
        clientRole.id,
        ...(requestedRoleName !== UsersService.CLIENT_ROLE ? [requestedRole.id] : []),
      ]),
    );
    const user = await this.repo.user.create({
      data: {
        username,
        email: null,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        gender: dto.gender ?? null,
        genderOnboardingCompleted: false,
        avatar: dto.avatar ?? null,
        mustChangePassword: true,
        isEmailVerified: false,
        userRoles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: { userRoles: { include: { role: true } } },
    });
    const fullUser = await this.repo.user.findUnique({
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
    const existing = await this.repo.user.findUnique({
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
    const existing = await this.repo.user.findUnique({
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

  async getUsernameAvailabilityForUserEdit(
    userId: string,
    username: string,
    roles: string[],
  ) {
    this.requireAdminOrOwner(roles);
    return this.getProfileUsernameAvailability(userId, username);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUser: CurrentUserPayload,
  ) {
    if (currentUser.sub !== id && !this.isAdminOrOwner(currentUser.roles)) {
      throw new ForbiddenException('Nemate dozvolu za izmjenu ovog korisnika.');
    }
    const user = await this.repo.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const userWithRoles = await this.repo.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!userWithRoles) throw new NotFoundException('Korisnik nije pronađen.');
    const isClient = userWithRoles.userRoles.some(
      (userRole) => userRole.role.name === UsersService.CLIENT_ROLE,
    );
    const nextGender =
      dto.gender !== undefined ? dto.gender : user.gender ?? null;
    if (isClient && !nextGender) {
      throw new BadRequestException('Spol je obavezan za klijente.');
    }
    if (dto.email && dto.email !== user.email) {
      const taken = await this.repo.user.findUnique({
        where: { email: dto.email },
      });
      if (taken) throw new ConflictException('Email je već u upotrebi.');
    }
    if (dto.username && dto.username !== user.username) {
      const taken = await this.repo.user.findUnique({
        where: { username: dto.username },
      });
      if (taken)
        throw new ConflictException('Korisničko ime je već u upotrebi.');
    }
    const nextEmail = dto.email?.trim() ?? null;
    const shouldResetEmailVerification =
      dto.email !== undefined && nextEmail !== user.email;
    return this.repo.user.update({
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
        ...(dto.gender !== undefined && {
          gender: dto.gender,
          genderOnboardingCompleted: true,
        }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
        ...(this.isAdminOrOwner(currentUser.roles) &&
          dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.repo.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const isClient = user.userRoles.some(
      (userRole) => userRole.role.name === UsersService.CLIENT_ROLE,
    );
    const nextGender =
      dto.gender !== undefined ? dto.gender : user.gender ?? null;
    if (isClient && !nextGender) {
      throw new BadRequestException('Spol je obavezan za klijente.');
    }
    if (dto.email !== undefined) {
      const nextEmail = dto.email?.trim();
      if (!nextEmail) throw new BadRequestException('Email je obavezan.');
      if (nextEmail !== user.email) {
        const taken = await this.repo.user.findUnique({
          where: { email: nextEmail },
          select: { id: true },
        });
        if (taken) throw new ConflictException('Email je već u upotrebi.');
      }
    }
    return this.repo.user.update({
      where: { id: userId },
      data: {
        ...(dto.email !== undefined && {
          email: dto.email.trim(),
          isEmailVerified: dto.email.trim() === user.email ? user.isEmailVerified : false,
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.gender !== undefined && {
          gender: dto.gender,
          genderOnboardingCompleted: true,
        }),
      },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async assignRole(userId: string, dto: AssignRoleDto, roles: string[]) {
    this.requireAdminOrOwner(roles);
    const requestedRoleName = dto.role?.trim();
    if (!requestedRoleName) {
      throw new BadRequestException('Rola je obavezna.');
    }
    const user = await this.repo.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const role = await this.repo.role.findUnique({
      where: { name: requestedRoleName },
    });
    if (!role)
      throw new NotFoundException(`Rola ${requestedRoleName} nije pronađena.`);
    const existing = user.userRoles.find(
      (ur) => ur.role.name === requestedRoleName,
    );
    if (existing) return user;
    await this.repo.userRole.create({ data: { userId, roleId: role.id } });
    if (requestedRoleName === 'STYLIST') {
      const existingProfile = await this.repo.stylistProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!existingProfile) {
        await this.repo.stylistProfile.create({
          data: {
            userId,
            status: 'PENDING',
            isActive: false,
          },
        });
      }
    }
    return this.repo.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async removeRole(userId: string, roleName: string, roles: string[]) {
    this.requireAdminOrOwner(roles);
    if (roleName === UsersService.CLIENT_ROLE) {
      throw new BadRequestException('Rolu Client nije moguće ukloniti.');
    }
    if (roleName === 'STYLIST') {
      throw new BadRequestException(
        'Rolu Stilist uklanjate kroz posebnu akciju (remove-stylist-role) zbog vezanih podataka.',
      );
    }
    const user = await this.repo.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const userRole = user.userRoles.find((ur) => ur.role.name === roleName);
    if (!userRole) throw new NotFoundException('Korisnik nema tu rol u.');
    await this.repo.userRole.delete({ where: { id: userRole.id } });
    return this.repo.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } }, stylistProfile: true },
    });
  }

  async getStylistRemovalPreview(userId: string, roles: string[]) {
    this.requireAdminOrOwner(roles);
    const user = await this.repo.user.findUnique({
      where: { id: userId },
      include: { stylistProfile: { select: { id: true } } },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const stylistProfileId = user.stylistProfile?.id;
    if (!stylistProfileId)
      throw new NotFoundException('Korisnik nema profil stiliste.');
    const [dailyLogEntriesCount, confirmedReservationsCount, reservationResponsesCount, reviewsCount] =
      await Promise.all([
        this.repo.dailyLogEntry.count({ where: { stylistProfileId } }),
        this.repo.reservation.count({ where: { confirmedStylistId: stylistProfileId } }),
        this.repo.reservationStylistResponse.count({ where: { stylistProfileId } }),
        this.repo.review.count({ where: { stylistProfileId } }),
      ]);
    return {
      stylistProfileId,
      counts: {
        dailyLogEntriesCount,
        confirmedReservationsCount,
        reservationResponsesCount,
        reviewsCount,
      },
    };
  }

  async removeStylistRole(
    userId: string,
    dto: RemoveStylistRoleDto,
    roles: string[],
  ) {
    this.requireAdminOrOwner(roles);
    const user = await this.repo.user.findUnique({
      where: { id: userId },
      include: { stylistProfile: { select: { id: true } }, userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundException('Korisnik nije pronađen.');
    const stylistProfileId = user.stylistProfile?.id;
    if (!stylistProfileId)
      throw new NotFoundException('Korisnik nema profil stiliste.');

    const validateTransferTarget = async (category: { mode: string; targetStylistProfileId?: string }) => {
      if (category.mode !== 'TRANSFER') return null;
      const targetId = category.targetStylistProfileId?.trim();
      if (!targetId) throw new BadRequestException('Nedostaje targetStylistProfileId.');
      if (targetId === stylistProfileId) {
        throw new BadRequestException('Target stilist ne može biti isti stilist.');
      }
      const target = await this.repo.stylistProfile.findUnique({
        where: { id: targetId },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Target stilist nije pronađen.');
      return targetId;
    };

    const dailyLogsTarget = await validateTransferTarget(dto.dailyLogs);
    const confirmedReservationsTarget = await validateTransferTarget(dto.confirmedReservations);
    const reservationResponsesTarget = await validateTransferTarget(dto.reservationResponses);
    const reviewsTarget = await validateTransferTarget(dto.reviews);

    return this.repo.transaction(async (tx) => {
      if (dto.dailyLogs.mode === 'DELETE') {
        await tx.dailyLogEntry.deleteMany({ where: { stylistProfileId } });
      } else if (dailyLogsTarget) {
        await tx.dailyLogEntry.updateMany({
          where: { stylistProfileId },
          data: { stylistProfileId: dailyLogsTarget },
        });
      }

      if (dto.confirmedReservations.mode === 'DELETE') {
        await tx.reservation.updateMany({
          where: { confirmedStylistId: stylistProfileId },
          data: { confirmedStylistId: null },
        });
      } else if (confirmedReservationsTarget) {
        await tx.reservation.updateMany({
          where: { confirmedStylistId: stylistProfileId },
          data: { confirmedStylistId: confirmedReservationsTarget },
        });
      }

      if (dto.reviews.mode === 'DELETE') {
        await tx.review.deleteMany({ where: { stylistProfileId } });
      } else if (reviewsTarget) {
        await tx.review.updateMany({
          where: { stylistProfileId },
          data: { stylistProfileId: reviewsTarget },
        });
      }

      if (dto.reservationResponses.mode === 'DELETE') {
        await tx.reservationStylistResponse.deleteMany({
          where: { stylistProfileId },
        });
      } else if (reservationResponsesTarget) {
        const responses = await tx.reservationStylistResponse.findMany({
          where: { stylistProfileId },
          select: { id: true, reservationId: true },
        });
        for (const r of responses) {
          const existsOnTarget = await tx.reservationStylistResponse.findUnique({
            where: {
              reservationId_stylistProfileId: {
                reservationId: r.reservationId,
                stylistProfileId: reservationResponsesTarget,
              },
            },
            select: { id: true },
          });
          if (existsOnTarget) {
            await tx.reservationStylistResponse.delete({ where: { id: r.id } });
            continue;
          }
          await tx.reservationStylistResponse.update({
            where: { id: r.id },
            data: { stylistProfileId: reservationResponsesTarget },
          });
        }
      }

      const stylistRole = await tx.role.findUnique({
        where: { name: 'STYLIST' },
        select: { id: true },
      });
      if (stylistRole) {
        await tx.userRole.deleteMany({
          where: { userId, roleId: stylistRole.id },
        });
      }

      await tx.stylistProfile.delete({ where: { id: stylistProfileId } });

      return tx.user.findUnique({
        where: { id: userId },
        include: { userRoles: { include: { role: true } }, stylistProfile: true },
      });
    });
  }

  async getClientAnalytics(
    userId: string,
    roles: string[],
    fromDate?: string,
    toDate?: string,
  ) {
    this.requireAdminOrOwner(roles);
    const user = await this.repo.user.findUnique({
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

    const [reservations, reviews, cancellationData, manualEntries, incomeManualEntries] =
      await Promise.all([
        this.repo.reservation.findMany({
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
        this.repo.review.findMany({
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
        this.repo.clientCancellationCount.findUnique({ where: { userId } }),
        this.repo.dailyLogEntry.findMany({
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
        this.repo.incomeBookManualEntry.findMany({
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

    const combinedManualEntries = [
      ...(manualEntries ?? []),
      ...(incomeManualEntries ?? []).map((e) => ({
        id: e.id,
        date: e.date,
        serviceId: e.serviceId,
        actualPrice: e.amount,
        tipAmount: e.tipAmount,
        isManual: true,
        notes: e.notes ?? null,
        status: 'COMPLETED',
        service: e.service,
        stylistProfile: e.stylistProfile,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
    const manualSpent = combinedManualEntries.reduce(
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
    for (const e of combinedManualEntries) {
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
        manualEntryCount: combinedManualEntries.length,
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
      manualEntries: combinedManualEntries,
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
    const takenBase = await this.repo.user.findUnique({
      where: { username: base },
      select: { id: true },
    });
    if (!takenBase) return base;
    let suffix = 2;
    while (suffix < 10000) {
      const candidate = `${base}${suffix}`;
      const taken = await this.repo.user.findUnique({
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
      const existing = await this.repo.user.findUnique({
        where: { username: candidate },
        select: { id: true },
      });
      if (!existing) suggestions.push(candidate);
      suffix += 1;
    }
    return suggestions;
  }
}
