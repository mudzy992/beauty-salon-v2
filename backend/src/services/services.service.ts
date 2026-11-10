import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DEFAULT_API_PAGE,
  DEFAULT_API_PAGE_LIMIT,
  MAX_API_PAGE_LIMIT,
  MAX_API_PAGE_OFFSET,
} from '../common/pagination.constants';
import { PrismaService } from '../prisma/prisma.service';
import { withUploadPathReferenceLocks } from '../uploads/upload-reference-lock';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { DeleteServiceDto } from './dto/delete-service.dto';
import { apiError } from '../common/errors/api-error-codes';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private getCatalogOffset(page: number, pageSize: number, label: string) {
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
        `Raspon kataloga ${label} prelazi dozvoljeni limit.`,
      );
    }
    return offset;
  }

  private getCatalogPage<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number,
    offset: number,
  ) {
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

  async getPublicHomeStats() {
    const [servicesCount, clientsCount] = await Promise.all([
      this.prisma.service.count({
        where: {
          isActive: true,
          subcategory: { isActive: true, category: { isActive: true } },
        },
      }),
      this.prisma.user.count({
        where: {
          isActive: true,
          userRoles: {
            some: {
              role: {
                name: 'CLIENT',
              },
            },
          },
        },
      }),
    ]);

    return {
      servicesCount,
      clientsCount,
    };
  }

  async getMostPopularService() {
    const popular = await this.prisma.reservation.groupBy({
      by: ['serviceId'],
      where: {
        status: {
          notIn: ['CANCELLED_BY_CLIENT', 'CANCELLED_BY_STYLISTS', 'NO_SHOW'],
        },
      },
      _count: {
        serviceId: true,
      },
      orderBy: {
        _count: {
          serviceId: 'desc',
        },
      },
      take: 1,
    });

    const top = popular[0];
    if (!top) return null;

    const service = await this.prisma.service.findFirst({
      where: {
        id: top.serviceId,
        isActive: true,
        subcategory: { isActive: true, category: { isActive: true } },
      },
      include: {
        subcategory: { include: { category: true } },
      },
    });

    if (!service) return null;

    return {
      ...this.toPublicService(service),
      reservationsCount: top._count.serviceId,
    };
  }

  async findAllCategories(
    activeOnly = false,
    pagination: { page: number; pageSize: number } = {
      page: DEFAULT_API_PAGE,
      pageSize: DEFAULT_API_PAGE_LIMIT,
    },
  ) {
    const where = activeOnly ? { isActive: true } : undefined;
    const offset = this.getCatalogOffset(
      pagination.page,
      pagination.pageSize,
      'kategorija',
    );
    const [items, total] = await Promise.all([
      this.prisma.serviceCategory.findMany({
        where,
        include: {
          subcategories: {
            ...(activeOnly && { where: { isActive: true } }),
            take: MAX_API_PAGE_LIMIT,
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: offset,
        take: pagination.pageSize,
      }),
      this.prisma.serviceCategory.count({ where }),
    ]);
    return this.getCatalogPage(
      items,
      total,
      pagination.page,
      pagination.pageSize,
      offset,
    );
  }

  async findPublicCategories(
    pagination: { page: number; pageSize: number } = {
      page: DEFAULT_API_PAGE,
      pageSize: DEFAULT_API_PAGE_LIMIT,
    },
  ) {
    return this.findAllCategories(true, pagination);
  }

  async findPublicOneCategory(id: string) {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        sortOrder: true,
        isActive: true,
        subcategories: {
          where: { isActive: true },
          select: {
            id: true,
            categoryId: true,
            name: true,
            description: true,
            sortOrder: true,
            isActive: true,
            services: {
              where: { isActive: true },
              select: {
                id: true,
                subcategoryId: true,
                name: true,
                shortDescription: true,
                heroImage: true,
                durationMinutes: true,
                price: true,
                gender: true,
                sortOrder: true,
              },
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              take: MAX_API_PAGE_LIMIT,
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          take: MAX_API_PAGE_LIMIT,
        },
      },
    });
    if (!category) throw new NotFoundException('Kategorija nije pronađena.');
    return category;
  }

  async findOneCategory(id: string) {
    const cat = await this.prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        subcategories: {
          take: MAX_API_PAGE_LIMIT,
          include: {
            services: {
              take: MAX_API_PAGE_LIMIT,
              orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!cat) throw new NotFoundException('Kategorija nije pronađena.');
    return cat;
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.serviceCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    await this.findOneCategory(id);
    return this.prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async removeCategory(id: string) {
    await this.findOneCategory(id);
    await this.prisma.serviceCategory.delete({ where: { id } });
    return { deleted: true };
  }

  async findAllSubcategories(
    categoryId?: string,
    activeOnly = false,
    pagination: { page: number; pageSize: number } = {
      page: DEFAULT_API_PAGE,
      pageSize: DEFAULT_API_PAGE_LIMIT,
    },
  ) {
    const where: Prisma.ServiceSubcategoryWhereInput = activeOnly
      ? { isActive: true, category: { isActive: true } }
      : {};
    if (categoryId) where.categoryId = categoryId;
    const offset = this.getCatalogOffset(
      pagination.page,
      pagination.pageSize,
      'potkategorija',
    );
    const [items, total] = await Promise.all([
      this.prisma.serviceSubcategory.findMany({
        where,
        include: {
          category: true,
          services: {
            ...(activeOnly && { where: { isActive: true } }),
            take: MAX_API_PAGE_LIMIT,
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { id: 'asc' },
        ],
        skip: offset,
        take: pagination.pageSize,
      }),
      this.prisma.serviceSubcategory.count({ where }),
    ]);
    return this.getCatalogPage(
      items,
      total,
      pagination.page,
      pagination.pageSize,
      offset,
    );
  }

  async findPublicSubcategories(
    categoryId?: string,
    pagination: { page: number; pageSize: number } = {
      page: DEFAULT_API_PAGE,
      pageSize: DEFAULT_API_PAGE_LIMIT,
    },
  ) {
    const result = await this.findAllSubcategories(
      categoryId,
      true,
      pagination,
    );
    return {
      ...result,
      items: result.items.map((subcategory) => ({
        id: subcategory.id,
        categoryId: subcategory.categoryId,
        name: subcategory.name,
        description: subcategory.description,
        sortOrder: subcategory.sortOrder,
        isActive: subcategory.isActive,
        category: {
          id: subcategory.category.id,
          name: subcategory.category.name,
        },
        services: subcategory.services.map((service) => ({
          id: service.id,
          subcategoryId: service.subcategoryId,
          name: service.name,
          shortDescription: service.shortDescription,
          heroImage: service.heroImage,
          durationMinutes: service.durationMinutes,
          price: service.price,
          gender: service.gender,
          sortOrder: service.sortOrder,
        })),
      })),
    };
  }

  async findPublicOneSubcategory(id: string) {
    const subcategory = await this.prisma.serviceSubcategory.findFirst({
      where: { id, isActive: true, category: { isActive: true } },
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        sortOrder: true,
        isActive: true,
        category: { select: { id: true, name: true } },
        services: {
          where: { isActive: true },
          select: {
            id: true,
            subcategoryId: true,
            name: true,
            shortDescription: true,
            heroImage: true,
            durationMinutes: true,
            price: true,
            gender: true,
            sortOrder: true,
          },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          take: MAX_API_PAGE_LIMIT,
        },
      },
    });
    if (!subcategory)
      throw new NotFoundException('Podkategorija nije pronađena.');
    return subcategory;
  }

  async findOneSubcategory(id: string) {
    const sub = await this.prisma.serviceSubcategory.findUnique({
      where: { id },
      include: {
        category: true,
        services: {
          take: MAX_API_PAGE_LIMIT,
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        },
      },
    });
    if (!sub) throw new NotFoundException('Podkategorija nije pronađena.');
    return sub;
  }

  async createSubcategory(dto: CreateSubcategoryDto) {
    await this.prisma.serviceCategory.findUniqueOrThrow({
      where: { id: dto.categoryId },
    });
    return this.prisma.serviceSubcategory.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateSubcategory(id: string, dto: UpdateSubcategoryDto) {
    await this.findOneSubcategory(id);
    return this.prisma.serviceSubcategory.update({
      where: { id },
      data: {
        ...(dto.categoryId != null && { categoryId: dto.categoryId }),
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async removeSubcategory(id: string) {
    await this.findOneSubcategory(id);
    await this.prisma.serviceSubcategory.delete({ where: { id } });
    return { deleted: true };
  }

  async findAllServices(
    subcategoryId?: string,
    activeOnly = false,
    pagination: { page: number; pageSize: number } = {
      page: 0,
      pageSize: DEFAULT_API_PAGE_LIMIT,
    },
  ) {
    const where: Prisma.ServiceWhereInput = activeOnly
      ? {
          isActive: true,
          subcategory: { isActive: true, category: { isActive: true } },
        }
      : {};
    if (subcategoryId) where.subcategoryId = subcategoryId;
    const page = pagination.page;
    const pageSize = pagination.pageSize;
    const offset = this.getCatalogOffset(page, pageSize, 'servisa');
    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: { subcategory: { include: { category: true } } },
        orderBy: [
          { subcategory: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { id: 'asc' },
        ],
        skip: offset,
        take: pageSize,
      }),
      this.prisma.service.count({ where }),
    ]);
    return this.getCatalogPage(items, total, page, pageSize, offset);
  }

  async findPublicServices(
    subcategoryId?: string,
    pagination: { page: number; pageSize: number } = {
      page: 0,
      pageSize: DEFAULT_API_PAGE_LIMIT,
    },
  ) {
    const result = await this.findAllServices(subcategoryId, true, pagination);
    return {
      ...result,
      items: result.items.map((service) => this.toPublicService(service)),
    };
  }

  async findPublicOneService(id: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id,
        isActive: true,
        subcategory: { isActive: true, category: { isActive: true } },
      },
      include: { subcategory: { include: { category: true } } },
    });
    if (!service) throw new NotFoundException(apiError('RESERVE_SERVICE_UNAVAILABLE'));
    return this.toPublicService(service);
  }

  async findOneService(id: string) {
    const svc = await this.prisma.service.findUnique({
      where: { id },
      include: {
        subcategory: { include: { category: true } },
      },
    });
    if (!svc) throw new NotFoundException(apiError('RESERVE_SERVICE_UNAVAILABLE'));
    return svc;
  }

  async createService(dto: CreateServiceDto) {
    await this.prisma.serviceSubcategory.findUniqueOrThrow({
      where: { id: dto.subcategoryId },
    });
    const data = {
      subcategoryId: dto.subcategoryId,
      name: dto.name,
      shortDescription: dto.shortDescription,
      heroImage: dto.heroImage,
      durationMinutes: dto.durationMinutes,
      price: new Prisma.Decimal(dto.price),
      gender: dto.gender,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
      loyaltyEnabled: dto.loyaltyEnabled ?? false,
      loyaltyMaxDiscountPercent: dto.loyaltyMaxDiscountPercent ?? 0,
    };
    return withUploadPathReferenceLocks(
      this.prisma,
      [data.heroImage],
      (tx) => tx.service.create({ data }),
      () => this.prisma.service.create({ data }),
    );
  }

  async updateService(id: string, dto: UpdateServiceDto) {
    await this.findOneService(id);
    const data = {
      ...(dto.subcategoryId != null && { subcategoryId: dto.subcategoryId }),
      ...(dto.name != null && { name: dto.name }),
      ...(dto.shortDescription !== undefined && {
        shortDescription: dto.shortDescription,
      }),
      ...(dto.heroImage !== undefined && { heroImage: dto.heroImage }),
      ...(dto.durationMinutes != null && {
        durationMinutes: dto.durationMinutes,
      }),
      ...(dto.price != null && { price: new Prisma.Decimal(dto.price) }),
      ...(dto.gender != null && { gender: dto.gender }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.sortOrder != null && { sortOrder: dto.sortOrder }),
      ...(dto.loyaltyEnabled !== undefined && {
        loyaltyEnabled: dto.loyaltyEnabled,
      }),
      ...(dto.loyaltyMaxDiscountPercent != null && {
        loyaltyMaxDiscountPercent: dto.loyaltyMaxDiscountPercent,
      }),
    };
    return withUploadPathReferenceLocks(
      this.prisma,
      [data.heroImage],
      (tx) => tx.service.update({ where: { id }, data }),
      () => this.prisma.service.update({ where: { id }, data }),
    );
  }

  private async getServiceMutationSnapshot(
    id: string,
    targetServiceId?: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const source = await db.service.findUnique({
      where: { id },
      select: { id: true, name: true, updatedAt: true, heroImage: true },
    });
    if (!source) throw new NotFoundException('Usluga nije pronađena.');

    let target: { id: string; name: string; updatedAt: Date } | null = null;
    if (targetServiceId) {
      if (targetServiceId === id) {
        throw new BadRequestException('Ciljna usluga mora biti druga usluga.');
      }
      target = await db.service.findUnique({
        where: { id: targetServiceId },
        select: { id: true, name: true, updatedAt: true },
      });
      if (!target) throw new NotFoundException('Ciljna usluga nije pronađena.');
    }

    const [
      primaryReservations,
      reservationItems,
      primaryDailyLogs,
      dailyLogItems,
      manualEntries,
      sourceReviews,
      sourceStylistLinks,
    ] = await Promise.all([
      db.reservation.findMany({
        where: { serviceId: id },
        select: { id: true },
        orderBy: { id: 'asc' },
      }),
      db.reservationServiceItem.findMany({
        where: { serviceId: id },
        select: { id: true, reservationId: true },
        orderBy: { id: 'asc' },
      }),
      db.dailyLogEntry.findMany({
        where: { serviceId: id },
        select: { id: true, status: true, kind: true, reservationId: true },
        orderBy: { id: 'asc' },
      }),
      db.dailyLogEntryServiceItem.findMany({
        where: { serviceId: id },
        select: { id: true, dailyLogEntryId: true },
        orderBy: { id: 'asc' },
      }),
      db.incomeBookManualEntry.findMany({
        where: { serviceId: id },
        select: { id: true, bookId: true, amount: true, tipAmount: true },
        orderBy: { id: 'asc' },
      }),
      db.review.findMany({
        where: { serviceId: id },
        select: { id: true, reservationId: true },
        orderBy: { id: 'asc' },
      }),
      db.stylistService.findMany({
        where: { serviceId: id },
        select: { id: true, stylistProfileId: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    const reservationIds = primaryReservations.map((row) => row.id);
    const outboxReservationIds = [
      ...new Set([
        ...reservationIds,
        ...reservationItems.map((row) => row.reservationId),
      ]),
    ];
    const dailyLogIds = primaryDailyLogs.map((row) => row.id);
    const manualEntryIds = manualEntries.map((row) => row.id);
    const debtWhere: Prisma.ClientDebtWhereInput = {
      OR: [
        { serviceId: id },
        ...(manualEntryIds.length
          ? [{ manualEntryId: { in: manualEntryIds } }]
          : []),
        ...(reservationIds.length
          ? [{ reservationId: { in: reservationIds } }]
          : []),
        ...(dailyLogIds.length
          ? [{ dailyLogEntryId: { in: dailyLogIds } }]
          : []),
      ],
    };
    const debts = await db.clientDebt.findMany({
      where: debtWhere,
      select: { id: true, status: true, amount: true },
      orderBy: { id: 'asc' },
    });
    const debtIds = debts.map((debt) => debt.id);
    const debtPaymentLogs = debtIds.length
      ? await db.dailyLogEntry.findMany({
          where: { debtId: { in: debtIds } },
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      : [];
    const affectedDailyLogIds = [
      ...new Set([...dailyLogIds, ...debtPaymentLogs.map((row) => row.id)]),
    ];
    const dailyLogImages = affectedDailyLogIds.length
      ? await db.dailyLogImage.findMany({
          where: { dailyLogEntryId: { in: affectedDailyLogIds } },
          select: { id: true },
          orderBy: { id: 'asc' },
        })
      : [];
    const pendingOutboxEvents: {
      id: string;
      eventType: string;
      aggregateId: string;
      status: string;
      payload: Prisma.JsonValue;
    }[] =
      outboxReservationIds.length || affectedDailyLogIds.length
        ? await db.outboxEvent.findMany({
            where: {
              aggregateId: {
                in: [...outboxReservationIds, ...affectedDailyLogIds],
              },
              status: { in: ['PENDING', 'PROCESSING'] },
            },
            select: {
              id: true,
              eventType: true,
              aggregateId: true,
              status: true,
              payload: true,
            },
            orderBy: { id: 'asc' },
          })
        : [];
    const consentRecordsRetained = dailyLogImages.length
      ? await db.dailyLogImageConsent.count({
          where: {
            dailyLogImageId: { in: dailyLogImages.map((image) => image.id) },
          },
        })
      : 0;
    const autoIncome = affectedDailyLogIds.length
      ? await db.incomeBookEntry.aggregate({
          where: { dailyLogEntryId: { in: affectedDailyLogIds } },
          _sum: { amount: true, tipAmount: true },
          _count: { _all: true },
        })
      : { _sum: { amount: null, tipAmount: null }, _count: { _all: 0 } };

    let reservationItemConflicts = 0;
    let dailyLogItemConflicts = 0;
    let dailyLogReservationConflicts = 0;
    let reviewConflicts = 0;
    const duplicateStylistProfileIds: string[] = [];
    if (target) {
      const sourceItemReservationIds = [
        ...new Set([
          ...reservationIds,
          ...reservationItems.map((row) => row.reservationId),
        ]),
      ];
      const sourceLogItemIds = [
        ...new Set([
          ...dailyLogIds,
          ...dailyLogItems.map((row) => row.dailyLogEntryId),
        ]),
      ];
      const sourceReviewReservationIds = [
        ...new Set(
          sourceReviews
            .map((row) => row.reservationId)
            .filter((value): value is string => value !== null),
        ),
      ];
      const targetReservationItems = sourceItemReservationIds.length
        ? await db.reservationServiceItem.findMany({
            where: {
              serviceId: target.id,
              reservationId: { in: sourceItemReservationIds },
            },
            select: { reservationId: true },
          })
        : [];
      const targetPrimaryReservations = sourceItemReservationIds.length
        ? await db.reservation.findMany({
            where: {
              id: { in: sourceItemReservationIds },
              serviceId: target.id,
            },
            select: { id: true },
          })
        : [];
      const targetDailyLogItems = sourceLogItemIds.length
        ? await db.dailyLogEntryServiceItem.findMany({
            where: {
              serviceId: target.id,
              dailyLogEntryId: { in: sourceLogItemIds },
            },
            select: { dailyLogEntryId: true },
          })
        : [];
      const sourceLogParents = sourceLogItemIds.length
        ? await db.dailyLogEntry.findMany({
            where: { id: { in: sourceLogItemIds } },
            select: { reservationId: true, kind: true },
          })
        : [];
      const sourceLogReservationIds = [
        ...new Set(
          sourceLogParents
            .filter((row) => row.kind === 'SERVICE')
            .map((row) => row.reservationId)
            .filter((value): value is string => value !== null),
        ),
      ];
      const targetServiceDailyLogs = sourceLogReservationIds.length
        ? await db.dailyLogEntry.findMany({
            where: {
              serviceId: target.id,
              reservationId: { in: sourceLogReservationIds },
              kind: 'SERVICE',
            },
            select: { reservationId: true },
          })
        : [];
      const targetReviews = sourceReviewReservationIds.length
        ? await db.review.findMany({
            where: {
              serviceId: target.id,
              reservationId: { in: sourceReviewReservationIds },
            },
            select: { reservationId: true },
          })
        : [];
      const targetStylistLinks = await db.stylistService.findMany({
        where: { serviceId: target.id },
        select: { stylistProfileId: true },
      });
      reservationItemConflicts =
        targetReservationItems.length + targetPrimaryReservations.length;
      dailyLogItemConflicts = targetDailyLogItems.length;
      dailyLogReservationConflicts = targetServiceDailyLogs.length;
      reviewConflicts = targetReviews.length;
      const targetStylistProfileIds = new Set(
        targetStylistLinks.map((row) => row.stylistProfileId),
      );
      duplicateStylistProfileIds.push(
        ...sourceStylistLinks
          .map((row) => row.stylistProfileId)
          .filter((profileId) => targetStylistProfileIds.has(profileId)),
      );
    }

    const sum = (rows: { amount: unknown }[]) =>
      rows.reduce((total, row) => total + Number(row.amount ?? 0), 0);
    const sumTips = (rows: { tipAmount: unknown }[]) =>
      rows.reduce((total, row) => total + Number(row.tipAmount ?? 0), 0);
    const openDebts = debts.filter((debt) => debt.status === 'OPEN');
    const impact = {
      service: {
        id: source.id,
        name: source.name,
        imageRetained: Boolean(source.heroImage),
      },
      target: target ? { id: target.id, name: target.name } : null,
      reservations: {
        primary: primaryReservations.length,
        additionalServiceItems: reservationItems.length,
      },
      dailyLogs: {
        primary: primaryDailyLogs.length,
        completed: primaryDailyLogs.filter((row) => row.status === 'COMPLETED')
          .length,
        additionalServiceItems: dailyLogItems.length,
        debtPaymentEntries: debtPaymentLogs.length,
      },
      income: {
        automaticEntries: autoIncome._count._all,
        automaticRevenue: Number(autoIncome._sum.amount ?? 0),
        automaticTips: Number(autoIncome._sum.tipAmount ?? 0),
        manualEntries: manualEntries.length,
        manualRevenue: sum(manualEntries),
        manualTips: sumTips(manualEntries),
      },
      debts: {
        count: debts.length,
        openCount: openDebts.length,
        amount: sum(debts),
        openAmount: sum(openDebts),
      },
      images: {
        dailyLogImages: dailyLogImages.length,
        consentRecordsRetained,
      },
      pendingOutboxEvents: pendingOutboxEvents.length,
      reviews: sourceReviews.length,
      stylistLinks: sourceStylistLinks.length,
      mergeConflicts: {
        reservationItems: reservationItemConflicts,
        dailyLogItems: dailyLogItemConflicts,
        dailyLogReservations: dailyLogReservationConflicts,
        reviews: reviewConflicts,
        processingOutboxEvents: pendingOutboxEvents.filter(
          (event) => event.status === 'PROCESSING',
        ).length,
      },
      duplicateStylistLinks: duplicateStylistProfileIds.length,
    };
    const tokenMaterial = {
      sourceUpdatedAt: source.updatedAt.toISOString(),
      targetUpdatedAt: target?.updatedAt.toISOString() ?? null,
      impact,
      ids: {
        reservations: reservationIds,
        outboxReservations: outboxReservationIds,
        reservationItems: reservationItems.map((row) => row.id),
        dailyLogs: dailyLogIds,
        dailyLogItems: dailyLogItems.map((row) => row.id),
        manualEntries: manualEntryIds,
        debts: debtIds,
        debtPaymentLogs: debtPaymentLogs.map((row) => row.id),
        images: dailyLogImages.map((image) => image.id),
        pendingOutboxEvents: pendingOutboxEvents.map((event) => event.id),
        reviews: sourceReviews.map((row) => row.id),
        stylistLinks: sourceStylistLinks.map((row) => row.id),
      },
    };
    const impactToken = createHash('sha256')
      .update(JSON.stringify(tokenMaterial))
      .digest('hex');
    return {
      impact: { ...impact, impactToken },
      ids: {
        reservationIds,
        outboxReservationIds,
        dailyLogIds,
        affectedDailyLogIds,
        manualEntryIds,
        debtIds,
        outboxEventIds: pendingOutboxEvents.map((event) => event.id),
        duplicateStylistProfileIds,
        bookIds: [
          ...new Set([
            ...manualEntries.map((entry) => entry.bookId),
            ...(affectedDailyLogIds.length
              ? (
                  await db.incomeBookEntry.findMany({
                    where: { dailyLogEntryId: { in: affectedDailyLogIds } },
                    select: { bookId: true },
                  })
                ).map((entry) => entry.bookId)
              : []),
          ]),
        ],
      },
    };
  }

  async getServiceDeletionImpact(id: string, targetServiceId?: string) {
    return (await this.getServiceMutationSnapshot(id, targetServiceId)).impact;
  }

  async removeService(id: string, dto: DeleteServiceDto, actorUserId: string) {
    if (!dto || !dto.action || !dto.confirmationName || !dto.impactToken) {
      throw new BadRequestException(
        'Potrebna je potvrda i važeći pregled povezanih zapisa.',
      );
    }
    if (dto.action === 'MERGE' && !dto.targetServiceId) {
      throw new BadRequestException('Odaberite ciljnu uslugu za spajanje.');
    }
    if (dto.action === 'DELETE_LINKED_RECORDS' && dto.targetServiceId) {
      throw new BadRequestException(
        'Ciljna usluga nije dozvoljena za brisanje.',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const snapshot = await this.getServiceMutationSnapshot(
          id,
          dto.targetServiceId,
          tx,
        );
        const { impact, ids } = snapshot;
        if (dto.confirmationName.trim() !== impact.service.name) {
          throw new BadRequestException('Naziv usluge za potvrdu ne odgovara.');
        }
        if (dto.impactToken !== impact.impactToken) {
          throw new ConflictException(
            'Povezani zapisi su se promijenili. Osvježite pregled prije nastavka.',
          );
        }
        const target = impact.target;
        const hasMergeConflicts = Object.values(impact.mergeConflicts).some(
          (count) => count > 0,
        );
        if (dto.action === 'MERGE' && hasMergeConflicts) {
          throw new ConflictException(
            'Spajanje ima jedinstvenih konflikata. Odaberite drugu ciljnu uslugu ili obrišite povezane zapise.',
          );
        }
        if (
          dto.action === 'DELETE_LINKED_RECORDS' &&
          impact.mergeConflicts.processingOutboxEvents > 0
        ) {
          throw new ConflictException(
            'Događaj obavijesti se trenutno obrađuje. Sačekajte završetak i osvježite pregled.',
          );
        }

        if (dto.action === 'DELETE_LINKED_RECORDS') {
          if (ids.outboxEventIds.length) {
            const cancelled = await tx.outboxEvent.updateMany({
              where: {
                id: { in: ids.outboxEventIds },
                status: 'PENDING',
              },
              data: {
                status: 'CANCELLED',
                lockedAt: null,
                lastError:
                  'Cancelled because the linked service records were deleted.',
              },
            });
            if (cancelled.count !== ids.outboxEventIds.length) {
              throw new ConflictException(
                'Outbox state changed during this operation. Refresh the impact preview before retrying.',
              );
            }
          }
          await tx.reservationServiceItem.deleteMany({
            where: { serviceId: id },
          });
          await tx.dailyLogEntryServiceItem.deleteMany({
            where: { serviceId: id },
          });
          if (ids.affectedDailyLogIds.length) {
            await tx.dailyLogEntry.deleteMany({
              where: { id: { in: ids.affectedDailyLogIds } },
            });
          }
          await tx.reservation.deleteMany({ where: { serviceId: id } });
          if (ids.manualEntryIds.length) {
            await tx.incomeBookManualEntry.deleteMany({
              where: { id: { in: ids.manualEntryIds } },
            });
          }
          if (ids.debtIds.length) {
            await tx.clientDebt.deleteMany({
              where: { id: { in: ids.debtIds } },
            });
          }
          await tx.review.deleteMany({ where: { serviceId: id } });
          await tx.stylistService.deleteMany({ where: { serviceId: id } });
          await tx.service.delete({ where: { id } });
          for (const bookId of ids.bookIds) {
            const [automatic, manual] = await Promise.all([
              tx.incomeBookEntry.aggregate({
                where: { bookId },
                _sum: { amount: true, tipAmount: true },
              }),
              tx.incomeBookManualEntry.aggregate({
                where: { bookId },
                _sum: { amount: true, tipAmount: true },
              }),
            ]);
            await tx.incomeBook.update({
              where: { id: bookId },
              data: {
                totalRevenue:
                  Number(automatic._sum.amount ?? 0) +
                  Number(manual._sum.amount ?? 0),
                totalTips:
                  Number(automatic._sum.tipAmount ?? 0) +
                  Number(manual._sum.tipAmount ?? 0),
              },
            });
          }
        } else if (target) {
          if (ids.outboxEventIds.length && ids.outboxReservationIds.length) {
            const queuedCreatedEvents = await tx.outboxEvent.findMany({
              where: {
                id: { in: ids.outboxEventIds },
                aggregateId: { in: ids.outboxReservationIds },
                eventType: 'reservation.created',
                status: 'PENDING',
              },
              select: { id: true, payload: true },
            });
            for (const event of queuedCreatedEvents) {
              if (
                typeof event.payload !== 'object' ||
                event.payload === null ||
                Array.isArray(event.payload)
              ) {
                continue;
              }
              const payload = event.payload as Prisma.JsonObject;
              const nextPayload: Prisma.InputJsonObject = {
                ...payload,
                ...(payload.serviceId === id && { serviceId: target.id }),
                ...(Array.isArray(payload.serviceIds) && {
                  serviceIds: [
                    ...new Set(
                      payload.serviceIds
                        .filter(
                          (serviceId): serviceId is string =>
                            typeof serviceId === 'string',
                        )
                        .map((serviceId) =>
                          serviceId === id ? target.id : serviceId,
                        ),
                    ),
                  ],
                }),
                ...(typeof payload.notificationBody === 'string' && {
                  notificationBody: payload.notificationBody
                    .split(impact.service.name)
                    .join(target.name),
                }),
              };
              await tx.outboxEvent.update({
                where: { id: event.id },
                data: { payload: nextPayload },
              });
            }
          }
          if (ids.duplicateStylistProfileIds.length) {
            await tx.stylistService.deleteMany({
              where: {
                serviceId: id,
                stylistProfileId: { in: ids.duplicateStylistProfileIds },
              },
            });
          }
          await tx.reservationServiceItem.updateMany({
            where: { serviceId: id },
            data: { serviceId: target.id },
          });
          await tx.reservation.updateMany({
            where: { serviceId: id },
            data: { serviceId: target.id },
          });
          await tx.dailyLogEntryServiceItem.updateMany({
            where: { serviceId: id },
            data: { serviceId: target.id },
          });
          await tx.dailyLogEntry.updateMany({
            where: { serviceId: id },
            data: { serviceId: target.id },
          });
          await tx.incomeBookManualEntry.updateMany({
            where: { serviceId: id },
            data: { serviceId: target.id },
          });
          await tx.clientDebt.updateMany({
            where: { serviceId: id },
            data: { serviceId: target.id },
          });
          await tx.review.updateMany({
            where: { serviceId: id },
            data: { serviceId: target.id },
          });
          await tx.stylistService.updateMany({
            where: { serviceId: id },
            data: { serviceId: target.id },
          });
          await tx.service.delete({ where: { id } });
        }

        await tx.serviceMutationAudit.create({
          data: {
            action: dto.action,
            sourceServiceId: impact.service.id,
            sourceServiceName: impact.service.name,
            targetServiceId: target?.id ?? null,
            targetServiceName: target?.name ?? null,
            actorUserId,
            impact,
          },
        });
        return { deleted: true, action: dto.action, impact };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private toPublicService<
    T extends {
      id: string;
      subcategoryId: string;
      name: string;
      shortDescription: string | null;
      heroImage: string | null;
      durationMinutes: number;
      price: unknown;
      gender: string;
      sortOrder: number;
      subcategory: {
        id: string;
        categoryId: string;
        name: string;
        category: { id: string; name: string };
      };
    },
  >(service: T) {
    return {
      id: service.id,
      subcategoryId: service.subcategoryId,
      name: service.name,
      shortDescription: service.shortDescription,
      heroImage: service.heroImage,
      durationMinutes: service.durationMinutes,
      price: service.price,
      gender: service.gender,
      sortOrder: service.sortOrder,
      subcategory: {
        id: service.subcategory.id,
        categoryId: service.subcategory.categoryId,
        name: service.subcategory.name,
        category: {
          id: service.subcategory.category.id,
          name: service.subcategory.category.name,
        },
      },
    };
  }
}
