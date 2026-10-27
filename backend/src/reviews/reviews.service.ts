import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import {
  DEFAULT_PUBLIC_REVIEW_LIMIT,
  MAX_PUBLIC_REVIEW_LIMIT,
  MAX_PUBLIC_REVIEW_OFFSET,
} from './reviews.constants';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

const REVIEW_DISPLAY_SELECT = {
  id: true,
  serviceRating: true,
  stylistRating: true,
  comment: true,
  isApproved: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isAvatarPublic: true,
    },
  },
  service: { select: { name: true } },
  stylist: {
    select: {
      user: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private withPublicAvatar<T extends {
    user: {
      id: string;
      avatar: string | null;
      isAvatarPublic: boolean;
      firstName: string | null;
      lastName: string | null;
    };
  }>(review: T) {
    if (!review.user) return review;
    const { id, avatar, isAvatarPublic, ...user } = review.user;
    return {
      ...review,
      user: {
        ...user,
        avatar: isAvatarPublic && avatar ? `/api/users/${id}/avatar` : null,
      },
    };
  }

  async create(dto: CreateReviewDto, userId: string) {
    await this.prisma.service.findUniqueOrThrow({
      where: { id: dto.serviceId },
    });
    if (dto.stylistProfileId) {
      await this.prisma.stylistProfile.findUniqueOrThrow({
        where: { id: dto.stylistProfileId },
      });
    }
    if (dto.reservationId) {
      const res = await this.prisma.reservation.findUnique({
        where: { id: dto.reservationId },
      });
      if (!res) throw new NotFoundException('Rezervacija nije pronađena.');
      if (res.clientId !== userId)
        throw new ForbiddenException(
          'Samo klijent rezervacije može ostaviti recenziju.',
        );
    }
    const existing = await this.prisma.review.findFirst({
      where: {
        userId,
        serviceId: dto.serviceId,
        ...(dto.reservationId ? { reservationId: dto.reservationId } : {}),
      },
    });
    if (existing)
      throw new BadRequestException(
        'Već ste ostavili recenziju za ovaj servis.',
      );
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
        stylist: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findOneRandomApproved() {
    const count = await this.prisma.review.count({
      where: { isApproved: true },
    });
    if (count === 0) return null;
    const skip = Math.floor(Math.random() * count);
    const review = await this.prisma.review.findMany({
      where: { isApproved: true },
      take: 1,
      skip,
      select: REVIEW_DISPLAY_SELECT,
    });
    return review[0] ? this.withPublicAvatar(review[0]) : null;
  }

  async findAllPublic(query: {
    serviceId?: string;
    stylistProfileId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: {
      serviceId?: string;
      stylistProfileId?: string;
      isApproved: true;
    } = { isApproved: true };
    if (query.serviceId) where.serviceId = query.serviceId;
    if (query.stylistProfileId) where.stylistProfileId = query.stylistProfileId;

    const requestedLimit = query.limit ?? DEFAULT_PUBLIC_REVIEW_LIMIT;
    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
      throw new BadRequestException('limit mora biti pozitivan cijeli broj.');
    }
    const limit = Math.min(requestedLimit, MAX_PUBLIC_REVIEW_LIMIT);
    const offset = query.offset ?? 0;
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      offset > MAX_PUBLIC_REVIEW_OFFSET
    ) {
      throw new BadRequestException(
        `offset mora biti cijeli broj između 0 i ${MAX_PUBLIC_REVIEW_OFFSET}.`,
      );
    }

    const [total, items] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        select: REVIEW_DISPLAY_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: offset,
        take: limit,
      }),
    ]);
    const nextOffset = offset + items.length;

    return {
      items: items.map((item) => this.withPublicAvatar(item)),
      total,
      limit,
      offset,
      hasMore:
        items.length > 0 &&
        nextOffset < total &&
        nextOffset <= MAX_PUBLIC_REVIEW_OFFSET,
      nextOffset,
    };
  }

  async findAllForAdmin(query: {
    serviceId?: string;
    stylistProfileId?: string;
    approved?: string;
  }) {
    const where: {
      serviceId?: string;
      stylistProfileId?: string;
      isApproved?: boolean;
    } = {};
    if (query.serviceId) where.serviceId = query.serviceId;
    if (query.stylistProfileId) where.stylistProfileId = query.stylistProfileId;
    if (query.approved === 'true') where.isApproved = true;
    if (query.approved === 'false') where.isApproved = false;
    const items = await this.prisma.review.findMany({
      where,
      select: REVIEW_DISPLAY_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.withPublicAvatar(item));
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findFirst({
      where: { id, isApproved: true },
      select: REVIEW_DISPLAY_SELECT,
    });
    if (!review) throw new NotFoundException('Recenzija nije pronađena.');
    return this.withPublicAvatar(review);
  }

  async approve(id: string, user: CurrentUserPayload) {
    if (!user.roles.includes('SYSTEM_ADMIN') && !user.roles.includes('OWNER')) {
      throw new ForbiddenException('Samo administrator ili vlasnik.');
    }
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Recenzija nije pronađena.');
    const review = await this.prisma.review.update({
      where: { id },
      data: { isApproved: true },
      select: REVIEW_DISPLAY_SELECT,
    });
    return this.withPublicAvatar(review);
  }

  async remove(id: string, user: CurrentUserPayload) {
    const r = await this.prisma.review.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Recenzija nije pronađena.');
    if (
      r.userId !== user.sub &&
      !user.roles.includes('SYSTEM_ADMIN') &&
      !user.roles.includes('OWNER')
    ) {
      throw new ForbiddenException('Nemate dozvolu za brisanje.');
    }
    await this.prisma.review.delete({ where: { id } });
    return { deleted: true };
  }
}
