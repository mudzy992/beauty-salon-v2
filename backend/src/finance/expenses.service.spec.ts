import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createFinancePrismaMock,
  type FinancePrismaMock,
} from './testing/prisma-mock';

const user = { sub: 'u1', roles: ['OWNER'] } as never;

const category = {
  id: 'cat1',
  isActive: true,
  isFixed: true,
  template: {
    id: 't1',
    fields: [
      { id: 'f1', fieldName: 'Broj fakture', fieldType: 'TEXT', isRequired: true },
      { id: 'f2', fieldName: 'Iznos', fieldType: 'NUMBER', isRequired: false },
    ],
  },
};

const baseDto = {
  bookId: 'b1',
  categoryId: 'cat1',
  title: 'Struja',
  totalAmount: 120,
};

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: FinancePrismaMock;

  beforeEach(async () => {
    prisma = createFinancePrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ExpensesService);

    prisma.expenseBook.findUnique.mockResolvedValue({ id: 'b1', isClosed: false });
    prisma.expenseCategory.findUnique.mockResolvedValue(category);
    prisma.expense.create.mockResolvedValue({ id: 'ex1' });
    prisma.expense.findUnique.mockResolvedValue({
      id: 'ex1',
      categoryId: 'cat1',
      book: { id: 'b1', isClosed: false },
    });
  });

  describe('create', () => {
    it('odbija zatvorenu knjigu', async () => {
      prisma.expenseBook.findUnique.mockResolvedValue({ id: 'b1', isClosed: true });
      await expect(
        service.create({ ...baseDto, fieldValues: [] }, user),
      ).rejects.toThrow(BadRequestException);
    });

    it('odbija nedostajuće obavezno polje', async () => {
      await expect(
        service.create({ ...baseDto, fieldValues: [] }, user),
      ).rejects.toThrow(/Nedostaju obavezna polja: Broj fakture/);
      expect(prisma.expense.create).not.toHaveBeenCalled();
    });

    it('odbija polje koje ne pripada predlošku kategorije', async () => {
      await expect(
        service.create(
          {
            ...baseDto,
            fieldValues: [
              { fieldId: 'f1', value: '123' },
              { fieldId: 'tudje', value: 'x' },
            ],
          },
          user,
        ),
      ).rejects.toThrow(/ne pripada predlošku/);
    });

    it('odbija nenumeričku vrijednost u NUMBER polju', async () => {
      await expect(
        service.create(
          {
            ...baseDto,
            fieldValues: [
              { fieldId: 'f1', value: '123' },
              { fieldId: 'f2', value: 'abc' },
            ],
          },
          user,
        ),
      ).rejects.toThrow(/mora biti broj/);
    });

    it('odbija neaktivnu kategoriju', async () => {
      prisma.expenseCategory.findUnique.mockResolvedValue({
        ...category,
        isActive: false,
      });
      await expect(
        service.create(
          { ...baseDto, fieldValues: [{ fieldId: 'f1', value: '123' }] },
          user,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('za nefiksnu kategoriju bez kolona ne forsira fieldValues', async () => {
      prisma.expenseCategory.findUnique.mockResolvedValue({
        ...category,
        isFixed: false,
        template: { id: 't1', fields: [] },
      });
      await service.create({ ...baseDto, fieldValues: [] }, user);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('za nefiksnu kategoriju validira line items iz notes v2', async () => {
      prisma.expenseCategory.findUnique.mockResolvedValue({
        ...category,
        isFixed: false,
        template: {
          id: 't1',
          fields: [
            { id: 'l', fieldName: 'Naziv', fieldType: 'TEXT', isRequired: true, lineRole: 'LABEL' },
            { id: 'q', fieldName: 'Kol', fieldType: 'NUMBER', isRequired: true, lineRole: 'QTY' },
            { id: 'p', fieldName: 'Cijena', fieldType: 'CURRENCY', isRequired: true, lineRole: 'UNIT_PRICE' },
          ],
        },
      });
      const notes = JSON.stringify({
        v: 2,
        lineItems: [{ values: { l: 'Lak', q: '2', p: '60' } }],
        userNotes: '',
      });
      await service.create(
        { ...baseDto, totalAmount: 120, notes, fieldValues: [] },
        user,
      );
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('kreira rashod i vrijednosti polja u jednoj transakciji', async () => {
      await service.create(
        { ...baseDto, fieldValues: [{ fieldId: 'f1', value: '123' }] },
        user,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.expenseFieldValue.createMany).toHaveBeenCalledWith({
        data: [{ expenseId: 'ex1', fieldId: 'f1', value: '123' }],
      });
    });
  });

  describe('update', () => {
    it('odbija izmjenu u zatvorenoj knjizi', async () => {
      prisma.expense.findUnique.mockResolvedValue({
        id: 'ex1',
        categoryId: 'cat1',
        book: { id: 'b1', isClosed: true },
      });
      await expect(service.update('ex1', { title: 'x' }, user)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('validira polja prije brisanja postojećih vrijednosti', async () => {
      await expect(
        service.update('ex1', { fieldValues: [] }, user),
      ).rejects.toThrow(/Nedostaju obavezna polja/);
      expect(prisma.expenseFieldValue.deleteMany).not.toHaveBeenCalled();
    });

    it('zamjenjuje vrijednosti polja unutar transakcije', async () => {
      await service.update(
        'ex1',
        { fieldValues: [{ fieldId: 'f1', value: '999' }] },
        user,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.expenseFieldValue.deleteMany).toHaveBeenCalledWith({
        where: { expenseId: 'ex1' },
      });
      expect(prisma.expenseFieldValue.createMany).toHaveBeenCalled();
    });

    it('ne dira vrijednosti polja kada nisu poslane', async () => {
      await service.update('ex1', { title: 'Novi naziv' }, user);
      expect(prisma.expenseFieldValue.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('baca kada rashod ne postoji', async () => {
      prisma.expense.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });
});
