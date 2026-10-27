import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpenseBooksService } from './expense-books.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  $transaction: jest.fn(),
  expenseBook: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  expenseBookLockEvent: { create: jest.fn() },
};

describe('ExpenseBooksService', () => {
  let service: ExpenseBooksService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseBooksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ExpenseBooksService>(ExpenseBooksService);
    mockPrisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma),
    );
    mockPrisma.expenseBook.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.expenseBookLockEvent.create.mockResolvedValue({ id: 'event-1' });
  });

  it('getOrCreateForMonth kreira knjigu ako ne postoji', async () => {
    mockPrisma.expenseBook.findUnique.mockResolvedValue(null);
    mockPrisma.expenseBook.create.mockResolvedValue({
      id: 'b1',
      year: 2026,
      month: 3,
      expenses: [],
    });
    const result = await service.getOrCreateForMonth(2026, 3);
    expect(result.id).toBe('b1');
    expect(result.totalExpenses).toBe(0);
    expect(mockPrisma.expenseBook.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { year: 2026, month: 3 } }),
    );
  });

  it('close koristi conditional update i kreira jedan LOCK događaj', async () => {
    mockPrisma.expenseBook.findUnique.mockResolvedValue({
      id: 'b1',
      isClosed: true,
      expenses: [],
      lockEvents: [],
    });

    const result = await service.close('b1', 'user-1');

    expect(mockPrisma.expenseBook.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'b1', isClosed: false },
        data: expect.objectContaining({ isClosed: true, closedBy: 'user-1' }),
      }),
    );
    expect(mockPrisma.expenseBookLockEvent.create).toHaveBeenCalledWith({
      data: { bookId: 'b1', action: 'LOCK', createdById: 'user-1' },
    });
    expect(result.totalExpenses).toBe(0);
  });

  it('close baca BadRequestException kada je knjiga već zatvorena', async () => {
    mockPrisma.expenseBook.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.expenseBook.findUnique.mockResolvedValue({
      id: 'b1',
      isClosed: true,
    });
    await expect(service.close('b1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
    expect(mockPrisma.expenseBookLockEvent.create).not.toHaveBeenCalled();
  });

  it('unlockBook uslovno otključava prošlu knjigu i bilježi UNLOCK', async () => {
    mockPrisma.expenseBook.findUnique.mockResolvedValue({
      id: 'b1',
      year: new Date().getFullYear() - 1,
      month: 1,
      isClosed: true,
      expenses: [],
      lockEvents: [],
    });

    await service.unlockBook('b1', 'ispravka', 'user-1');

    expect(mockPrisma.expenseBook.updateMany).toHaveBeenCalledWith({
      where: { id: 'b1', isClosed: true },
      data: { isClosed: false, closedAt: null },
    });
    expect(mockPrisma.expenseBookLockEvent.create).toHaveBeenCalledWith({
      data: {
        bookId: 'b1',
        action: 'UNLOCK',
        reason: 'ispravka',
        createdById: 'user-1',
      },
    });
  });

  it('findOne baca NotFoundException kada knjiga ne postoji', async () => {
    mockPrisma.expenseBook.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });

  it('findOne vraća zbir totalExpenses iz stavki', async () => {
    mockPrisma.expenseBook.findUnique.mockResolvedValue({
      id: 'b1',
      expenses: [{ totalAmount: 96.65 }, { totalAmount: '10' }],
      lockEvents: [],
    });
    const result = await service.findOne('b1');
    expect(result.totalExpenses).toBe(106.65);
  });
});
