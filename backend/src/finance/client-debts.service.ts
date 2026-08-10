import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClientDebtStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IncomeSyncService } from './income-sync.service';
import { IncomeManualEntriesService } from './income-manual-entries.service';
import { parseAndNormalizeDate } from '../common/utils/book-period';
import { allocateDailyLogReferenceCode } from '../daily-log/daily-log.reference';
import type { RepayClientDebtDto } from './dto/repay-client-debt.dto';
import type { SettleClientDebtDto } from './dto/settle-client-debt.dto';

@Injectable()
export class ClientDebtsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly incomeSync: IncomeSyncService,
    private readonly manualEntries: IncomeManualEntriesService,
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
    const isSelf = currentUser.sub === clientId;
    if (!isAdminOrOwner && !isStylist && !isSelf) {
      throw new ForbiddenException('Nemate dozvolu.');
    }

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

    if (isAdminOrOwner || isSelf) return debts;

    // STYLIST: može vidjeti dugove klijenta zbog operativnih poruka u toku rada,
    // ali ne smije vidjeti tuđe napomene.
    return debts.map((d) => (d.createdById === currentUser.sub ? d : { ...d, note: null }));
  }

  async listForMe(currentUser: { sub: string; roles: string[] }) {
    return this.listForClient(currentUser.sub, currentUser);
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
    const raw = (filters.status ?? ClientDebtStatus.OPEN).toUpperCase();
    if (!(raw in ClientDebtStatus)) {
      throw new BadRequestException('status nije validan.');
    }
    const status = raw as ClientDebtStatus;
    const stylistProfileId = filters.stylistProfileId?.trim() || undefined;
    const clientId = filters.clientId?.trim() || undefined;

    return this.prisma.clientDebt.findMany({
      where: {
        status,
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

  /**
   * Otpis duga: zatvara dug BEZ knjiženja prihoda u KIF.
   * Koristi se kada se novac neće naplatiti, zato je razlog obavezan.
   * Za stvarnu naplatu koristi `repayDebt`.
   */
  async writeOff(
    debtId: string,
    dto: SettleClientDebtDto,
    currentUser: { sub: string; roles: string[] },
  ) {
    const reason = dto.note?.trim();
    if (!reason || reason.length < 3) {
      throw new BadRequestException('Morate unijeti razlog otpisa duga.');
    }
    const debt = await this.prisma.clientDebt.findUnique({ where: { id: debtId } });
    if (!debt) throw new NotFoundException('Dug nije pronađen.');
    if (debt.status !== ClientDebtStatus.OPEN) {
      throw new BadRequestException('Dug je već zatvoren.');
    }
    // Otpis je finansijska odluka – stilista ne smije sam otpisati potraživanje.
    const isAdminOrOwner =
      currentUser.roles.includes('SYSTEM_ADMIN') || currentUser.roles.includes('OWNER');
    if (!isAdminOrOwner) {
      throw new ForbiddenException('Otpis duga može izvršiti samo vlasnik ili administrator.');
    }

    return this.prisma.clientDebt.update({
      where: { id: debtId },
      data: {
        status: ClientDebtStatus.SETTLED,
        settledAt: new Date(),
        settledById: currentUser.sub,
        note: `[OTPIS] ${reason}`,
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
    if (debt.status !== ClientDebtStatus.OPEN) {
      throw new BadRequestException('Dug je već zatvoren.');
    }

    const isAdminOrOwner =
      currentUser.roles.includes('SYSTEM_ADMIN') || currentUser.roles.includes('OWNER');
    if (!isAdminOrOwner) {
      if (!currentUser.roles.includes('STYLIST')) throw new ForbiddenException('Nemate dozvolu.');
      const myStylistProfileId = await this.getStylistProfileIdByUserId(currentUser.sub);
      if (!myStylistProfileId || myStylistProfileId !== debt.stylistProfileId) {
        throw new ForbiddenException('Nemate dozvolu.');
      }
    }

    const date = dto.date ? parseAndNormalizeDate(dto.date) : new Date();
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

    const book = await this.incomeSync.assertBookOpenForDate(date);
    const note = dto.note?.trim() || undefined;

    return this.prisma.$transaction(async (tx) => {
      const settled = await tx.clientDebt.update({
        where: { id: debtId },
        data: {
          status: ClientDebtStatus.SETTLED,
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
          publicReferenceCode: await allocateDailyLogReferenceCode(tx as any, date),
          notes: note ?? 'Naplata duga',
          isManual: true,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Knjiženje u Income Book kao ručni prihod (da KIF dobije stavku),
      // a daily-log DEBT_PAYMENT se neće auto-sync-ovati.
      await this.manualEntries.createForDebtRepayment(tx, {
        bookId: book.id,
        date,
        serviceId,
        stylistProfileId: settled.stylistProfileId,
        clientId: settled.clientId,
        dailyLogEntryId: debtPaymentDailyLog.id,
        amount,
        notes: note ?? 'Naplata duga',
        userId: currentUser.sub,
      });

      return {
        settled,
        debtPaymentDailyLogId: debtPaymentDailyLog.id,
      };
    });
  }
}

