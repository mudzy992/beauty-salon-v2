import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DailyLogPublicService } from './daily-log-public.service';

@Injectable()
export class WorkGalleryOrderService {
  constructor(private readonly prisma: PrismaService, private readonly feed: DailyLogPublicService) {}

  /** Read the order revision and page in one MVCC snapshot, not two unrelated requests. */
  async listVisible(serviceId: string, offset: number, limit: number) {
    return this.prisma.$transaction(async tx => {
      const service = await tx.service.findUnique({ where: { id: serviceId }, select: { id: true } });
      if (!service) throw new NotFoundException('Service not found');
      const state = await tx.workGalleryOrderState.findUnique({ where: { serviceId }, select: { revision: true } });
      const page = await this.feed.findBeforeAfterPairs({ serviceId, offset, limit }, true, tx);
      return { ...page, orderRevision: state?.revision ?? '0' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  /** Swap two visible comparisons. Only the service-filtered feed uses these ranks. */
  async swap(serviceId: string, first: { id: string; revision: string }, second: { id: string; revision: string }, expectedOrderRevision: string) {
    if (first.id === second.id) throw new BadRequestException('Distinct entries are required');
    return this.prisma.$transaction(async tx => {
      const service = await tx.service.findUnique({ where: { id: serviceId }, select: { id: true } });
      if (!service) throw new NotFoundException('Service not found');
      // Competing swaps serialize on this row. A losing request rolls back entirely.
      await tx.$executeRaw(Prisma.sql`INSERT INTO "work_gallery_order_state" ("service_id", "revision") VALUES (${serviceId}, '0') ON CONFLICT ("service_id") DO NOTHING`);
      const revision = randomUUID();
      const claimed = await tx.workGalleryOrderState.updateMany({ where: { serviceId, revision: expectedOrderRevision }, data: { revision } });
      if (!claimed.count) throw new ConflictException('Gallery order changed; refresh');

      const ids = [first.id, second.id].sort();
      // Match lock order across swaps and block concurrent hide/restore until validation finishes.
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
      const entries = await tx.dailyLogEntry.findMany({
        where: { id: { in: ids }, serviceId, status: 'COMPLETED', kind: 'SERVICE', deletedAt: null, workGalleryHidden: false },
        select: { id: true, workGalleryRevision: true },
      });
      if (entries.length !== 2 || entries.find(entry => entry.id === first.id)?.workGalleryRevision !== first.revision || entries.find(entry => entry.id === second.id)?.workGalleryRevision !== second.revision) {
        throw new ConflictException('Comparison changed; refresh');
      }
      if ((await this.feed.eligibleReorderIds(tx, serviceId, ids)).length !== 2) throw new ConflictException('Comparison is no longer eligible; refresh');

      let ordered = await tx.dailyLogEntry.findMany({ where: { id: { in: ids } }, select: { id: true, workGallerySortOrder: true } });
      let a = ordered.find(entry => entry.id === first.id)?.workGallerySortOrder;
      let b = ordered.find(entry => entry.id === second.id)?.workGallerySortOrder;
      const uniqueRanks = a != null && b != null && a !== b && await tx.dailyLogEntry.count({
        where: { serviceId, status: 'COMPLETED', kind: 'SERVICE', deletedAt: null, workGallerySortOrder: { in: [a, b] } },
      }) === 2;
      if (!uniqueRanks) {
        // Materialize the whole service only when a target has no unique rank. Include
        // hidden entries so that later restore keeps its position; stable tie-breakers
        // preserve existing order across page boundaries. Normally only two rows change.
        await tx.$executeRaw(Prisma.sql`
          UPDATE "daily_log_entries" AS e SET "work_gallery_sort_order" = ordered.position
          FROM (
            SELECT id, (row_number() OVER (ORDER BY "work_gallery_sort_order" ASC NULLS FIRST, "completed_at" DESC NULLS FIRST, id DESC))::integer AS position
            FROM "daily_log_entries"
            WHERE "service_id" = ${serviceId} AND "status" = 'COMPLETED' AND "kind" = 'SERVICE' AND "deleted_at" IS NULL
          ) AS ordered WHERE e.id = ordered.id
        `);
        ordered = await tx.dailyLogEntry.findMany({ where: { id: { in: ids } }, select: { id: true, workGallerySortOrder: true } });
        a = ordered.find(entry => entry.id === first.id)?.workGallerySortOrder;
        b = ordered.find(entry => entry.id === second.id)?.workGallerySortOrder;
      }
      if (a == null || b == null) throw new ConflictException('Comparison changed; refresh');
      if (await this.feed.hasEligibleReorderBetween(tx, serviceId, Math.min(a, b), Math.max(a, b))) {
        throw new ConflictException('Comparisons are no longer adjacent; refresh');
      }
      await tx.dailyLogEntry.update({ where: { id: first.id }, data: { workGallerySortOrder: b } });
      await tx.dailyLogEntry.update({ where: { id: second.id }, data: { workGallerySortOrder: a } });
      return { orderRevision: revision };
    });
  }
}
