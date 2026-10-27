jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('@prisma/client', () => ({
  Prisma: { Decimal: class Decimal {} },
}));

import type { PrismaService } from '../prisma/prisma.service';
import { ServicesService } from './services.service';

describe('ServicesService public catalog pagination', () => {
  const mockPrisma = {
    serviceCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    serviceSubcategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    service: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };
  let service: ServicesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ServicesService(mockPrisma as unknown as PrismaService);
  });

  it('returns a bounded category page with capped, stably ordered children', async () => {
    const items = [{ id: 'category-1' }];
    mockPrisma.serviceCategory.findMany.mockResolvedValue(items);
    mockPrisma.serviceCategory.count.mockResolvedValue(2);

    await expect(
      service.findAllCategories(true, { page: 1, pageSize: 1 }),
    ).resolves.toEqual({
      items,
      total: 2,
      page: 1,
      pageSize: 1,
      hasMore: false,
      nextPage: null,
    });
    expect(mockPrisma.serviceCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        include: {
          subcategories: {
            where: { isActive: true },
            take: 50,
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        skip: 1,
        take: 1,
      }),
    );
    expect(mockPrisma.serviceCategory.count).toHaveBeenCalledWith({
      where: { isActive: true },
    });
  });

  it('returns a bounded subcategory page filtered by category and caps included services', async () => {
    const items = [{ id: 'subcategory-1' }];
    mockPrisma.serviceSubcategory.findMany.mockResolvedValue(items);
    mockPrisma.serviceSubcategory.count.mockResolvedValue(3);

    await expect(
      service.findAllSubcategories('category-1', true, {
        page: 1,
        pageSize: 2,
      }),
    ).resolves.toEqual({
      items,
      total: 3,
      page: 1,
      pageSize: 2,
      hasMore: false,
      nextPage: null,
    });
    expect(mockPrisma.serviceSubcategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          category: { isActive: true },
          categoryId: 'category-1',
        },
        include: {
          category: true,
          services: {
            where: { isActive: true },
            take: 50,
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { id: 'asc' },
        ],
        skip: 2,
        take: 2,
      }),
    );
    expect(mockPrisma.serviceSubcategory.count).toHaveBeenCalledWith({
      where: {
        isActive: true,
        category: { isActive: true },
        categoryId: 'category-1',
      },
    });
  });

  it('caps nested relations on single-category and subcategory detail reads', async () => {
    mockPrisma.serviceCategory.findUnique.mockResolvedValue({
      id: 'category-1',
    });
    mockPrisma.serviceSubcategory.findUnique.mockResolvedValue({
      id: 'subcategory-1',
    });

    await service.findOneCategory('category-1');
    await service.findOneSubcategory('subcategory-1');

    expect(mockPrisma.serviceCategory.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          subcategories: {
            take: 50,
            include: {
              services: {
                take: 50,
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              },
            },
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      }),
    );
    expect(mockPrisma.serviceSubcategory.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          category: true,
          services: {
            take: 50,
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
          },
        },
      }),
    );
  });

  it('rejects category and subcategory offsets beyond the cap before Prisma access', async () => {
    await expect(
      service.findAllCategories(false, { page: 21, pageSize: 50 }),
    ).rejects.toThrow('Raspon kataloga kategorija prelazi dozvoljeni limit.');
    await expect(
      service.findAllSubcategories(undefined, false, {
        page: 21,
        pageSize: 50,
      }),
    ).rejects.toThrow(
      'Raspon kataloga potkategorija prelazi dozvoljeni limit.',
    );
    expect(mockPrisma.serviceCategory.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.serviceCategory.count).not.toHaveBeenCalled();
    expect(mockPrisma.serviceSubcategory.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.serviceSubcategory.count).not.toHaveBeenCalled();
  });

  it('returns a bounded, stable service page with total metadata', async () => {
    const items = [{ id: 'service-1' }];
    mockPrisma.service.findMany.mockResolvedValue(items);
    mockPrisma.service.count.mockResolvedValue(3);

    await expect(
      service.findAllServices('subcategory-1', true, { page: 1, pageSize: 2 }),
    ).resolves.toEqual({
      items,
      total: 3,
      page: 1,
      pageSize: 2,
      hasMore: false,
      nextPage: null,
    });
    expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          subcategory: { isActive: true, category: { isActive: true } },
          subcategoryId: 'subcategory-1',
        },
        orderBy: [
          { subcategory: { sortOrder: 'asc' } },
          { sortOrder: 'asc' },
          { id: 'asc' },
        ],
        skip: 2,
        take: 2,
      }),
    );
    expect(mockPrisma.service.count).toHaveBeenCalledWith({
      where: {
        isActive: true,
        subcategory: { isActive: true, category: { isActive: true } },
        subcategoryId: 'subcategory-1',
      },
    });
  });

  it('projects public service lists and excludes internal loyalty settings', async () => {
    mockPrisma.service.findMany.mockResolvedValue([
      {
        id: 'service-1',
        subcategoryId: 'subcategory-1',
        name: 'Cut',
        shortDescription: 'Short desc',
        heroImage: null,
        durationMinutes: 45,
        price: '25.00',
        gender: 'FEMALE',
        sortOrder: 1,
        isActive: true,
        loyaltyEnabled: true,
        loyaltyMaxDiscountPercent: 15,
        subcategory: {
          id: 'subcategory-1',
          categoryId: 'category-1',
          name: 'Hair',
          category: { id: 'category-1', name: 'Care' },
        },
      },
    ]);
    mockPrisma.service.count.mockResolvedValue(1);

    const result = await service.findPublicServices();

    expect(result.items[0]).toEqual({
      id: 'service-1',
      subcategoryId: 'subcategory-1',
      name: 'Cut',
      shortDescription: 'Short desc',
      heroImage: null,
      durationMinutes: 45,
      price: '25.00',
      gender: 'FEMALE',
      sortOrder: 1,
      subcategory: {
        id: 'subcategory-1',
        categoryId: 'category-1',
        name: 'Hair',
        category: { id: 'category-1', name: 'Care' },
      },
    });
    expect(mockPrisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          subcategory: { isActive: true, category: { isActive: true } },
        },
      }),
    );
  });

  it('hides a service when the service or either parent is inactive', async () => {
    mockPrisma.service.findFirst.mockResolvedValue(null);

    await expect(service.findPublicOneService('service-1')).rejects.toThrow(
      'Servis nije pronađen.',
    );
    expect(mockPrisma.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'service-1',
          isActive: true,
          subcategory: { isActive: true, category: { isActive: true } },
        },
      }),
    );
  });

  it('rejects an offset beyond the public catalog cap before querying Prisma', async () => {
    await expect(
      service.findAllServices(undefined, false, { page: 21, pageSize: 50 }),
    ).rejects.toThrow('Raspon kataloga servisa prelazi dozvoljeni limit.');
    expect(mockPrisma.service.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.service.count).not.toHaveBeenCalled();
  });
});
