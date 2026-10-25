import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DailyLogService } from './daily-log.service';
import { DailyLogReversalService } from './daily-log-reversal.service';
import { DailyLogValidators } from './daily-log.validators';
import { IncomeSyncService } from '../finance/income-sync.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import type { UpdateDailyLogEntryDto } from './dto/update-daily-log-entry.dto';
import type { DeleteDailyLogEntryDto } from './dto/delete-daily-log-entry.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { resolveServiceItems } from './daily-log.pricing';

@Injectable()
export class DailyLogAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dailyLog: DailyLogService,
    private readonly reversal: DailyLogReversalService,
    private readonly validators: DailyLogValidators,
    private readonly incomeSync: IncomeSyncService,
    private readonly loyalty: LoyaltyService,
  ) {}

  async update(
    id: string,
    dto: UpdateDailyLogEntryDto,
    user: CurrentUserPayload,
  ) {
    const entry = await this.dailyLog.findOne(id, user, { includeDeleted: false });
    const isAdmin = this.dailyLog.isAdminOrOwner(user);
    const wantsAdminFields =
      dto.date != null ||
      dto.stylistProfileId != null ||
      dto.serviceIds != null ||
      dto.items != null ||
      dto.clientId !== undefined ||
      dto.status != null;
    if (wantsAdminFields && !isAdmin) {
      throw new ForbiddenException('Samo administrator može mijenjati ova polja.');
    }
    if (entry.status === 'COMPLETED' && !isAdmin) {
      throw new BadRequestException('Završeni zapis nije moguće mijenjati.');
    }
    if (dto.status === 'COMPLETED' && entry.status === 'PENDING') {
      await this.applyFieldUpdates(id, dto, user, entry);
      return this.dailyLog.complete(id, user);
    }
    if (dto.status === 'PENDING' && entry.status === 'COMPLETED') {
      if (!isAdmin) throw new ForbiddenException('Nemate dozvolu.');
      await this.revertToPending(id, user);
      return this.applyFieldUpdates(id, dto, user, {
        ...entry,
        status: 'PENDING',
      });
    }
    if (entry.status === 'COMPLETED') {
      await this.incomeSync.assertBookOpenForDate(new Date(entry.date));
      if (dto.date) {
        await this.incomeSync.assertBookOpenForDate(
          this.validators.parseDate(dto.date),
        );
      }
    }
    const updated = await this.applyFieldUpdates(id, dto, user, entry);
    if (updated.status === 'COMPLETED') {
      await this.reversal.syncIncomeBookEntry(updated);
    }
    return updated;
  }

  async revertToPending(id: string, user: CurrentUserPayload) {
    if (!this.dailyLog.isAdminOrOwner(user)) {
      throw new ForbiddenException('Nemate dozvolu.');
    }
    const entry = await this.dailyLog.findOne(id, user, { includeDeleted: false });
    if (entry.status !== 'COMPLETED') {
      throw new BadRequestException('Zapis nije kompletiran.');
    }
    return this.prisma.$transaction(async (tx) => {
      await this.reversal.reverseCompletedEffects(id, undefined, tx);
      const current = await tx.dailyLogEntry.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!current || current.status !== 'COMPLETED') {
        throw new BadRequestException('Zapis nije kompletiran.');
      }
      return tx.dailyLogEntry.update({
        where: { id },
        data: { status: 'PENDING', completedAt: null },
        include: this.dailyLog.entryInclude(),
      });
    });
  }

  async softDelete(
    id: string,
    dto: DeleteDailyLogEntryDto,
    user: CurrentUserPayload,
  ) {
    const entry = await this.dailyLog.findOne(id, user, { includeDeleted: false });
    const isAdmin = this.dailyLog.isAdminOrOwner(user);
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Razlog brisanja je obavezan.');
    }
    if (!isAdmin && entry.status === 'COMPLETED') {
      throw new ForbiddenException(
        'Kompletirani unos može obrisati samo administrator.',
      );
    }
    if (entry.status === 'COMPLETED') {
      return this.prisma.$transaction(async (tx) => {
        await this.reversal.reverseCompletedEffects(id, undefined, tx);
        const current = await tx.dailyLogEntry.findUnique({
          where: { id },
          select: { id: true, status: true },
        });
        if (!current || current.status !== 'COMPLETED') {
          throw new BadRequestException('Zapis nije kompletiran.');
        }
        return tx.dailyLogEntry.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            deletedById: user.sub,
            deleteReason: reason,
          },
          include: this.dailyLog.entryInclude(),
        });
      });
    }
    if (entry.kind === 'DEBT_PAYMENT' && entry.debtId) {
      await this.reopenDebtOnDelete(entry.id, entry.debtId);
    } else {
      await this.reversal.assertOpenBooksForEntry(entry);
      await this.prisma.$transaction(async (tx) => {
        await this.reversal.reverseLinkedDebtPayments(tx, id);
        await tx.clientDebt.deleteMany({
          where: { dailyLogEntryId: id, status: 'OPEN' },
        });
      });
    }
    return this.prisma.dailyLogEntry.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: user.sub,
        deleteReason: reason,
      },
      include: this.dailyLog.entryInclude(),
    });
  }

  async addImage(
    entryId: string,
    dto: {
      uploadId: string;
      isBefore?: boolean;
      isAfter?: boolean;
      description?: string;
      sortOrder?: number;
    },
    user: CurrentUserPayload,
  ) {
    const entry = await this.dailyLog.findOne(entryId, user);
    const isAdmin = this.dailyLog.isAdminOrOwner(user);
    if (entry.status === 'COMPLETED' && !isAdmin) {
      throw new BadRequestException(
        'Ne možete dodavati slike završenom zapisu.',
      );
    }
    return this.prisma.dailyLogImage.create({
      data: {
        dailyLogEntryId: entryId,
        uploadId: dto.uploadId,
        isBefore: dto.isBefore ?? false,
        isAfter: dto.isAfter ?? false,
        description: dto.description,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async removeImage(entryId: string, imageId: string, user: CurrentUserPayload) {
    if (!this.dailyLog.isAdminOrOwner(user)) {
      throw new ForbiddenException('Nemate dozvolu.');
    }
    await this.dailyLog.findOne(entryId, user);
    const image = await this.prisma.dailyLogImage.findFirst({
      where: { id: imageId, dailyLogEntryId: entryId },
    });
    if (!image) throw new NotFoundException('Slika nije pronađena.');
    await this.prisma.dailyLogImage.delete({ where: { id: imageId } });
    return { deleted: true };
  }

  private async applyFieldUpdates(
    id: string,
    dto: UpdateDailyLogEntryDto,
    user: CurrentUserPayload,
    current: { clientId: string | null; status: string },
  ) {
    const data: Record<string, unknown> = {};
    let resolvedItems: ReturnType<typeof resolveServiceItems> | undefined;
    if (dto.actualPrice != null) data.actualPrice = dto.actualPrice;
    if (dto.tipAmount != null) data.tipAmount = dto.tipAmount;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.date) data.date = this.validators.parseDate(dto.date);
    if (dto.stylistProfileId) {
      await this.dailyLog.ensureStylistAccess(dto.stylistProfileId, user);
      data.stylistProfileId = dto.stylistProfileId;
    }
    if (dto.clientId !== undefined) data.clientId = dto.clientId;
    if (dto.items?.length || dto.serviceIds) {
      const catalog = await this.prisma.service.findMany({
        where: {
          id: {
            in: [
              ...(dto.items?.map((i) => i.serviceId) ?? []),
              ...(dto.serviceIds ?? []),
            ],
          },
        },
        select: { id: true, price: true },
      });
      const catalogPrices = new Map(
        catalog.map((s) => [s.id, Number(s.price)]),
      );
      resolvedItems = resolveServiceItems({
        items: dto.items,
        serviceIds: dto.serviceIds,
        catalogPrices,
      });
      const serviceIds = resolvedItems.map((r) => r.serviceId);
      const clientId =
        dto.clientId !== undefined ? dto.clientId : current.clientId;
      await this.validators.assertClientServiceGenderMatch(clientId, serviceIds);
      data.serviceId = serviceIds[0];
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      if (resolvedItems) {
        await tx.dailyLogEntryServiceItem.deleteMany({
          where: { dailyLogEntryId: id },
        });
        await tx.dailyLogEntryServiceItem.createMany({
          data: resolvedItems.map((it, idx) => ({
            dailyLogEntryId: id,
            serviceId: it.serviceId,
            unitPrice: it.unitPrice,
            sortOrder: idx,
          })),
        });
      }
      const entry = await tx.dailyLogEntry.update({
        where: { id },
        data,
        include: this.dailyLog.entryInclude(),
      });
      if (
        entry.clientId &&
        dto.desiredLoyaltyPercent != null &&
        dto.desiredLoyaltyPercent > 0 &&
        entry.status === 'PENDING'
      ) {
        await this.loyalty.redeemForDailyLog(
          {
            clientId: entry.clientId,
            dailyLogEntryId: entry.id,
            serviceIds: resolvedItems?.map((item) => item.serviceId) ??
              entry.items?.map((item) => item.serviceId) ?? [entry.serviceId],
            desiredPercent: dto.desiredLoyaltyPercent,
            actualPrice: Number(entry.actualPrice),
          },
          tx,
        );
      }
      return entry;
    });
    if (
      updated.clientId &&
      dto.desiredLoyaltyPercent != null &&
      dto.desiredLoyaltyPercent > 0 &&
      updated.status === 'PENDING'
    ) {
      return this.dailyLog.findOne(updated.id, user);
    }
    return updated;
  }

  private async reopenDebtOnDelete(
    entryId: string,
    debtId: string,
  ): Promise<void> {
    const entry = await this.prisma.dailyLogEntry.findUniqueOrThrow({
      where: { id: entryId },
      select: { date: true },
    });
    await this.incomeSync.assertBookOpenForDate(entry.date);
    await this.prisma.$transaction(async (tx) => {
      const manuals = await tx.incomeBookManualEntry.findMany({
        where: { dailyLogEntryId: entryId },
        select: { bookId: true },
      });
      const bookIds = [...new Set(manuals.map((m) => m.bookId))].sort();
      await this.incomeSync.assertBooksOpenForDateAndIds(
        entry.date,
        bookIds,
        tx,
      );
      await tx.incomeBookManualEntry.deleteMany({
        where: { dailyLogEntryId: entryId },
      });
      for (const bookId of bookIds) {
        await this.reversal.recalcInTx(tx, bookId);
      }
      await tx.clientDebt.update({
        where: { id: debtId },
        data: { status: 'OPEN', settledAt: null, settledById: null },
      });
    });
  }
}
