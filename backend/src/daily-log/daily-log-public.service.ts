import { BadRequestException, Injectable } from '@nestjs/common';
import {
  DailyLogMediaConsentPurpose,
  Prisma,
  UploadStorageClass,
} from '@prisma/client';
import {
  DEFAULT_BEFORE_AFTER_LIMIT,
  MAX_BEFORE_AFTER_LIMIT,
  MAX_BEFORE_AFTER_OFFSET,
} from './before-after-query.constants';
import { PrismaService } from '../prisma/prisma.service';
import { CLIENT_MEDIA_PUBLICATION_POLICY_VERSION } from '../media-consent/media-consent.service';

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
        include: this.publicInclude(),
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

  private activeConsentWhere(): Prisma.DailyLogImageConsentWhereInput {
    return {
      clientId: { not: null },
      purpose: DailyLogMediaConsentPurpose.PUBLIC_GALLERY,
      policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
      revokedAt: null,
      publishedUpload: {
        is: { storageClass: UploadStorageClass.CONSENTED_PUBLIC },
      },
    };
  }

  private buildEligibleWhere(
    serviceId?: string,
  ): Prisma.DailyLogEntryWhereInput {
    const activeConsent = this.activeConsentWhere();
    return {
      status: 'COMPLETED',
      deletedAt: null,
      kind: 'SERVICE',
      clientId: { not: null },
      images: {
        some: {
          isBefore: true,
          upload: { storageClass: UploadStorageClass.PRIVATE },
          consent: { is: activeConsent },
        },
      },
      AND: [
        {
          images: {
            some: {
              isAfter: true,
              upload: { storageClass: UploadStorageClass.PRIVATE },
              consent: { is: activeConsent },
            },
          },
        },
      ],
      ...(serviceId ? { serviceId } : {}),
    };
  }

  private publicInclude() {
    const activeConsent = this.activeConsentWhere();
    return {
      images: {
        where: {
          OR: [
            {
              isBefore: true,
              upload: { storageClass: UploadStorageClass.PRIVATE },
              consent: { is: activeConsent },
            },
            {
              isAfter: true,
              upload: { storageClass: UploadStorageClass.PRIVATE },
              consent: { is: activeConsent },
            },
          ],
        },
        include: {
          consent: {
            select: { id: true, clientId: true },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      service: { select: { id: true, name: true } },
    } satisfies Prisma.DailyLogEntryInclude;
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
    const include = this.publicInclude();
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
      clientId: string | null;
      completedAt: Date | null;
      service: { id: string; name: string };
      images: Array<{
        isBefore: boolean;
        isAfter: boolean;
        consent: { id: string; clientId: string | null } | null;
      }>;
    }>,
  ): BeforeAfterPair[] {
    const pairs: BeforeAfterPair[] = [];
    for (const entry of entries) {
      const valid = (image: (typeof entry.images)[number]) =>
        image.consent?.clientId !== null &&
        image.consent?.clientId === entry.clientId;
      const beforeImg = entry.images.find(
        (image) => image.isBefore && valid(image),
      );
      const afterImg = entry.images.find(
        (image) => image.isAfter && valid(image),
      );
      if (!entry.clientId || !beforeImg?.consent || !afterImg?.consent)
        continue;
      pairs.push({
        id: entry.id,
        service: entry.service,
        completedAt: entry.completedAt ?? null,
        before: {
          pathOriginal: `/api/media/consents/${beforeImg.consent.id}/file`,
          pathMedium: null,
          pathThumb: null,
        },
        after: {
          pathOriginal: `/api/media/consents/${afterImg.consent.id}/file`,
          pathMedium: null,
          pathThumb: null,
        },
      });
    }
    return pairs;
  }
}
