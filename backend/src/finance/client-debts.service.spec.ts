import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
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
    prisma.clientDebt.update.mockResolvedValue(openDebt);
    prisma.dailyLogEntry.create.mockResolvedValue({ id: 'dl1' });
  });

  describe('writeOff', () => {
    it('zahtijeva razlog otpisa', async () => {
      await expect(
        service.writeOff('d1', { note: '' }, owner),
      ).rejects.toThrow(BadRequestException);
    });

    it('zabranjuje stilisti otpis duga', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(openDebt);
      await expect(
        service.writeOff('d1', { note: 'nenaplativo' }, stylist),
      ).rejects.toThrow(ForbiddenException);
    });

    it('zatvara dug bez knjiženja prihoda', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(openDebt);

      await service.writeOff('d1', { note: 'nenaplativo' }, owner);

      expect(prisma.clientDebt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ note: '[OTPIS] nenaplativo' }),
        }),
      );
      expect(prisma.incomeBookManualEntry.create).not.toHaveBeenCalled();
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

    it('knjiži naplatu kao ručnu stavku vezanu za zapis dnevnika', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(openDebt);
      prisma.incomeBook.findUnique.mockResolvedValue({
        id: 'b1',
        year: 2026,
        month: 3,
        closedAt: null,
      });

      await service.repayDebt('d1', { date: '2026-03-10' }, owner);

      const data = prisma.incomeBookManualEntry.create.mock.calls[0][0].data;
      expect(data.amount).toBe(40);
      expect(data.tipAmount).toBe(0);
      expect(data.dailyLogEntryId).toBe('dl1');
    });

    it('odbija naplatu tuđeg duga od strane stiliste', async () => {
      prisma.clientDebt.findUnique.mockResolvedValue(openDebt);
      prisma.stylistProfile.findUnique.mockResolvedValue({ id: 'drugi' });

      await expect(
        service.repayDebt('d1', {}, stylist),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listAll', () => {
    it('odbija nevalidan status', async () => {
      await expect(service.listAll({ status: 'NEPOSTOJI' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('podrazumijevano filtrira otvorene dugove', async () => {
      prisma.clientDebt.findMany.mockResolvedValue([]);
      await service.listAll({});
      expect(prisma.clientDebt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'OPEN' }),
        }),
      );
    });
  });
});
