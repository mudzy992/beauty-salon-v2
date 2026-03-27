import { Injectable, NotFoundException } from '@nestjs/common';
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

  async getPublicHomeStats() {
    const [servicesCount, clientsCount] = await Promise.all([
      this.prisma.service.count({
        where: { isActive: true },
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
      },
      include: {
        subcategory: { include: { category: true } },
      },
    });

    if (!service) return null;

    return {
      ...service,
      reservationsCount: top._count.serviceId,
    };
  }

  async findAllCategories(activeOnly = false) {
    return this.prisma.serviceCategory.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: { subcategories: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOneCategory(id: string) {
    const cat = await this.prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        subcategories: {
          include: { services: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
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

  async findAllSubcategories(categoryId?: string, activeOnly = false) {
    const where: Prisma.ServiceSubcategoryWhereInput = activeOnly
      ? { isActive: true }
      : {};
    if (categoryId) where.categoryId = categoryId;
    return this.prisma.serviceSubcategory.findMany({
      where,
      include: { category: true, services: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
  }

  async findOneSubcategory(id: string) {
    const sub = await this.prisma.serviceSubcategory.findUnique({
      where: { id },
      include: { category: true, services: { orderBy: { sortOrder: 'asc' } } },
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
    pagination?: { page?: number; pageSize?: number },
  ) {
    const where: Prisma.ServiceWhereInput = activeOnly
      ? { isActive: true }
      : {};
    if (subcategoryId) where.subcategoryId = subcategoryId;
    const hasPagination =
      pagination?.page != null && pagination?.pageSize != null;
    if (!hasPagination) {
      return this.prisma.service.findMany({
        where,
        include: { subcategory: { include: { category: true } } },
        orderBy: [{ subcategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
      });
    }
    const page = Math.max(0, pagination?.page ?? 0);
    const pageSize = Math.min(100, Math.max(1, pagination?.pageSize ?? 10));
    const [items, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: { subcategory: { include: { category: true } } },
        orderBy: [{ subcategory: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        skip: page * pageSize,
        take: pageSize,
      }),
      this.prisma.service.count({ where }),
    ]);
    return {
      items,
      total,
      page,
      pageSize,
    };
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
}
