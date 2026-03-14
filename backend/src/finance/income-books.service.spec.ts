import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IncomeBooksService } from './income-books.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
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
  dailyLogEntry: { findUnique: jest.fn() },
};

describe('IncomeBooksService', () => {
  let service: IncomeBooksService;

  beforeEach(async () => {
    jest.clearAllMocks();
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
    await expect(service.addEntryFromDailyLog('nope')).rejects.toThrow(NotFoundException);
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
});
