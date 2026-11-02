jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  service: { findUniqueOrThrow: jest.fn() },
  stylistProfile: { findUniqueOrThrow: jest.fn() },
  reservation: { findUnique: jest.fn() },
  review: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

type ReviewQuery = {
  where: Record<string, unknown>;
  select: {
    [field: string]: unknown;
    user: { select: Record<string, unknown> };
  };
  orderBy?: unknown;
  skip?: number;
  take?: number;
};

const completedReservation = {
  id: 'r1',
  clientId: 'current-user',
  serviceId: 's1',
  confirmedStylistId: 'stylist-1',
  status: 'COMPLETED',
  items: [],
};

const firstReviewQuery = (mock: {
  mock: { calls: ReadonlyArray<ReadonlyArray<unknown>> };
}): ReviewQuery => {
  const query = mock.mock.calls[0]?.[0];
  if (
    typeof query !== 'object' ||
    query === null ||
    !('where' in query) ||
    !('select' in query)
  ) {
    throw new Error('Expected a Prisma review query');
  }
  return query as ReviewQuery;
};

describe('ReviewsService', () => {
  let service: ReviewsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ReviewsService>(ReviewsService);
  });

  it('create baca ForbiddenException kada reservation nije od tog usera', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue({
      ...completedReservation,
      clientId: 'other-client',
    });
    await expect(
      service.create(
        { serviceId: 's1', reservationId: 'r1', serviceRating: 5 },
        'current-user',
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.review.create).not.toHaveBeenCalled();
  });

  it('odbija recenziju za rezervaciju koja nije završena', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue({
      ...completedReservation,
      status: 'CONFIRMED',
    });

    await expect(
      service.create(
        { serviceId: 's1', reservationId: 'r1', serviceRating: 5 },
        'current-user',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.review.findFirst).not.toHaveBeenCalled();
  });

  it('odbija uslugu koja ne pripada rezervaciji', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue(completedReservation);

    await expect(
      service.create(
        { serviceId: 'another-service', reservationId: 'r1', serviceRating: 5 },
        'current-user',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.review.create).not.toHaveBeenCalled();
  });

  it('creates a verified review linked to the reservation stylist', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue(completedReservation);
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue({ id: 'new-review' });

    await service.create(
      {
        serviceId: 's1',
        reservationId: 'r1',
        serviceRating: 5,
        stylistRating: 4,
      },
      'current-user',
    );

    expect(mockPrisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'current-user',
          serviceId: 's1',
          reservationId: 'r1',
          stylistProfileId: 'stylist-1',
          isVerified: true,
          stylistRating: 4,
        }),
      }),
    );
  });

  it('rejects a concurrent duplicate when the database unique constraint wins', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue(completedReservation);
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create(
        { serviceId: 's1', reservationId: 'r1', serviceRating: 5 },
        'current-user',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects an existing reservation/service review', async () => {
    mockPrisma.reservation.findUnique.mockResolvedValue(completedReservation);
    mockPrisma.review.findFirst.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        { serviceId: 's1', reservationId: 'r1', serviceRating: 5 },
        'current-user',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('approve baca ForbiddenException kada user nije admin/owner', async () => {
    mockPrisma.review.findUnique.mockResolvedValue({ id: 'rev-1' });
    const user = {
      sub: 'u1',
      username: 'u',
      email: 'e@e.com',
      roles: ['CLIENT'],
    };
    await expect(service.approve('rev-1', user)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('findOne hides unapproved reviews and selects only public display fields', async () => {
    mockPrisma.review.findFirst.mockResolvedValue(null);
    await expect(service.findOne('rev-1')).rejects.toThrow(NotFoundException);

    const query = firstReviewQuery(mockPrisma.review.findFirst);
    expect(query.where).toEqual({
      id: 'rev-1',
      isApproved: true,
      isVerified: true,
      reservationId: { not: null },
      reservation: { is: { status: 'COMPLETED' } },
    });
    expect(query.select.user.select).toEqual({
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isAvatarPublic: true,
    });
    expect(query.select.user.select).not.toHaveProperty('passwordHash');
    expect(query.select.user.select).not.toHaveProperty(
      'emailVerificationToken',
    );
    expect(query.select.user.select).not.toHaveProperty('email');
    expect(query.select).not.toHaveProperty('userId');
    expect(query.select).not.toHaveProperty('reservationId');
  });

  it('public review avatar is exposed only through the opt-in public route', async () => {
    mockPrisma.review.findFirst.mockResolvedValue({
      id: 'rev-avatar',
      user: {
        id: 'client-1',
        firstName: 'Test',
        lastName: 'Client',
        avatar: 'private/avatars/client-thumb.webp',
        isAvatarPublic: true,
      },
      service: { name: 'Usluga' },
      stylist: null,
    });

    await expect(service.findOne('rev-avatar')).resolves.toMatchObject({
      user: {
        firstName: 'Test',
        lastName: 'Client',
        avatar: '/api/users/client-1/avatar',
      },
    });
  });

  it('featured review uses the same approved display projection', async () => {
    mockPrisma.review.count.mockResolvedValue(1);
    mockPrisma.review.findMany.mockResolvedValue([{ id: 'rev-1' }]);

    await service.findOneRandomApproved();

    const query = firstReviewQuery(mockPrisma.review.findMany);
    expect(query.where).toEqual({
      isApproved: true,
      isVerified: true,
      reservationId: { not: null },
      reservation: { is: { status: 'COMPLETED' } },
    });
    expect(query.select).not.toHaveProperty('userId');
    expect(query.select).not.toHaveProperty('reservationId');
    expect(query.select.user.select).not.toHaveProperty('passwordHash');
  });

  it('public list filters approved reviews and returns bounded stable pages', async () => {
    mockPrisma.review.count.mockResolvedValue(2);
    mockPrisma.review.findMany.mockResolvedValue([{ id: 'review-1' }]);

    const result = await service.findAllPublic({
      serviceId: 'service-1',
      stylistProfileId: 'stylist-1',
      limit: 1,
      offset: 0,
    });

    expect(result).toMatchObject({
      items: [{ id: 'review-1' }],
      total: 2,
      limit: 1,
      offset: 0,
      hasMore: true,
      nextOffset: 1,
    });
    const query = firstReviewQuery(mockPrisma.review.findMany);
    expect(query.where).toEqual({
      isApproved: true,
      isVerified: true,
      reservationId: { not: null },
      reservation: { is: { status: 'COMPLETED' } },
      serviceId: 'service-1',
      stylistProfileId: 'stylist-1',
    });
    expect(query.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(query.skip).toBe(0);
    expect(query.take).toBe(1);
    expect(query.select.user.select).toEqual({
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isAvatarPublic: true,
    });
    expect(query.select).not.toHaveProperty('userId');
    expect(query.select).not.toHaveProperty('reservationId');
  });

  it('defaults public reviews to a bounded first page and stops at the offset cap', async () => {
    mockPrisma.review.count.mockResolvedValue(2000);
    mockPrisma.review.findMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, index) => ({ id: `review-${index}` })),
    );

    const result = await service.findAllPublic({ offset: 1000 });

    expect(result).toMatchObject({
      total: 2000,
      limit: 20,
      offset: 1000,
      hasMore: false,
      nextOffset: 1020,
    });
    const query = firstReviewQuery(mockPrisma.review.findMany);
    expect(query.skip).toBe(1000);
    expect(query.take).toBe(20);
  });

  it('rejects an unsafe public reviews offset before Prisma access', async () => {
    await expect(service.findAllPublic({ offset: 1001 })).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.review.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.review.count).not.toHaveBeenCalled();
  });

  it('admin list can filter pending reviews without full User projection', async () => {
    mockPrisma.review.findMany.mockResolvedValue([]);

    await service.findAllForAdmin({ approved: 'false' });

    const query = firstReviewQuery(mockPrisma.review.findMany);
    expect(query.where).toEqual({ isApproved: false });
    expect(query.select.user.select).toEqual({
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isAvatarPublic: true,
    });
    expect(query.select.user.select).not.toHaveProperty('passwordHash');
  });
});
