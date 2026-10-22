import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  DEFAULT_BEFORE_AFTER_LIMIT,
  MAX_BEFORE_AFTER_LIMIT,
  MAX_BEFORE_AFTER_OFFSET,
} from './before-after-query.constants';
import { PrismaService } from '../prisma/prisma.service';

export type BeforeAfterPair = {
  id: string;
  service: { id: string; name: string };
  completedAt: Date | null;
  before: {
    pathOriginal: string;
    pathMedium?: string | null;
    pathThumb?: string | null;
  };
  after: {
    pathOriginal: string;
    pathMedium?: string | null;
    pathThumb?: string | null;
  };
};

@Injectable()
export class DailyLogPublicService {
  constructor(private readonly prisma: PrismaService) {}

  async findBeforeAfterPairs(opts?: {
    limit?: number;
    offset?: number;
    serviceId?: string;
    random?: boolean;
  }): Promise<{
    items: BeforeAfterPair[];
    hasMore: boolean;
    nextOffset: number;
  }> {
    const requestedLimit = opts?.limit ?? DEFAULT_BEFORE_AFTER_LIMIT;
    if (!Number.isSafeInteger(requestedLimit) || requestedLimit < 1) {
      throw new BadRequestException('limit mora biti pozitivan cijeli broj.');
    }
    const limit = Math.min(requestedLimit, MAX_BEFORE_AFTER_LIMIT);
    const serviceId = opts?.serviceId?.trim() || undefined;
    const where = this.buildEligibleWhere(serviceId);

    if (opts?.random) {
      return this.findRandomPairs(where, limit);
    }

    const requestedOffset = opts?.offset ?? 0;
    if (
      !Number.isSafeInteger(requestedOffset) ||
      requestedOffset < 0 ||
      requestedOffset > MAX_BEFORE_AFTER_OFFSET
    ) {
      throw new BadRequestException(
        `offset mora biti cijeli broj između 0 i ${MAX_BEFORE_AFTER_OFFSET}.`,
      );
    }
    const offset = requestedOffset;

    const [total, entries] = await Promise.all([
      this.prisma.dailyLogEntry.count({ where }),
      this.prisma.dailyLogEntry.findMany({
        where,
        include: {
          images: { include: { upload: true }, orderBy: { sortOrder: 'asc' } },
          service: { select: { id: true, name: true } },
        },
        orderBy: { completedAt: 'desc' },
        skip: offset,
        take: limit,
      }),
    ]);

    const items = this.mapPairs(entries);
    const nextOffset = offset + entries.length;
    return {
      items,
      hasMore:
        entries.length > 0 &&
        nextOffset < total &&
        nextOffset <= MAX_BEFORE_AFTER_OFFSET,
      nextOffset,
    };
  }

  private buildEligibleWhere(
    serviceId?: string,
  ): Prisma.DailyLogEntryWhereInput {
    return {
      status: 'COMPLETED',
      deletedAt: null,
      kind: 'SERVICE',
      images: { some: { isBefore: true } },
      AND: [{ images: { some: { isAfter: true } } }],
      ...(serviceId ? { serviceId } : {}),
    };
  }

  private async findRandomPairs(
    where: Prisma.DailyLogEntryWhereInput,
    limit: number,
  ): Promise<{
    items: BeforeAfterPair[];
    hasMore: boolean;
    nextOffset: number;
  }> {
    const randomStart = Math.random();
    const randomOrder = [{ randomKey: 'asc' as const }, { id: 'asc' as const }];
    const include = {
      images: {
        include: { upload: true },
        orderBy: { sortOrder: 'asc' as const },
      },
      service: { select: { id: true, name: true } },
    };
    const firstWindow = await this.prisma.dailyLogEntry.findMany({
      where: { ...where, randomKey: { gte: randomStart } },
      include,
      orderBy: randomOrder,
      take: limit,
    });

    const remaining = limit - firstWindow.length;
    const wrappedWindow =
      remaining > 0
        ? await this.prisma.dailyLogEntry.findMany({
            where: { ...where, randomKey: { lt: randomStart } },
            include,
            orderBy: randomOrder,
            take: remaining,
          })
        : [];

    return {
      items: this.mapPairs([...firstWindow, ...wrappedWindow]),
      hasMore: false,
      nextOffset: 0,
    };
  }

  private mapPairs(
    entries: Array<{
      id: string;
      completedAt: Date | null;
      service: { id: string; name: string };
      images: Array<{
        isBefore: boolean;
        isAfter: boolean;
        upload: {
          pathOriginal: string;
          pathMedium: string | null;
          pathThumb: string | null;
        } | null;
      }>;
    }>,
  ): BeforeAfterPair[] {
    const pairs: BeforeAfterPair[] = [];
    for (const entry of entries) {
      const beforeImg = entry.images.find((i) => i.isBefore);
      const afterImg = entry.images.find((i) => i.isAfter);
      if (!beforeImg?.upload || !afterImg?.upload) continue;
      pairs.push({
        id: entry.id,
        service: entry.service,
        completedAt: entry.completedAt ?? null,
        before: {
          pathOriginal: beforeImg.upload.pathOriginal,
          pathMedium: beforeImg.upload.pathMedium,
          pathThumb: beforeImg.upload.pathThumb,
        },
        after: {
          pathOriginal: afterImg.upload.pathOriginal,
          pathMedium: afterImg.upload.pathMedium,
          pathThumb: afterImg.upload.pathThumb,
        },
      });
    }
    return pairs;
  }
}
