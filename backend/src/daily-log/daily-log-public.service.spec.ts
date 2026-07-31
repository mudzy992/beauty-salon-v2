import { Test, TestingModule } from '@nestjs/testing';
import { DailyLogPublicService } from './daily-log-public.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  dailyLogEntry: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
};

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

  it('returns only entries that have both before and after uploads', async () => {
    mockPrisma.dailyLogEntry.count.mockResolvedValue(1);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([
      {
        id: 'e1',
        completedAt: new Date(),
        service: { id: 's1', name: 'Šišanje' },
        images: [
          {
            isBefore: true,
            isAfter: false,
            upload: {
              pathOriginal: '/b.jpg',
              pathMedium: null,
              pathThumb: null,
            },
          },
          {
            isBefore: false,
            isAfter: true,
            upload: {
              pathOriginal: '/a.jpg',
              pathMedium: null,
              pathThumb: null,
            },
          },
        ],
      },
    ]);
    const actual = await service.findBeforeAfterPairs({ limit: 10, offset: 0 });
    expect(actual.items).toHaveLength(1);
    expect(actual.items[0]?.before.pathOriginal).toBe('/b.jpg');
    expect(actual.hasMore).toBe(false);
    expect(actual.nextOffset).toBe(1);
  });

  it('skips entries missing upload on before/after', async () => {
    mockPrisma.dailyLogEntry.count.mockResolvedValue(1);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([
      {
        id: 'e2',
        completedAt: new Date(),
        service: { id: 's1', name: 'Šišanje' },
        images: [
          { isBefore: true, isAfter: false, upload: null },
          {
            isBefore: false,
            isAfter: true,
            upload: {
              pathOriginal: '/a.jpg',
              pathMedium: null,
              pathThumb: null,
            },
          },
        ],
      },
    ]);
    const actual = await service.findBeforeAfterPairs({ limit: 10 });
    expect(actual.items).toHaveLength(0);
  });

  it('queries with deletedAt null and both image flags', async () => {
    mockPrisma.dailyLogEntry.count.mockResolvedValue(0);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    await service.findBeforeAfterPairs({ limit: 5 });
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'COMPLETED',
          deletedAt: null,
          kind: 'SERVICE',
        }),
        take: 5,
        skip: 0,
      }),
    );
  });

  it('random mode returns shuffled subset without pagination', async () => {
    mockPrisma.dailyLogEntry.findMany
      .mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
      .mockResolvedValueOnce([
        {
          id: 'a',
          completedAt: null,
          service: { id: 's1', name: 'A' },
          images: [
            {
              isBefore: true,
              isAfter: false,
              upload: { pathOriginal: '/b1.jpg', pathMedium: null, pathThumb: null },
            },
            {
              isBefore: false,
              isAfter: true,
              upload: { pathOriginal: '/a1.jpg', pathMedium: null, pathThumb: null },
            },
          ],
        },
      ]);
    const actual = await service.findBeforeAfterPairs({ limit: 1, random: true });
    expect(actual.items.length).toBeLessThanOrEqual(1);
    expect(actual.hasMore).toBe(false);
  });
});
