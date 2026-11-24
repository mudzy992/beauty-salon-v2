import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { WorkGalleryVisibilityService } from './work-gallery-visibility.service';
import { PrismaService } from '../prisma/prisma.service';

const prisma = { dailyLogEntry: { updateMany: jest.fn(), findFirst: jest.fn() } };

describe('WorkGalleryVisibilityService', () => {
  const service = new WorkGalleryVisibilityService(prisma as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());

  it('changes only the requested completed entry and rotates its token atomically', async () => {
    prisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 1 });
    const result = await service.setVisibility('service-1', 'entry-1', true, false, '0');
    expect(result).toEqual({ hidden: true, revision: expect.any(String) });
    expect(result.revision).toMatch(/^[0-9a-f-]{36}$/);
    expect(prisma.dailyLogEntry.updateMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', serviceId: 'service-1', status: 'COMPLETED', kind: 'SERVICE', deletedAt: null, workGalleryHidden: false, workGalleryRevision: '0' },
      data: { workGalleryHidden: true, workGalleryRevision: result.revision },
    });
    expect(prisma.dailyLogEntry.findFirst).not.toHaveBeenCalled();
  });

  it('restores without overriding consent checks', async () => {
    prisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 1 });
    const result = await service.setVisibility('service-1', 'entry-1', false, true, '0');
    expect(result.hidden).toBe(false);
    expect(prisma.dailyLogEntry.updateMany.mock.calls[0][0].data).toEqual({ workGalleryHidden: false, workGalleryRevision: result.revision });
  });

  it('rejects no-op changes without issuing a write', async () => {
    await expect(service.setVisibility('service-1', 'entry-1', true, true, '0')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.dailyLogEntry.updateMany).not.toHaveBeenCalled();
  });

  it('reports a conflict for a stale state or revision', async () => {
    prisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 0 });
    prisma.dailyLogEntry.findFirst.mockResolvedValue({ id: 'entry-1' });
    await expect(service.setVisibility('service-1', 'entry-1', true, false, '0')).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not expose or mutate entries belonging to another service or an ineligible record', async () => {
    prisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 0 });
    prisma.dailyLogEntry.findFirst.mockResolvedValue(null);
    await expect(service.setVisibility('service-1', 'entry-1', true, false, '0')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.dailyLogEntry.findFirst).toHaveBeenCalledWith({ where: { id: 'entry-1', serviceId: 'service-1', status: 'COMPLETED', kind: 'SERVICE', deletedAt: null }, select: { id: true } });
  });
});
