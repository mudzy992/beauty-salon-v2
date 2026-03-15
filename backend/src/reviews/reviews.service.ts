import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateReviewDto, userId: string) {
    await this.prisma.service.findUniqueOrThrow({ where: { id: dto.serviceId } });
    if (dto.stylistProfileId) {
      await this.prisma.stylistProfile.findUniqueOrThrow({ where: { id: dto.stylistProfileId } });
    }
    if (dto.reservationId) {
      const res = await this.prisma.reservation.findUnique({
        where: { id: dto.reservationId },
      });
      if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
      if (res.clientId !== userId) throw new ForbiddenException('Samo klijent rezervacije može ostaviti recenziju.');
    }
    const existing = await this.prisma.review.findFirst({
      where: {
        userId,
        serviceId: dto.serviceId,
        ...(dto.reservationId ? { reservationId: dto.reservationId } : {}),
      },
    });
    if (existing) throw new BadRequestException('Već ste ostavili recenziju za ovaj servis.');
    return this.prisma.review.create({
      data: {
        userId,
        serviceId: dto.serviceId,
        stylistProfileId: dto.stylistProfileId,
        reservationId: dto.reservationId,
        serviceRating: dto.serviceRating,
        stylistRating: dto.stylistRating,
        comment: dto.comment,
        isApproved: false,
      },
      include: {
        service: { select: { id: true, name: true } },
        stylist: { include: { user: { select: { firstName: true, lastName: true } } } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findOneRandomApproved() {
    const count = await this.prisma.review.count({ where: { isApproved: true } });
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const review = await this.prisma.review.findMany({
      where: { isApproved: true },
      take: 1,
      skip,
      include: {
        user: { select: { firstName: true, lastName: true } },
        service: { select: { name: true } },
      },
    });
    return review[0] ?? null;
  }

  async findAll(query: { serviceId?: string; stylistProfileId?: string; approvedOnly?: boolean }) {
    const where: { serviceId?: string; stylistProfileId?: string; isApproved?: boolean } = {};
    if (query.serviceId) where.serviceId = query.serviceId;
    if (query.stylistProfileId) where.stylistProfileId = query.stylistProfileId;
    if (query.approvedOnly) where.isApproved = true;
    return this.prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        service: { select: { id: true, name: true } },
        stylist: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const r = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        service: true,
        stylist: { include: { user: true } },
        reservation: { select: { id: true } },
      },
    });
    if (!r) throw new NotFoundException('Recenzija nije pronađena.');
    return r;
  }

  async approve(id: string, user: CurrentUserPayload) {
    if (!user.roles.includes('SYSTEM_ADMIN') && !user.roles.includes('OWNER')) {
      throw new ForbiddenException('Samo administrator ili vlasnik.');
    }
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Recenzija nije pronađena.');
    return this.prisma.review.update({
      where: { id },
      data: { isApproved: true },
      include: { user: true, service: true, stylist: true },
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Recenzija nije pronađena.');
    if (r.userId !== user.sub && !user.roles.includes('SYSTEM_ADMIN') && !user.roles.includes('OWNER')) {
      throw new ForbiddenException('Nemate dozvolu za brisanje.');
    }
    await this.prisma.review.delete({ where: { id } });
    return { deleted: true };
  }
}
