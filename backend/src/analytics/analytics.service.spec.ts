jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  incomeBook: { findUnique: jest.fn() },
  expenseBook: { findUnique: jest.fn() },
  reservation: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  dailyLogEntry: { findMany: jest.fn() },
  incomeBookManualEntry: { findMany: jest.fn() },
};

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('rejects malformed, reversed and overlong dashboard date ranges before querying Prisma', async () => {
    await expect(
      service.getDashboard(['OWNER'], {
        fromDate: '2020-01-01',
        toDate: '2025-01-02',
      }),
    ).rejects.toThrow('Analytics date range ne može biti duži od 60 mjeseci.');
    await expect(
      service.getDashboard(['OWNER'], {
        fromDate: '2026-02-01',
        toDate: '2026-01-31',
      }),
    ).rejects.toThrow('fromDate ne može biti poslije toDate.');
    await expect(
      service.getDashboard(['OWNER'], { monthsBack: 61 }),
    ).rejects.toThrow('monthsBack mora biti između 1 i 60.');

    expect(mockPrisma.incomeBook.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.reservation.groupBy).not.toHaveBeenCalled();
  });

  it('getDashboard uključuje manual income u topServices i stylistPerformance', async () => {
    mockPrisma.incomeBook.findUnique.mockResolvedValue({
      totalRevenue: 0,
      totalTips: 0,
    });
    mockPrisma.expenseBook.findUnique.mockResolvedValue({ expenses: [] });
    mockPrisma.reservation.groupBy.mockResolvedValue([
      { status: 'COMPLETED', _count: { id: 0 } },
    ]);
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValueOnce([]); // stylistPerformance daily log
    mockPrisma.incomeBookManualEntry.findMany.mockResolvedValueOnce([
      {
        id: 'm1',
        serviceId: 's1',
        amount: 50,
        tipAmount: 5,
        date: new Date('2026-03-05T00:00:00Z'),
        stylistProfileId: 'sp1',
        service: { id: 's1', name: 'Manicure' },
        stylistProfile: {
          user: { firstName: 'Ana', lastName: 'A', username: 'ana' },
        },
      },
    ]); // stylistPerformance manual
    mockPrisma.dailyLogEntry.findMany.mockResolvedValueOnce([]); // topServices daily log
    mockPrisma.incomeBookManualEntry.findMany.mockResolvedValueOnce([
      {
        id: 'm2',
        serviceId: 's1',
        amount: 50,
        date: new Date('2026-03-06T00:00:00Z'),
        service: { id: 's1', name: 'Manicure' },
      },
    ]); // topServices manual

    const result = await service.getDashboard(['OWNER'], {
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    });

    expect(result.topServices).toEqual([
      expect.objectContaining({
        serviceId: 's1',
        serviceName: 'Manicure',
        count: 1,
        revenue: 50,
      }),
    ]);
    expect(result.stylistPerformance).toEqual([
      expect.objectContaining({
        stylistProfileId: 'sp1',
        stylistName: 'Ana A',
        completedCount: 1,
        revenue: 50,
        tips: 5,
      }),
    ]);
    expect(result.periodFinance).toEqual({
      servicesRevenue: 0,
      tips: 0,
      totalIncome: 0,
      expensesByCategory: [],
      totalExpenses: 0,
      netProfit: 0,
    });
    const dateBounds = {
      gte: new Date('2026-03-01T00:00:00.000Z'),
      lt: new Date('2026-04-01T00:00:00.000Z'),
    };
    expect(mockPrisma.reservation.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ reservationDate: dateBounds }),
      }),
    );
    expect(mockPrisma.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'COMPLETED', reservationDate: dateBounds },
      }),
    );
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          status: 'COMPLETED',
          deletedAt: null,
          date: dateBounds,
        },
      }),
    );
    expect(mockPrisma.dailyLogEntry.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          status: 'COMPLETED',
          deletedAt: null,
          date: dateBounds,
        },
      }),
    );
    expect(mockPrisma.incomeBook.findUnique).toHaveBeenCalledTimes(1);
    expect(mockPrisma.incomeBook.findUnique).toHaveBeenCalledWith({
      where: { year_month: { year: 2026, month: 3 } },
    });
  });

  it('uses UTC calendar dates and months for dashboard relative ranges', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-22T01:00:00.000Z'));
    mockPrisma.incomeBook.findUnique.mockResolvedValue(null);
    mockPrisma.expenseBook.findUnique.mockResolvedValue(null);
    mockPrisma.reservation.groupBy.mockResolvedValue([]);
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    mockPrisma.incomeBookManualEntry.findMany.mockResolvedValue([]);

    try {
      const result = await service.getDashboard(['OWNER'], { monthsBack: 1 });

      expect(result.fromDate).toBe('2026-09-01');
      expect(result.toDate).toBe('2026-10-22');
      expect(mockPrisma.incomeBook.findUnique).toHaveBeenNthCalledWith(1, {
        where: { year_month: { year: 2026, month: 9 } },
      });
      expect(mockPrisma.incomeBook.findUnique).toHaveBeenNthCalledWith(2, {
        where: { year_month: { year: 2026, month: 10 } },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('getDashboard periodFinance sabira prihode, rashode po kategoriji i neto zaradu', async () => {
    mockPrisma.incomeBook.findUnique.mockResolvedValue({
      totalRevenue: 100,
      totalTips: 25,
    });
    mockPrisma.expenseBook.findUnique.mockResolvedValue({
      expenses: [
        { totalAmount: 30, category: { id: 'c1', name: 'Najam' } },
        { totalAmount: 10, category: { id: 'c1', name: 'Najam' } },
        { totalAmount: 5, category: { id: 'c2', name: 'Materijal' } },
      ],
    });
    mockPrisma.reservation.groupBy.mockResolvedValue([
      { status: 'COMPLETED', _count: { id: 0 } },
    ]);
    mockPrisma.reservation.findMany.mockResolvedValue([]);
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([]);
    mockPrisma.incomeBookManualEntry.findMany.mockResolvedValue([]);

    const result = await service.getDashboard(['OWNER'], {
      fromDate: '2026-02-01',
      toDate: '2026-02-28',
    });

    expect(result.periodFinance).toEqual({
      servicesRevenue: 100,
      tips: 25,
      totalIncome: 125,
      expensesByCategory: [
        { categoryId: 'c2', categoryName: 'Materijal', total: 5 },
        { categoryId: 'c1', categoryName: 'Najam', total: 40 },
      ],
      totalExpenses: 45,
      netProfit: 80,
    });
  });
});
