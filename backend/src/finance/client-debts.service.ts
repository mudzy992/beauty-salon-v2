import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IncomeBooksService } from './income-books.service';
import type { RepayClientDebtDto } from './dto/repay-client-debt.dto';

@Injectable()
export class ClientDebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeBooks: IncomeBooksService,
  ) {}

  private async getStylistProfileIdByUserId(userId: string): Promise<string | null> {
    const p = await this.prisma.stylistProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return p?.id ?? null;
  }

  async listForClient(clientId: string, currentUser: { sub: string; roles: string[] }) {
    if (!clientId) throw new BadRequestException('clientId je obavezan.');
    const isAdminOrOwner = currentUser.roles.includes('SYSTEM_ADMIN') || currentUser.roles.includes('OWNER');
    const isStylist = currentUser.roles.includes('STYLIST');
    if (!isAdminOrOwner && !isStylist) throw new ForbiddenException('Nemate dozvolu.');

    const debts = await this.prisma.clientDebt.findMany({
      where: { clientId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: {
        service: { select: { id: true, name: true } },
        dailyLogEntry: {
          select: {
            id: true,
            date: true,
            reservationId: true,
          },
        },
        stylistProfile: {
          include: {
            user: { select: { id: true, username: true, firstName: true, lastName: true } },
          },
        },
        createdBy: { select: { id: true, username: true } },
        settledBy: { select: { id: true, username: true } },
      },
    });

    if (isAdminOrOwner) return debts;

    // STYLIST: može vidjeti dugove klijenta zbog operativnih poruka u toku rada,
    // ali ne smije vidjeti tuđe napomene.
    return debts.map((d) => (d.createdById === currentUser.sub ? d : { ...d, note: null }));
  }

  async listForStylistMe(currentUser: { sub: string; roles: string[] }) {
    if (!currentUser.roles.includes('STYLIST')) throw new ForbiddenException('Nemate dozvolu.');
    const stylistProfileId = await this.getStylistProfileIdByUserId(currentUser.sub);
    if (!stylistProfileId) throw new ForbiddenException('Nemate profil stilista.');

    return this.prisma.clientDebt.findMany({
      where: { stylistProfileId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
      include: {
        service: { select: { id: true, name: true } },
        reservation: { select: { id: true, reservationDate: true, startTime: true, endTime: true, publicReferenceCode: true } },
        dailyLogEntry: { select: { id: true, date: true, reservationId: true, kind: true } },
        manualEntry: { select: { id: true, date: true } },
        client: { select: { id: true, username: true, firstName: true, lastName: true } },
      },
    });
  }

  async listAll(filters: { status?: string; stylistProfileId?: string; clientId?: string }) {
    const status = (filters.status ?? 'OPEN').toUpperCase();
    if (status !== 'OPEN' && status !== 'SETTLED') {
      throw new BadRequestException('status nije validan.');
    }
    const stylistProfileId = filters.stylistProfileId?.trim() || undefined;
    const clientId = filters.clientId?.trim() || undefined;

    return this.prisma.clientDebt.findMany({
      where: {
        status: status as any,
        ...(stylistProfileId ? { stylistProfileId } : {}),
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        service: { select: { id: true, name: true } },
        reservation: { select: { id: true, reservationDate: true, startTime: true, endTime: true, publicReferenceCode: true } },
        dailyLogEntry: { select: { id: true, date: true, reservationId: true, kind: true } },
        manualEntry: { select: { id: true, date: true } },
        client: { select: { id: true, username: true, firstName: true, lastName: true } },
        stylistProfile: { include: { user: { select: { id: true, username: true, firstName: true, lastName: true } } } },
        createdBy: { select: { id: true, username: true } },
        settledBy: { select: { id: true, username: true } },
      },
    });
  }

  async settle(debtId: string, currentUser: { sub: string; roles: string[] }, note?: string) {
    const debt = await this.prisma.clientDebt.findUnique({ where: { id: debtId } });
    if (!debt) throw new NotFoundException('Dug nije pronađen.');
    if (debt.status !== 'OPEN') throw new BadRequestException('Dug je već zatvoren.');

    const isAdminOrOwner = currentUser.roles.includes('SYSTEM_ADMIN') || currentUser.roles.includes('OWNER');
    if (!isAdminOrOwner) {
      if (!currentUser.roles.includes('STYLIST')) throw new ForbiddenException('Nemate dozvolu.');
      if (debt.createdById !== currentUser.sub) throw new ForbiddenException('Nemate dozvolu.');
    }

    return this.prisma.clientDebt.update({
      where: { id: debtId },
      data: {
        status: 'SETTLED',
        settledAt: new Date(),
        settledById: currentUser.sub,
        ...(note != null ? { note } : {}),
      },
    });
  }

  async repayDebt(debtId: string, dto: RepayClientDebtDto, currentUser: { sub: string; roles: string[] }) {
    const debt = await this.prisma.clientDebt.findUnique({
      where: { id: debtId },
      include: {
        reservation: { select: { id: true, reservationDate: true, serviceId: true } },
        dailyLogEntry: { select: { id: true, date: true, serviceId: true } },
      },
    });
    if (!debt) throw new NotFoundException('Dug nije pronađen.');
    if (debt.status !== 'OPEN') throw new BadRequestException('Dug je već zatvoren.');

    const isAdminOrOwner =
      currentUser.roles.includes('SYSTEM_ADMIN') || currentUser.roles.includes('OWNER');
    if (!isAdminOrOwner) {
      if (!currentUser.roles.includes('STYLIST')) throw new ForbiddenException('Nemate dozvolu.');
      const myStylistProfileId = await this.getStylistProfileIdByUserId(currentUser.sub);
      if (!myStylistProfileId || myStylistProfileId !== debt.stylistProfileId) {
        throw new ForbiddenException('Nemate dozvolu.');
      }
    }

    const date = dto.date ? new Date(dto.date) : new Date();
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Datum nije validan.');
    date.setHours(0, 0, 0, 0);

    const serviceId =
      debt.serviceId ??
      debt.dailyLogEntry?.serviceId ??
      debt.reservation?.serviceId ??
      null;
    if (!serviceId) throw new BadRequestException('Nedostaje servis za knjiženje naplate duga.');

    const amount = Number(debt.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Iznos duga nije validan.');
    }

    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const book = await this.incomeBooks.getOrCreateForMonth(y, m);

    const note = dto.note?.trim() || undefined;

    return this.prisma.$transaction(async (tx) => {
      const settled = await tx.clientDebt.update({
        where: { id: debtId },
        data: {
          status: 'SETTLED',
          settledAt: new Date(),
          settledById: currentUser.sub,
          ...(note ? { note } : {}),
        },
      });

      const debtPaymentDailyLog = await tx.dailyLogEntry.create({
        data: {
          stylistProfileId: settled.stylistProfileId,
          reservationId: settled.reservationId ?? null,
          serviceId,
          clientId: settled.clientId,
          kind: 'DEBT_PAYMENT' as any,
          debtId: settled.id,
          date,
          actualPrice: amount,
          tipAmount: 0,
          notes: note ?? 'Naplata duga',
          isManual: true,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Knjiženje u Income Book kao ručni prihod (da KIF dobije stavku),
      // a daily-log DEBT_PAYMENT se neće auto-sync-ovati.
      await tx.incomeBookManualEntry.create({
        data: {
          bookId: book.id,
          date,
          serviceId,
          stylistProfileId: settled.stylistProfileId,
          clientId: settled.clientId,
          amount,
          tipAmount: 0,
          notes: note ?? 'Naplata duga',
          createdById: currentUser.sub,
        },
      });

      const autoAgg = await tx.incomeBookEntry.aggregate({
        where: { bookId: book.id },
        _sum: { amount: true, tipAmount: true },
      });
      const manualAgg = await tx.incomeBookManualEntry.aggregate({
        where: { bookId: book.id },
        _sum: { amount: true, tipAmount: true },
      });
      const totalRevenue =
        Number(autoAgg._sum.amount ?? 0) + Number(manualAgg._sum.amount ?? 0);
      const totalTips =
        Number(autoAgg._sum.tipAmount ?? 0) + Number(manualAgg._sum.tipAmount ?? 0);
      await tx.incomeBook.update({
        where: { id: book.id },
        data: { totalRevenue, totalTips },
      });

      return {
        settled,
        debtPaymentDailyLogId: debtPaymentDailyLog.id,
      };
    });
  }
}

