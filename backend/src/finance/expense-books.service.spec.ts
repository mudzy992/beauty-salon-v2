import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpenseBooksService } from './expense-books.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  expenseBook: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
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
    expect(mockPrisma.expenseBook.create).toHaveBeenCalledWith({
      data: { year: 2026, month: 3 },
      include: { expenses: { include: { category: true } } },
    });
  });

  it('close baca BadRequestException kada je knjiga već zatvorena', async () => {
    mockPrisma.expenseBook.findUnique.mockResolvedValue({
      id: 'b1',
      isClosed: true,
    });
    await expect(service.close('b1', 'user-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('findOne baca NotFoundException kada knjiga ne postoji', async () => {
    mockPrisma.expenseBook.findUnique.mockResolvedValue(null);
    await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
  });
});
