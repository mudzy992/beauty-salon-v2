import {
  BadRequestException,
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
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Prisma } from '@prisma/client';

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
    if (!service) throw new NotFoundException('Servis nije pronađen.');
    return this.toPublicService(service);
  }

  async findOneService(id: string) {
    const svc = await this.prisma.service.findUnique({
      where: { id },
      include: {
        subcategory: { include: { category: true } },
      },
    });
    if (!svc) throw new NotFoundException('Servis nije pronađen.');
    return svc;
  }

  async createService(dto: CreateServiceDto) {
    await this.prisma.serviceSubcategory.findUniqueOrThrow({
      where: { id: dto.subcategoryId },
    });
    return this.prisma.service.create({
      data: {
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
      },
    });
  }

  async updateService(id: string, dto: UpdateServiceDto) {
    await this.findOneService(id);
    return this.prisma.service.update({
      where: { id },
      data: {
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
      },
    });
  }

  async removeService(id: string) {
    await this.findOneService(id);
    await this.prisma.service.delete({ where: { id } });
    return { deleted: true };
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
