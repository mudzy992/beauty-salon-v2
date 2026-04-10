import { Test, TestingModule } from '@nestjs/testing'
import { AnalyticsService } from './analytics.service'
import { PrismaService } from '../prisma/prisma.service'

const mockPrisma = {
  incomeBook: { findUnique: jest.fn() },
  expenseBook: { findUnique: jest.fn() },
  reservation: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  dailyLogEntry: { findMany: jest.fn() },
  incomeBookManualEntry: { findMany: jest.fn() },
}

describe('AnalyticsService', () => {
  let service: AnalyticsService

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()
    service = module.get<AnalyticsService>(AnalyticsService)
  })

  it('getDashboard uključuje manual income u topServices i stylistPerformance', async () => {
    mockPrisma.incomeBook.findUnique.mockResolvedValue({ totalRevenue: 0, totalTips: 0 })
    mockPrisma.expenseBook.findUnique.mockResolvedValue({ expenses: [] })
    mockPrisma.reservation.groupBy.mockResolvedValue([
      { status: 'COMPLETED', _count: { id: 0 } },
    ])
    mockPrisma.reservation.findMany.mockResolvedValue([])
    mockPrisma.dailyLogEntry.findMany.mockResolvedValueOnce([]) // stylistPerformance daily log
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
    ]) // stylistPerformance manual
    mockPrisma.dailyLogEntry.findMany.mockResolvedValueOnce([]) // topServices daily log
    mockPrisma.incomeBookManualEntry.findMany.mockResolvedValueOnce([
      {
        id: 'm2',
        serviceId: 's1',
        amount: 50,
        date: new Date('2026-03-06T00:00:00Z'),
        service: { id: 's1', name: 'Manicure' },
      },
    ]) // topServices manual

    const result = await service.getDashboard(['OWNER'], {
      fromDate: '2026-03-01',
      toDate: '2026-03-31',
    })

    expect(result.topServices).toEqual([
      expect.objectContaining({
        serviceId: 's1',
        serviceName: 'Manicure',
        count: 1,
        revenue: 50,
      }),
    ])
    expect(result.stylistPerformance).toEqual([
      expect.objectContaining({
        stylistProfileId: 'sp1',
        stylistName: 'Ana A',
        completedCount: 1,
        revenue: 50,
        tips: 5,
      }),
    ])
    expect(result.periodFinance).toEqual({
      servicesRevenue: 0,
      tips: 0,
      totalIncome: 0,
      expensesByCategory: [],
      totalExpenses: 0,
      netProfit: 0,
    })
  })

  it('getDashboard periodFinance sabira prihode, rashode po kategoriji i neto zaradu', async () => {
    mockPrisma.incomeBook.findUnique.mockResolvedValue({
      totalRevenue: 100,
      totalTips: 25,
    })
    mockPrisma.expenseBook.findUnique.mockResolvedValue({
      expenses: [
        { totalAmount: 30, category: { id: 'c1', name: 'Najam' } },
        { totalAmount: 10, category: { id: 'c1', name: 'Najam' } },
        { totalAmount: 5, category: { id: 'c2', name: 'Materijal' } },
      ],
    })
    mockPrisma.reservation.groupBy.mockResolvedValue([
      { status: 'COMPLETED', _count: { id: 0 } },
    ])
    mockPrisma.reservation.findMany.mockResolvedValue([])
    mockPrisma.dailyLogEntry.findMany.mockResolvedValue([])
    mockPrisma.incomeBookManualEntry.findMany.mockResolvedValue([])

    const result = await service.getDashboard(['OWNER'], {
      fromDate: '2026-02-01',
      toDate: '2026-02-28',
    })

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
    })
  })
})

