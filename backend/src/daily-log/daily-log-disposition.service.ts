import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toDateOnlyString } from '../common/utils/date-only';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import { DailyLogAdminService } from './daily-log-admin.service';
import { DailyLogService } from './daily-log.service';
import { ReservationSharedService } from '../reservations/reservation-shared.service';
import { ReservationQueriesService } from '../reservations/reservation-queries.service';
import { ReservationDateService } from '../reservations/reservation-date.service';
import { ReservationNotifyService } from '../reservations/reservation-notify.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RESERVATION_STATUS } from '../reservations/constants';
import { timeToMinutes } from '../reservations/utils/time-slot.utils';
import type { DailyLogDispositionDto } from './dto/daily-log-disposition.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  applyClientCancel,
  applyDirectReorder,
  applyNoShow,
  applyStylistCancel,
  assertReorderSlotFree,
  notifyClientCancelled,
  notifyClientNoShow,
} from './daily-log-disposition-apply';
import { assertClientDayBookingAllowed } from '../reservations/utils/assert-client-day-booking';
import { acquireReservationDayLocks } from '../reservations/utils/booking-advisory-lock';
import { apiError } from '../common/errors/api-error-codes';

@Injectable()
export class DailyLogDispositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dailyLog: DailyLogService,
    private readonly dailyLogAdmin: DailyLogAdminService,
    private readonly shared: ReservationSharedService,
    private readonly dates: ReservationDateService,
    private readonly queries: ReservationQueriesService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
    private readonly reservationNotify: ReservationNotifyService,
  ) {}

  async dispose(
    entryId: string,
    dto: DailyLogDispositionDto,
    user: CurrentUserPayload,
  ) {
    const entry = await this.dailyLog.findOne(entryId, user, {
      includeDeleted: false,
    });
    if (entry.status !== 'PENDING') {
      throw new BadRequestException(
        'Disposition je moguć samo za PENDING zapise.',
      );
    }
    if (!entry.reservationId) {
      throw new BadRequestException('Zapis nije vezan za rezervaciju.');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: entry.reservationId },
      include: { items: { select: { serviceId: true } } },
    });
    if (!reservation) {
      throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
    }
    if (reservation.status !== RESERVATION_STATUS.AWAITING_DAILY_LOG) {
      throw new BadRequestException(
        'Disposition je moguć samo za direktne rezervacije u statusu AWAITING_DAILY_LOG.',
      );
    }

    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('Razlog je obavezan.');
    }

    const isAdmin = this.dailyLog.isAdminOrOwner(user);
    let stylistProfileId: string | null = null;
    if (!isAdmin) {
      stylistProfileId = await this.shared.getStylistProfileIdByUserId(
        user.sub,
      );
      if (
        !stylistProfileId ||
        stylistProfileId !== reservation.confirmedStylistId
      ) {
        throw new ForbiddenException('Nemate dozvolu za ovu akciju.');
      }
    }

    if (dto.action === 'reorder') {
      if (!dto.targetStartTime || !dto.targetEndTime) {
        throw new BadRequestException(
          'Za pomjeranje termina unesite targetStartTime i targetEndTime.',
        );
      }
      if (
        timeToMinutes(dto.targetEndTime) <= timeToMinutes(dto.targetStartTime)
      ) {
        throw new BadRequestException(apiError('RESERVATIONS_END_BEFORE_START'),
        );
      }
    }

    const reorderTargetDate =
      dto.action === 'reorder'
        ? dto.targetDate
          ? this.dates.parseDateOnly(dto.targetDate)
          : new Date(reservation.reservationDate)
        : null;

    const lockedReservation = await this.prisma.$transaction(async (tx) => {
      // Match reservation reschedule flows' lock order: calendar-day locks
      // precede row locks, avoiding a lock-order cycle with concurrent updates.
      await acquireReservationDayLocks(
        tx,
        reorderTargetDate
          ? [reservation.reservationDate, reorderTargetDate]
          : [reservation.reservationDate],
      );
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "daily_log_entries" WHERE id = ${entryId} FOR UPDATE`,
      );
      await tx.$queryRaw(
        Prisma.sql`SELECT id FROM "reservations" WHERE id = ${entry.reservationId} FOR UPDATE`,
      );

      const currentEntry = await tx.dailyLogEntry.findUnique({
        where: { id: entryId },
        select: {
          id: true,
          status: true,
          deletedAt: true,
          reservationId: true,
        },
      });
      if (
        !currentEntry ||
        currentEntry.deletedAt ||
        currentEntry.status !== 'PENDING' ||
        currentEntry.reservationId !== entry.reservationId
      ) {
        throw new BadRequestException(
          'Daily Log zapis je promijenjen; osvježite stranicu.',
        );
      }

      const currentReservation = await tx.reservation.findUnique({
        where: { id: entry.reservationId! },
        include: { items: { select: { serviceId: true } } },
      });
      if (!currentReservation) {
        throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
      }
      if (currentReservation.status !== RESERVATION_STATUS.AWAITING_DAILY_LOG) {
        throw new BadRequestException(
          'Disposition je moguć samo za direktne rezervacije u statusu AWAITING_DAILY_LOG.',
        );
      }
      if (
        reorderTargetDate &&
        (currentReservation.reservationDate.getTime() !==
          reservation.reservationDate.getTime() ||
          currentReservation.startTime !== reservation.startTime ||
          currentReservation.endTime !== reservation.endTime ||
          currentReservation.confirmedStylistId !==
            reservation.confirmedStylistId)
      ) {
        throw new BadRequestException(
          'Termin je istovremeno promijenjen; osvježite stranicu i pokušajte ponovo.',
        );
      }
      if (
        !isAdmin &&
        (!stylistProfileId ||
          stylistProfileId !== currentReservation.confirmedStylistId)
      ) {
        throw new ForbiddenException('Nemate dozvolu za ovu akciju.');
      }

      const applyDeps = {
        prisma: tx,
        shared: this.shared,
        dates: this.dates,
      };

      if (dto.action === 'reorder') {
        const targetDate = reorderTargetDate!;
        await assertReorderSlotFree(applyDeps, currentReservation, {
          targetDate: dto.targetDate,
          targetStartTime: dto.targetStartTime!,
          targetEndTime: dto.targetEndTime!,
        });
        const serviceIds =
          currentReservation.items.length > 0
            ? currentReservation.items.map((item) => item.serviceId)
            : [currentReservation.serviceId];
        await assertClientDayBookingAllowed({
          prisma: tx,
          clientId: currentReservation.clientId,
          reservationDate: targetDate,
          startTime: dto.targetStartTime!,
          endTime: dto.targetEndTime!,
          serviceIds,
          excludeReservationId: currentReservation.id,
        });
      }

      await this.dailyLogAdmin.softDeletePendingInTransaction(
        entryId,
        reason,
        user,
        tx,
      );

      switch (dto.action) {
        case 'discard':
        case 'cancel_as_stylist':
          await applyStylistCancel(applyDeps, currentReservation.id, reason);
          break;
        case 'cancel_as_client':
          await applyClientCancel(applyDeps, currentReservation.id, reason);
          break;
        case 'no_show':
          await applyNoShow(
            applyDeps,
            currentReservation.id,
            reason,
            dto.applyPenalty !== false,
          );
          break;
        case 'reorder':
          await applyDirectReorder(applyDeps, currentReservation, {
            targetDate: dto.targetDate,
            targetStartTime: dto.targetStartTime!,
            targetEndTime: dto.targetEndTime!,
          });
          break;
      }
      return currentReservation;
    });

    if (dto.action === 'discard' || dto.action === 'cancel_as_stylist') {
      await notifyClientCancelled(
        { prisma: this.prisma, notifications: this.notifications },
        lockedReservation.id,
        lockedReservation.clientId,
        reason,
      );
    } else if (dto.action === 'cancel_as_client') {
      await notifyClientCancelled(
        { prisma: this.prisma, notifications: this.notifications },
        lockedReservation.id,
        lockedReservation.clientId,
        reason,
      );
    } else if (dto.action === 'no_show') {
      await notifyClientNoShow(
        { prisma: this.prisma, notifications: this.notifications },
        lockedReservation.id,
        lockedReservation.clientId,
      );
    } else if (dto.action === 'reorder') {
      await this.reservationNotify.notifyClientTimeChanged({
        clientId: lockedReservation.clientId,
        reservationId: lockedReservation.id,
        date:
          dto.targetDate ??
          this.dates.toDateOnlyString(lockedReservation.reservationDate),
        startTime: dto.targetStartTime!,
        endTime: dto.targetEndTime!,
        publicReferenceCode: lockedReservation.publicReferenceCode,
        clientViewToken: lockedReservation.clientViewToken,
      });
    }

    const updated = await this.queries
      .findOne(lockedReservation.id, user)
      .catch(() => null);
    if (updated) {
      this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, updated);
      this.events.emitToUser(
        lockedReservation.clientId,
        SOCKET_EVENTS.RESERVATION_UPDATED,
        updated,
      );
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: lockedReservation.serviceId,
        date: toDateOnlyString(
          updated.reservationDate ?? lockedReservation.reservationDate,
        ),
      });
    }
    return { ok: true, reservation: updated };
  }
}
