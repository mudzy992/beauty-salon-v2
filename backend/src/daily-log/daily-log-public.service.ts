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
import { CLIENT_MEDIA_PUBLICATION_POLICY_VERSION } from '../media-consent/media-consent.constants';

export type BeforeAfterPair = {
  id: string;
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
    const requestedOffset = opts?.offset ?? 0;
    if (
      !opts?.random &&
      (!Number.isSafeInteger(requestedOffset) ||
        requestedOffset < 0 ||
        requestedOffset > MAX_BEFORE_AFTER_OFFSET)
    ) {
      throw new BadRequestException(
        `offset mora biti cijeli broj između 0 i ${MAX_BEFORE_AFTER_OFFSET}.`,
      );
    }
    const autoCategory = await this.prisma.galleryCategory.findFirst({
      where: { autoPublishConsentedPairs: true },
      select: { id: true },
    });
    if (!autoCategory) {
      return { items: [], hasMore: false, nextOffset: 0 };
    }
    const serviceId = opts?.serviceId?.trim() || undefined;
    const where = this.buildEligibleWhere(serviceId);

    if (opts?.random) {
      return this.findRandomPairs(where, limit);
    }

    const offset = requestedOffset;

    const [total, entries] = await Promise.all([
      this.prisma.dailyLogEntry.count({ where }),
      this.prisma.dailyLogEntry.findMany({
        where,
        select: this.publicSelect(),
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

  private publicSelect() {
    const activeConsent = this.activeConsentWhere();
    return {
      id: true,
      clientId: true,
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
        select: {
          id: true,
          isBefore: true,
          isAfter: true,
          consent: {
            select: { id: true, clientId: true },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
    } satisfies Prisma.DailyLogEntrySelect;
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
    const select = this.publicSelect();
    const firstWindow = await this.prisma.dailyLogEntry.findMany({
      where: { ...where, randomKey: { gte: randomStart } },
      select,
      orderBy: randomOrder,
      take: limit,
    });

    const remaining = limit - firstWindow.length;
    const wrappedWindow =
      remaining > 0
        ? await this.prisma.dailyLogEntry.findMany({
            where: { ...where, randomKey: { lt: randomStart } },
            select,
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
      images: Array<{
        id: string;
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
        (image) =>
          image.isAfter && image.id !== beforeImg?.id && valid(image),
      );
      if (!entry.clientId || !beforeImg?.consent || !afterImg?.consent)
        continue;
      pairs.push({
        id: entry.id,
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
