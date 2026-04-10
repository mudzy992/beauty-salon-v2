import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IncomeBooksService } from './income-books.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  $transaction: jest.fn(),
  service: {
    findUnique: jest.fn(),
  },
  incomeBook: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  incomeBookEntry: {
    findUnique: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
  },
  incomeBookManualEntry: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    aggregate: jest.fn(),
  },
  incomeBookManualEntryAudit: {
    create: jest.fn(),
  },
  dailyLogEntry: { findUnique: jest.fn() },
};

describe('IncomeBooksService', () => {
  let service: IncomeBooksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncomeBooksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<IncomeBooksService>(IncomeBooksService);
  });

  it('addEntryFromDailyLog baca NotFoundException kada daily log zapis ne postoji', async () => {
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue(null);
    await expect(service.addEntryFromDailyLog('nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('addEntryFromDailyLog baca kada status nije COMPLETED', async () => {
    mockPrisma.dailyLogEntry.findUnique.mockResolvedValue({
      id: 'e1',
      status: 'PENDING',
      date: new Date('2026-03-15'),
      actualPrice: 50,
      tipAmount: 5,
    });
    await expect(service.addEntryFromDailyLog('e1')).rejects.toThrow();
  });

  it('getOrCreateForMonth kreira knjigu ako ne postoji', async () => {
    mockPrisma.incomeBook.findUnique.mockResolvedValue(null);
    mockPrisma.incomeBook.create.mockResolvedValue({
      id: 'b1',
      year: 2026,
      month: 3,
      entries: [],
    });
    const result = await service.getOrCreateForMonth(2026, 3);
    expect(result.id).toBe('b1');
  });

  it('unlockBook baca BadRequestException kada nema razloga', async () => {
    await expect(service.unlockBook('b1', '  ', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('unlockBook baca BadRequestException kada knjiga nije iz prošlosti', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-10T10:00:00Z'));
    mockPrisma.incomeBook.findUnique.mockResolvedValue({
      id: 'b1',
      year: 2026,
      month: 3,
      closedAt: new Date('2026-03-01T00:00:00Z'),
    });
    await expect(
      service.unlockBook('b1', 'ispravka', 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('unlockBook otključava prošli mjesec i kreira lock event', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-10T10:00:00Z'));
    mockPrisma.incomeBook.findUnique.mockResolvedValue({
      id: 'b1',
      year: 2026,
      month: 2,
      closedAt: new Date('2026-03-01T00:00:00Z'),
    });
    mockPrisma.incomeBook.update.mockResolvedValue({
      id: 'b1',
      closedAt: null,
    });
    const result = await service.unlockBook('b1', 'Korekcija', 'user-1');
    expect(result.id).toBe('b1');
    expect(mockPrisma.incomeBook.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: expect.objectContaining({
          closedAt: null,
          lockEvents: {
            create: expect.objectContaining({
              action: 'UNLOCK',
              reason: 'Korekcija',
              createdById: 'user-1',
            }),
          },
        }),
      }),
    );
  });

  it('lockBook zaključava otključanu knjigu i kreira lock event', async () => {
    mockPrisma.incomeBook.findUnique.mockResolvedValue({
      id: 'b1',
      closedAt: null,
    });
    mockPrisma.incomeBook.update.mockResolvedValue({
      id: 'b1',
      closedAt: new Date(),
    });
    const result = await service.lockBook('b1', 'user-1');
    expect(result.id).toBe('b1');
    expect(mockPrisma.incomeBook.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: expect.objectContaining({
          lockEvents: {
            create: expect.objectContaining({
              action: 'LOCK',
              createdById: 'user-1',
            }),
          },
        }),
      }),
    );
  });

  it('createManualEntry kreira ručni prihod + audit i ažurira total', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-10T10:00:00Z'));
    mockPrisma.incomeBook.findUnique.mockResolvedValue({
      id: 'b1',
      year: 2026,
      month: 2,
      closedAt: null,
    });
    mockPrisma.incomeBookManualEntry.create.mockResolvedValue({
      id: 'm1',
      bookId: 'b1',
      date: new Date('2026-02-05T00:00:00Z'),
      serviceId: 's1',
      stylistProfileId: null,
      amount: 100,
      tipAmount: 10,
      notes: null,
    });
    mockPrisma.incomeBookManualEntryAudit.create.mockResolvedValue({ id: 'a1' });
    mockPrisma.incomeBookEntry.aggregate.mockResolvedValue({
      _sum: { amount: 50, tipAmount: 5 },
    });
    mockPrisma.incomeBookManualEntry.aggregate.mockResolvedValue({
      _sum: { amount: 100, tipAmount: 10 },
    });
    mockPrisma.incomeBook.update.mockResolvedValue({ id: 'b1' });
    mockPrisma.service.findUnique.mockResolvedValue({
      id: 's1',
      price: 100,
      name: 'Usluga',
    });

    const result = await service.createManualEntry(
      'b1',
      { date: '2026-02-05', serviceId: 's1', paidAmount: 110 },
      'user-1',
    );
    expect(result.id).toBe('m1');
    expect(mockPrisma.incomeBookManualEntryAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          bookId: 'b1',
          manualEntryId: 'm1',
          action: 'CREATE',
          createdById: 'user-1',
        }),
      }),
    );
    expect(mockPrisma.incomeBook.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1' },
        data: { totalRevenue: 150, totalTips: 15 },
      }),
    );
  });

  it('createManualEntry dozvoljava unos u tekući mjesec kada je knjiga otključana', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-10T10:00:00Z'));
    mockPrisma.incomeBook.findUnique.mockResolvedValue({
      id: 'b1',
      year: 2026,
      month: 3,
      closedAt: null,
    });
    mockPrisma.incomeBookManualEntry.create.mockResolvedValue({
      id: 'm1',
      bookId: 'b1',
      date: new Date('2026-03-05T00:00:00Z'),
      serviceId: 's1',
      stylistProfileId: null,
      amount: 100,
      tipAmount: 10,
      notes: null,
    });
    mockPrisma.incomeBookManualEntryAudit.create.mockResolvedValue({ id: 'a1' });
    mockPrisma.incomeBookEntry.aggregate.mockResolvedValue({
      _sum: { amount: 0, tipAmount: 0 },
    });
    mockPrisma.incomeBookManualEntry.aggregate.mockResolvedValue({
      _sum: { amount: 100, tipAmount: 10 },
    });
    mockPrisma.incomeBook.update.mockResolvedValue({ id: 'b1' });
    mockPrisma.service.findUnique.mockResolvedValue({
      id: 's1',
      price: 100,
      name: 'Usluga',
    });

    const result = await service.createManualEntry(
      'b1',
      { date: '2026-03-05', serviceId: 's1', paidAmount: 110 },
      'user-1',
    );
    expect(result.id).toBe('m1');
  });

  it('createManualEntry baca BadRequestException za buduću knjigu', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-10T10:00:00Z'));
    mockPrisma.incomeBook.findUnique.mockResolvedValue({
      id: 'b1',
      year: 2026,
      month: 4,
      closedAt: null,
    });

    await expect(
      service.createManualEntry(
        'b1',
        { date: '2026-04-05', serviceId: 's1', paidAmount: 110 },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('getOrCreateForMonth baca BadRequestException za budući mjesec', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-10T10:00:00Z'));
    await expect(service.getOrCreateForMonth(2026, 4)).rejects.toThrow(
      BadRequestException,
    );
  });
});
