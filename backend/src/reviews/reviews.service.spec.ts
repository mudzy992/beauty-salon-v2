import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  service: { findUniqueOrThrow: jest.fn() },
  stylistProfile: { findUniqueOrThrow: jest.fn() },
  reservation: { findUnique: jest.fn() },
  review: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
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
    mockPrisma.service.findUniqueOrThrow.mockResolvedValue({});
    mockPrisma.reservation.findUnique.mockResolvedValue({
      id: 'r1',
      clientId: 'other-client',
    });
    await expect(
      service.create(
        { serviceId: 's1', reservationId: 'r1', serviceRating: 5 },
        'current-user',
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('create baca BadRequestException kada recenzija za servis već postoji', async () => {
    mockPrisma.service.findUniqueOrThrow.mockResolvedValue({});
    mockPrisma.review.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create({ serviceId: 's1', serviceRating: 5 }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('approve baca ForbiddenException kada user nije admin/owner', async () => {
    mockPrisma.review.findUnique.mockResolvedValue({ id: 'rev-1' });
    const user = { sub: 'u1', username: 'u', email: 'e@e.com', roles: ['CLIENT'] };
    await expect(service.approve('rev-1', user as any)).rejects.toThrow(ForbiddenException);
  });

  it('findOne baca NotFoundException kada recenzija ne postoji', async () => {
    mockPrisma.review.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });
});
