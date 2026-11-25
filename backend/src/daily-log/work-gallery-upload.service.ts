import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UploadStorageClass } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { DailyLogPublicService } from './daily-log-public.service';
import { apiError } from '../common/errors/api-error-codes';

/**
 * Private before/after pairs for a completed service record.
 *
 * The upload never publishes anything and never creates consent: originals stay
 * in private storage and the client grants consent per photo in the client app.
 */
@Injectable()
export class WorkGalleryUploadService {
  private readonly logger = new Logger(WorkGalleryUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly feed: DailyLogPublicService,
  ) {}

  /** Completed service records that can still receive a private pair. */
  private eligibleEntriesWhere(serviceId: string): Prisma.DailyLogEntryWhereInput {
    return {
      serviceId,
      kind: 'SERVICE',
      status: 'COMPLETED',
      deletedAt: null,
      clientId: { not: null },
      workGalleryHidden: false,
    };
  }

  /** One pair per record; a second pair would silently replace the visible one. */
  private pairImagesWhere(entryId: string): Prisma.DailyLogImageWhereInput {
    return { dailyLogEntryId: entryId, OR: [{ isBefore: true }, { isAfter: true }] };
  }

  private async assertService(serviceId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } });
    if (!service) throw new NotFoundException(apiError('WORK_GALLERY_SERVICE_NOT_FOUND'));
  }

  /** Records offered to the admin; only the fields needed to identify a visit. */
  async listEligibleEntries(serviceId: string, offset: number, limit: number) {
    await this.assertService(serviceId);
    const rows = await this.prisma.dailyLogEntry.findMany({
      where: {
        ...this.eligibleEntriesWhere(serviceId),
        images: { none: { OR: [{ isBefore: true }, { isAfter: true }] } },
      },
      select: {
        id: true,
        completedAt: true,
        date: true,
        publicReferenceCode: true,
        client: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit + 1,
    });
    return {
      items: rows.slice(0, limit).map((row) => ({
        id: row.id,
        completedAt: row.completedAt ? row.completedAt.toISOString() : null,
        date: row.date.toISOString().slice(0, 10),
        reference: row.publicReferenceCode,
        clientName: row.client ? `${row.client.firstName} ${row.client.lastName}`.trim() : '',
      })),
      hasMore: rows.length > limit,
      nextOffset: offset + Math.min(rows.length, limit),
    };
  }

  /**
   * Private pairs that are not part of the consented feed yet. No file path is
   * returned: private files are only reachable with an authenticated request.
   */
  async listPendingConsent(serviceId: string, offset: number, limit: number) {
    await this.assertService(serviceId);
    const rows = await this.prisma.dailyLogEntry.findMany({
      where: {
        ...this.eligibleEntriesWhere(serviceId),
        images: {
          some: {
            OR: [{ isBefore: true }, { isAfter: true }],
            upload: { storageClass: UploadStorageClass.PRIVATE },
          },
        },
      },
      select: {
        id: true,
        completedAt: true,
        date: true,
        publicReferenceCode: true,
        client: { select: { firstName: true, lastName: true } },
        images: {
          where: { OR: [{ isBefore: true }, { isAfter: true }] },
          select: {
            id: true,
            isBefore: true,
            isAfter: true,
            upload: { select: { storageClass: true, mimeType: true } },
            consent: {
              select: {
                clientId: true,
                revokedAt: true,
                policyVersion: true,
                purpose: true,
                publishedUploadId: true,
              },
            },
          },
        },
      },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    const consented = await this.feed.consentedEntryIds(this.prisma, serviceId, page.map((row) => row.id));
    const consentedIds = new Set(consented);
    return {
      items: page
        .filter((row) => !consentedIds.has(row.id))
        .map((row) => ({
          id: row.id,
          completedAt: row.completedAt ? row.completedAt.toISOString() : null,
          date: row.date.toISOString().slice(0, 10),
          reference: row.publicReferenceCode,
          clientName: row.client ? `${row.client.firstName} ${row.client.lastName}`.trim() : '',
          images: row.images.map((image) => ({
            id: image.id,
            role: image.isBefore ? 'before' : image.isAfter ? 'after' : 'other',
            private:
              image.upload.storageClass === UploadStorageClass.PRIVATE,
            consented: Boolean(image.consent?.publishedUploadId) && image.consent?.revokedAt === null,
          })),
        })),
      hasMore: rows.length > limit,
      nextOffset: offset + Math.min(rows.length, limit),
    };
  }

  /**
   * Attach two private photos to one completed record. Files are written before
   * the transaction and removed again when the binding fails, so a partial pair
   * is never left behind. A process crash can still leave private files without
   * a database row.
   */
  async createPair(
    serviceId: string,
    entryId: string,
    before: Express.Multer.File,
    after: Express.Multer.File,
    actorId: string,
  ) {
    const entry = await this.prisma.dailyLogEntry.findFirst({
      where: { ...this.eligibleEntriesWhere(serviceId), id: entryId },
      select: { id: true },
    });
    if (!entry) throw new NotFoundException(apiError('WORK_GALLERY_ENTRY_NOT_FOUND'));
    if (await this.prisma.dailyLogImage.count({ where: this.pairImagesWhere(entryId) })) {
      throw new ConflictException(apiError('WORK_GALLERY_PAIR_ALREADY_EXISTS'));
    }

    const createdUploads: string[] = [];
    try {
      const beforeUpload = await this.uploads.saveWorkGalleryPhoto(before, actorId);
      createdUploads.push(beforeUpload.id);
      const afterUpload = await this.uploads.saveWorkGalleryPhoto(after, actorId);
      createdUploads.push(afterUpload.id);

      const images = await this.prisma.$transaction(async (tx) => {
        // Concurrent submissions serialize on the record; the second one re-checks.
        await tx.$queryRaw(Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${entryId} FOR UPDATE`);
        const fresh = await tx.dailyLogEntry.findFirst({
          where: { ...this.eligibleEntriesWhere(serviceId), id: entryId },
          select: { id: true },
        });
        if (!fresh) throw new ConflictException(apiError('WORK_GALLERY_ENTRY_NOT_ELIGIBLE'));
        if (await tx.dailyLogImage.count({ where: this.pairImagesWhere(entryId) })) {
          throw new ConflictException(apiError('WORK_GALLERY_PAIR_ALREADY_EXISTS'));
        }
        const beforeImage = await tx.dailyLogImage.create({
          data: { dailyLogEntryId: entryId, uploadId: beforeUpload.id, isBefore: true, isAfter: false },
          select: { id: true },
        });
        const afterImage = await tx.dailyLogImage.create({
          data: { dailyLogEntryId: entryId, uploadId: afterUpload.id, isBefore: false, isAfter: true },
          select: { id: true },
        });
        return { beforeImageId: beforeImage.id, afterImageId: afterImage.id };
      });

      return {
        entryId,
        ...images,
        storageClass: UploadStorageClass.PRIVATE,
        consentRequired: true,
      };
    } catch (error) {
      // Referenced uploads are never deleted, so an ambiguous commit is safe.
      for (const uploadId of createdUploads) {
        try {
          await this.uploads.deleteUnreferencedUpload(uploadId);
        } catch {
          this.logger.warn(`Private upload ${uploadId} could not be cleaned up after a failed pair`);
        }
      }
      throw error;
    }
  }

  /** Both photos are required; the controller rejects a missing file earlier. */
  assertBothPhotos(before?: Express.Multer.File, after?: Express.Multer.File): void {
    if (!before || !after) throw new BadRequestException(apiError('WORK_GALLERY_PAIR_PHOTOS_REQUIRED'));
  }
}
