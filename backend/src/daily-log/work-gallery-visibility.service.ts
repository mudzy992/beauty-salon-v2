import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { apiError } from '../common/errors/api-error-codes';

@Injectable()
export class WorkGalleryVisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async listHidden(serviceId: string, offset: number, limit: number) {
    const entries = await this.prisma.dailyLogEntry.findMany({
      where: { serviceId, status: 'COMPLETED', kind: 'SERVICE', deletedAt: null, workGalleryHidden: true },
      select: { id: true, completedAt: true },
      orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit + 1,
    });
    return { items: entries.slice(0, limit), hasMore: entries.length > limit, nextOffset: offset + Math.min(entries.length, limit) };
  }

  /** Rejects a different current state; this boolean CAS cannot detect an ABA cycle. */
  async setVisibility(serviceId: string, entryId: string, hidden: boolean, expectedHidden: boolean) {
    const eligible = { id: entryId, serviceId, status: 'COMPLETED', kind: 'SERVICE' as const, deletedAt: null };
    const result = await this.prisma.dailyLogEntry.updateMany({
      where: { ...eligible, workGalleryHidden: expectedHidden },
      data: { workGalleryHidden: hidden },
    });
    if (result.count === 1) return { hidden };
    const entry = await this.prisma.dailyLogEntry.findFirst({ where: eligible, select: { id: true } });
    if (!entry) throw new NotFoundException(apiError('WORK_GALLERY_ENTRY_NOT_FOUND'));
    throw new ConflictException(apiError('WORK_GALLERY_VISIBILITY_CONFLICT'));
  }
}
