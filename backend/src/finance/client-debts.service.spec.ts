import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ClientDebtsService } from './client-debts.service';
import { IncomeSyncService } from './income-sync.service';
import { IncomeManualEntriesService } from './income-manual-entries.service';
import { IncomeBooksService } from './income-books.service';
import { IncomeBookRepository } from './repositories/income-book.repository';
import { PrismaService } from '../prisma/prisma.service';
import {
  createFinancePrismaMock,
  type FinancePrismaMock,
} from './testing/prisma-mock';

const owner = { sub: 'u1', roles: ['OWNER'] };
const stylist = { sub: 'u2', roles: ['STYLIST'] };

const openDebt = {
  id: 'd1',
  status: 'OPEN',
  clientId: 'c1',
  stylistProfileId: 'st1',
  serviceId: 's1',
  reservationId: null,
  dailyLogEntryId: null,
  amount: new Prisma.Decimal(40),
  reservation: null,
  dailyLogEntry: null,
};

describe('ClientDebtsService', () => {
  let service: ClientDebtsService;
  let prisma: FinancePrismaMock;

  beforeEach(async () => {
    prisma = createFinancePrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientDebtsService,
        IncomeSyncService,
        IncomeManualEntriesService,
        IncomeBooksService,
        IncomeBookRepository,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ClientDebtsService);

    prisma.incomeBookEntry.aggregate.mockResolvedValue({ _sum: {} });
    prisma.incomeBookManualEntry.aggregate.mockResolvedValue({ _sum: {} });
    prisma.clientDebt.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _sum: { amount: null },
    });
    prisma.clientDebt.update.mockResolvedValue(openDebt);
    prisma.clientDebt.updateMany.mockResolvedValue({ count: 1 });
    prisma.dailyLogEntry.create.mockResolvedValue({ id: 'dl1' });
  });

  describe('listForClient', () => {
    it('scopes stylist debt reads to the stylist profile for another client', async () => {
      prisma.stylistProfile.findUnique.mockResolvedValue({ id: 'st1' });
      prisma.clientDebt.findMany.mockResolvedValue([openDebt]);

      await service.listForClient('c1', stylist);

      expect(prisma.stylistProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: stylist.sub },
        select: { id: true },
      });
      expect(prisma.clientDebt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            clientId: 'c1',
            status: 'OPEN',
            stylistProfileId: 'st1',
          },
        }),
      );
    });

    it('denies stylist reads for another client when the profile is missing', async () => {
      prisma.stylistProfile.findUnique.mockResolvedValue(null);

      await expect(service.listForClient('c1', stylist)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.clientDebt.findMany).not.toHaveBeenCalled();
    });

    it('keeps owner debt reads salon-wide', async () => {
      prisma.clientDebt.findMany.mockResolvedValue([openDebt]);

      await service.listForClient('c1', owner);

      expect(prisma.clientDebt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clientId: 'c1', status: 'OPEN' },
        }),
      );
    });
  });

  describe('writeOff', () => {
    it('zahtijeva razlog otpisa', async () => {
      await expect(service.writeOff('d1', { note: '' }, owner)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('zabranjuje stilisti otpis duga', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(openDebt);
      await expect(
        service.writeOff('d1', { note: 'nenaplativo' }, stylist),
      ).rejects.toThrow(ForbiddenException);
    });

    it('zatvara dug uslovnom transakcijom bez knjiženja prihoda', async () => {
      prisma.clientDebt.findUnique
        .mockResolvedValueOnce(openDebt)
        .mockResolvedValueOnce({ ...openDebt, status: 'SETTLED' });

      await service.writeOff('d1', { note: 'nenaplativo' }, owner);

      expect(prisma.clientDebt.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd1', status: 'OPEN' },
          data: expect.objectContaining({ note: '[OTPIS] nenaplativo' }),
        }),
      );
      expect(prisma.incomeBookManualEntry.create).not.toHaveBeenCalled();
    });

    it('konfliktuje ako je dug zatvoren prije uslovnog otpisa', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(openDebt);
      prisma.clientDebt.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.writeOff('d1', { note: 'nenaplativo' }, owner),
      ).rejects.toThrow(ConflictException);
    });

    it('odbija već zatvoren dug', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue({
        ...openDebt,
        status: 'SETTLED',
      });
      await expect(
        service.writeOff('d1', { note: 'nenaplativo' }, owner),
      ).rejects.toThrow(BadRequestException);
    });

    it('baca kada dug ne postoji', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(null);
      await expect(
        service.writeOff('nope', { note: 'nenaplativo' }, owner),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('repayDebt', () => {
    it('odbija naplatu u zaključanu knjigu', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(openDebt);
      prisma.incomeBook.upsert.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: new Date(),
      });
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: new Date(),
      });

      await expect(
        service.repayDebt('d1', { date: '2026-03-10' }, owner),
      ).rejects.toThrow('Mjesec je zaključan u KIF-u.');
      expect(prisma.incomeBookManualEntry.create).not.toHaveBeenCalled();
    });

    it('atomically claims and knjiži naplatu u KIF uz DEBT_PAYMENT zapis', async () => {
      prisma.clientDebt.findUnique
        .mockResolvedValueOnce(openDebt)
        .mockResolvedValueOnce({ ...openDebt, status: 'SETTLED' });
      prisma.incomeBook.upsert.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });

      await service.repayDebt('d1', { date: '2026-03-10' }, owner);

      expect(prisma.clientDebt.updateMany).toHaveBeenCalledWith({
        where: { id: 'd1', status: 'OPEN' },
        data: expect.objectContaining({
          status: 'SETTLED',
          settledById: 'u1',
        }),
      });
      const data = prisma.incomeBookManualEntry.create.mock.calls[0][0].data;
      expect(data.amount).toBe(40);
      expect(data.tipAmount).toBe(0);
      expect(data.dailyLogEntryId).toBe('dl1');
    });

    it('vraća raniji aktivni DEBT_PAYMENT za ponovljeni zahtjev', async () => {
      const settledDebt = { ...openDebt, status: 'SETTLED' };
      prisma.clientDebt.findUnique.mockResolvedValue(settledDebt);
      prisma.dailyLogEntry.findFirst.mockResolvedValue({ id: 'dl-existing' });

      await expect(
        service.repayDebt('d1', { date: '2026-03-10' }, owner),
      ).resolves.toEqual({
        settled: settledDebt,
        debtPaymentDailyLogId: 'dl-existing',
      });
      expect(prisma.clientDebt.updateMany).not.toHaveBeenCalled();
      expect(prisma.dailyLogEntry.create).not.toHaveBeenCalled();
      expect(prisma.incomeBookManualEntry.create).not.toHaveBeenCalled();
    });

    it('vraća konflikt kada drugi zahtjev već preuzme dug', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(openDebt);
      prisma.incomeBook.upsert.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });
      prisma.clientDebt.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.repayDebt('d1', { date: '2026-03-10' }, owner),
      ).rejects.toThrow(ConflictException);
      expect(prisma.dailyLogEntry.create).not.toHaveBeenCalled();
      expect(prisma.incomeBookManualEntry.create).not.toHaveBeenCalled();
    });

    it('odbija naplatu tuđeg duga od strane stiliste', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(openDebt);
      prisma.stylistProfile.findUnique.mockResolvedValue({ id: 'drugi' });

      await expect(service.repayDebt('d1', {}, stylist)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('listAll', () => {
    it('odbija nevalidan status', async () => {
      await expect(service.listAll({ status: 'NEPOSTOJI' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('podrazumijevano filtrira otvorene dugove i vraća ograničenu prvu stranicu', async () => {
      prisma.clientDebt.findMany.mockResolvedValue([]);
      const result = await service.listAll({});
      expect(prisma.clientDebt.aggregate).toHaveBeenCalledWith({
        where: { status: 'OPEN' },
        _count: { _all: true },
        _sum: { amount: true },
      });
      expect(prisma.clientDebt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'OPEN' },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toEqual({
        items: [],
        total: 0,
        totalAmount: 0,
        page: 0,
        pageSize: 20,
      });
    });

    it('pretražuje povezane podatke i vraća filtrirani zbir uz traženu stranicu', async () => {
      prisma.clientDebt.aggregate.mockResolvedValue({
        _count: { _all: 21 },
        _sum: { amount: new Prisma.Decimal(315) },
      });
      prisma.clientDebt.findMany.mockResolvedValue([openDebt]);

      const result = await service.listAll({
        status: 'OPEN',
        q: ' Aida K ',
        page: 1,
        pageSize: 10,
      });

      const where = expect.objectContaining({
        status: 'OPEN',
        OR: expect.arrayContaining([
          expect.objectContaining({
            client: {
              is: {
                OR: expect.arrayContaining([
                  { username: { contains: 'Aida K', mode: 'insensitive' } },
                  {
                    AND: [
                      {
                        OR: [
                          { firstName: { contains: 'Aida', mode: 'insensitive' } },
                          { lastName: { contains: 'Aida', mode: 'insensitive' } },
                        ],
                      },
                      {
                        OR: [
                          { firstName: { contains: 'K', mode: 'insensitive' } },
                          { lastName: { contains: 'K', mode: 'insensitive' } },
                        ],
                      },
                    ],
                  },
                ]),
              },
            },
          }),
          expect.objectContaining({
            service: {
              is: { name: { contains: 'Aida K', mode: 'insensitive' } },
            },
          }),
        ]),
      });
      expect(prisma.clientDebt.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({ where }),
      );
      expect(prisma.clientDebt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where, skip: 10, take: 10 }),
      );
      expect(result).toEqual({
        items: [openDebt],
        total: 21,
        totalAmount: new Prisma.Decimal(315),
        page: 1,
        pageSize: 10,
      });
    });

    it('clamps an out-of-range page to the final available page', async () => {
      prisma.clientDebt.aggregate.mockResolvedValue({
        _count: { _all: 21 },
        _sum: { amount: null },
      });
      prisma.clientDebt.findMany.mockResolvedValue([]);

      const result = await service.listAll({ page: 99, pageSize: 10 });

      expect(prisma.clientDebt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.page).toBe(2);
    });

    it('odbija nevalidne granice paginacije', async () => {
      await expect(service.listAll({ page: 0, pageSize: 51 })).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.clientDebt.aggregate).not.toHaveBeenCalled();
    });
  });
});
