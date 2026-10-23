import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DailyLogPublicService } from './daily-log-public.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

const mockPrisma = {
  dailyLogEntry: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

function makePairEntry(id: string) {
  return {
    id,
    clientId: 'client-1',
    completedAt: new Date(),
    service: { id: 's1', name: 'Šišanje' },
    images: [
      {
        isBefore: true,
        isAfter: false,
        consent: { id: `${id}-before-consent`, clientId: 'client-1' },
      },
      {
        isBefore: false,
        isAfter: true,
        consent: { id: `${id}-after-consent`, clientId: 'client-1' },
      },
    ],
  };
}

describe('DailyLogPublicService', () => {
  let service: DailyLogPublicService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyLogPublicService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(DailyLogPublicService);
  });

  it('returns only consented before/after routes and never raw upload paths', async () => {
    mockPrisma.dailyLogEntry.count.mockResolvedValue(1);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([makePairEntry('e1')]);

    const actual = await service.findBeforeAfterPairs({ limit: 10, offset: 0 });
    expect(actual.items).toHaveLength(1);
    expect(actual.items[0]?.before.pathOriginal).toBe(
      '/api/media/consents/e1-before-consent/file',
    );
    expect(actual.items[0]?.after.pathOriginal).toBe(
      '/api/media/consents/e1-after-consent/file',
    );
    expect(actual.items[0]?.before.pathMedium).toBeNull();
    expect(actual.items[0]?.after.pathThumb).toBeNull();
    expect(actual.hasMore).toBe(false);
    expect(actual.nextOffset).toBe(1);
  });

  it('skips entries unless each side has a matching active-consent projection', async () => {
    mockPrisma.dailyLogEntry.count.mockResolvedValue(1);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([
      {
        ...makePairEntry('e2'),
        images: [
          {
            isBefore: true,
            isAfter: false,
            consent: null,
          },
          {
            isBefore: false,
            isAfter: true,
            consent: { id: 'other-client-consent', clientId: 'client-2' },
          },
        ],
      },
    ]);
    const actual = await service.findBeforeAfterPairs({ limit: 10 });
    expect(actual.items).toHaveLength(0);
    expect(actual.nextOffset).toBe(1);
    expect(actual.hasMore).toBe(false);
  });

  it('filters for linked clients, completed undeleted services and current consent', async () => {
    mockPrisma.dailyLogEntry.count.mockResolvedValue(0);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    await service.findBeforeAfterPairs({ limit: 5 });
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'COMPLETED',
          deletedAt: null,
          kind: 'SERVICE',
          clientId: { not: null },
          images: {
            some: expect.objectContaining({
              isBefore: true,
              upload: { storageClass: 'PRIVATE' },
              consent: { is: expect.objectContaining({ revokedAt: null }) },
            }),
          },
        }),
        take: 5,
        skip: 0,
      }),
    );
  });

  it('caps the requested page size at 50 items', async () => {
    mockPrisma.dailyLogEntry.count.mockResolvedValue(0);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    await service.findBeforeAfterPairs({ limit: 100 });
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it('rejects an excessive pagination offset before database access', async () => {
    await expect(
      service.findBeforeAfterPairs({ offset: 1001 }),
    ).rejects.toThrow(BadRequestException);
    expect(mockPrisma.dailyLogEntry.count).not.toHaveBeenCalled();
    expect(mockPrisma.dailyLogEntry.findMany).not.toHaveBeenCalled();
  });

  it('stops paginated traversal after the maximum permitted offset', async () => {
    mockPrisma.dailyLogEntry.count.mockResolvedValue(2000);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue(
      Array.from({ length: 50 }, (_, index) => makePairEntry(`e${index}`)),
    );
    const actual = await service.findBeforeAfterPairs({
      limit: 50,
      offset: 1000,
    });
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 1000, take: 50 }),
    );
    expect(actual.items).toHaveLength(50);
    expect(actual.nextOffset).toBe(1050);
    expect(actual.hasMore).toBe(false);
  });

  it('uses an indexed circular random window without loading every candidate ID', async () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.5);
    mockPrisma.dailyLogEntry.findMany
      .mockResolvedValueOnce([makePairEntry('from-start')])
      .mockResolvedValueOnce([makePairEntry('wrapped')]);
    const actual = await service.findBeforeAfterPairs({
      limit: 2,
      offset: 5001,
      random: true,
    });
    expect(actual.items.map((item) => item.id)).toEqual([
      'from-start',
      'wrapped',
    ]);
    expect(actual).toMatchObject({ hasMore: false, nextOffset: 0 });
    expect(mockPrisma.dailyLogEntry.count).not.toHaveBeenCalled();
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ randomKey: { gte: 0.5 } }),
        orderBy: [{ randomKey: 'asc' }, { id: 'asc' }],
        take: 2,
        include: expect.objectContaining({ images: expect.any(Object) }),
      }),
    );
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ randomKey: { lt: 0.5 } }),
        orderBy: [{ randomKey: 'asc' }, { id: 'asc' }],
        take: 1,
      }),
    );
  });

  it('caps random gallery selection at 50 rows', async () => {
    jest.spyOn(Math, 'random').mockReturnValueOnce(0.25);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValueOnce(
      Array.from({ length: 50 }, (_, index) => makePairEntry(`e${index}`)),
    );
    const actual = await service.findBeforeAfterPairs({
      limit: 100,
      random: true,
    });
    expect(actual.items).toHaveLength(50);
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});
