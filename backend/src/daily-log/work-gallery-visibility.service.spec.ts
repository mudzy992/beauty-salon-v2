import { ConflictException, NotFoundException } from '@nestjs/common';
import { WorkGalleryVisibilityService } from './work-gallery-visibility.service';
import { PrismaService } from '../prisma/prisma.service';

const prisma = {
  dailyLogEntry: { updateMany: jest.fn(), findFirst: jest.fn() },
};

describe('WorkGalleryVisibilityService', () => {
  const service = new WorkGalleryVisibilityService(prisma as unknown as PrismaService);
  beforeEach(() => jest.resetAllMocks());

  it('changes only the requested completed service entry without touching originals or consent', async () => {
    prisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.setVisibility('service-1', 'entry-1', true, false)).resolves.toEqual({ hidden: true });
    expect(prisma.dailyLogEntry.updateMany).toHaveBeenCalledWith({
      where: { id: 'entry-1', serviceId: 'service-1', status: 'COMPLETED', kind: 'SERVICE', deletedAt: null, workGalleryHidden: false },
      data: { workGalleryHidden: true },
    });
    expect(prisma.dailyLogEntry.findFirst).not.toHaveBeenCalled();
  });

  it('can restore a hidden entry without overriding consent checks', async () => {
    prisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.setVisibility('service-1', 'entry-1', false, true)).resolves.toEqual({ hidden: false });
    expect(prisma.dailyLogEntry.updateMany.mock.calls[0][0].data).toEqual({ workGalleryHidden: false });
  });

  it('reports a conflict for a stale visibility value', async () => {
    prisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 0 });
    prisma.dailyLogEntry.findFirst.mockResolvedValue({ id: 'entry-1' });
    await expect(service.setVisibility('service-1', 'entry-1', true, false)).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not expose or mutate entries belonging to another service or an ineligible record', async () => {
    prisma.dailyLogEntry.updateMany.mockResolvedValue({ count: 0 });
    prisma.dailyLogEntry.findFirst.mockResolvedValue(null);
    await expect(service.setVisibility('service-1', 'entry-1', true, false)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.dailyLogEntry.findFirst).toHaveBeenCalledWith({ where: { id: 'entry-1', serviceId: 'service-1', status: 'COMPLETED', kind: 'SERVICE', deletedAt: null }, select: { id: true } });
  });
});
