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
import { IncomeBooksService } from '../finance/income-books.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import type { UpdateDailyLogEntryDto } from './dto/update-daily-log-entry.dto';
import type { DeleteDailyLogEntryDto } from './dto/delete-daily-log-entry.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class DailyLogAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dailyLog: DailyLogService,
    private readonly reversal: DailyLogReversalService,
    private readonly validators: DailyLogValidators,
    private readonly incomeBooks: IncomeBooksService,
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
      await this.incomeBooks.assertBookOpenForDate(new Date(entry.date));
      if (dto.date) {
        await this.incomeBooks.assertBookOpenForDate(
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
    await this.reversal.reverseCompletedEffects(id);
    return this.prisma.dailyLogEntry.update({
      where: { id },
      data: { status: 'PENDING', completedAt: null },
      include: this.dailyLog.entryInclude(),
    });
  }

  async softDelete(
    id: string,
    dto: DeleteDailyLogEntryDto,
    user: CurrentUserPayload,
  ) {
    const entry = await this.dailyLog.findOne(id, user, { includeDeleted: false });
    const isAdmin = this.dailyLog.isAdminOrOwner(user);
    if (!isAdmin) {
      if (entry.status === 'COMPLETED') {
        throw new ForbiddenException(
          'Kompletirani unos može obrisati samo administrator.',
        );
      }
    } else {
      const reason = dto.reason?.trim();
      if (!reason) {
        throw new BadRequestException('Razlog brisanja je obavezan.');
      }
    }
    if (entry.status === 'COMPLETED') {
      await this.reversal.reverseCompletedEffects(id);
    } else if (entry.kind === 'DEBT_PAYMENT' && entry.debtId) {
      await this.reopenDebtOnDelete(entry.id, entry.debtId);
    } else {
      await this.prisma.clientDebt.deleteMany({
        where: { dailyLogEntryId: id, status: 'OPEN' },
      });
    }
    return this.prisma.dailyLogEntry.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedById: user.sub,
        deleteReason: dto.reason?.trim() || null,
      },
      include: this.dailyLog.entryInclude(),
    });
  }

  async restore(id: string, user: CurrentUserPayload) {
    if (!this.dailyLog.isAdminOrOwner(user)) {
      throw new ForbiddenException('Nemate dozvolu.');
    }
    const entry = await this.prisma.dailyLogEntry.findUnique({
      where: { id },
      include: this.dailyLog.entryInclude(),
    });
    if (!entry) throw new NotFoundException('Zapis nije pronađen.');
    if (!entry.deletedAt) {
      throw new BadRequestException('Zapis nije obrisan.');
    }
    await this.incomeBooks.assertBookOpenForDate(new Date(entry.date));
    const restored = await this.prisma.dailyLogEntry.update({
      where: { id },
      data: {
        deletedAt: null,
        deletedById: null,
        deleteReason: null,
        status: 'PENDING',
        completedAt: null,
      },
      include: this.dailyLog.entryInclude(),
    });
    return restored;
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
    if (dto.actualPrice != null) data.actualPrice = dto.actualPrice;
    if (dto.tipAmount != null) data.tipAmount = dto.tipAmount;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.date) data.date = this.validators.parseDate(dto.date);
    if (dto.stylistProfileId) {
      await this.dailyLog.ensureStylistAccess(dto.stylistProfileId, user);
      data.stylistProfileId = dto.stylistProfileId;
    }
    if (dto.clientId !== undefined) data.clientId = dto.clientId;
    if (dto.serviceIds) {
      const serviceIds = this.validators.normalizeServiceIds(dto.serviceIds);
      const clientId =
        dto.clientId !== undefined ? dto.clientId : current.clientId;
      await this.validators.assertClientServiceGenderMatch(clientId, serviceIds);
      data.serviceId = serviceIds[0];
      await this.prisma.dailyLogEntryServiceItem.deleteMany({
        where: { dailyLogEntryId: id },
      });
      await this.prisma.dailyLogEntryServiceItem.createMany({
        data: serviceIds.map((sid, idx) => ({
          dailyLogEntryId: id,
          serviceId: sid,
          sortOrder: idx,
        })),
      });
    }
    const updated = await this.prisma.dailyLogEntry.update({
      where: { id },
      data,
      include: this.dailyLog.entryInclude(),
    });
    if (
      updated.clientId &&
      dto.desiredLoyaltyPercent != null &&
      dto.desiredLoyaltyPercent > 0 &&
      updated.status === 'PENDING'
    ) {
      await this.loyalty.redeemForDailyLog({
        clientId: updated.clientId,
        dailyLogEntryId: updated.id,
        serviceId: updated.serviceId,
        desiredPercent: dto.desiredLoyaltyPercent,
        actualPrice: Number(updated.actualPrice),
      });
      return this.dailyLog.findOne(updated.id, user);
    }
    return updated;
  }

  private async reopenDebtOnDelete(
    entryId: string,
    debtId: string,
  ): Promise<void> {
    await this.incomeBooks.assertBookOpenForDate(
      (
        await this.prisma.dailyLogEntry.findUniqueOrThrow({
          where: { id: entryId },
          select: { date: true },
        })
      ).date,
    );
    await this.prisma.$transaction(async (tx) => {
      const manuals = await tx.incomeBookManualEntry.findMany({
        where: { dailyLogEntryId: entryId },
        select: { bookId: true },
      });
      await tx.incomeBookManualEntry.deleteMany({
        where: { dailyLogEntryId: entryId },
      });
      for (const bookId of [...new Set(manuals.map((m) => m.bookId))]) {
        await this.reversal.recalcInTx(tx, bookId);
      }
      await tx.clientDebt.update({
        where: { id: debtId },
        data: { status: 'OPEN', settledAt: null, settledById: null },
      });
    });
  }
}
