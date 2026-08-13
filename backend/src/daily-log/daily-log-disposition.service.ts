import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
} from './daily-log-disposition-apply';
import { assertClientDayBookingAllowed } from '../reservations/utils/assert-client-day-booking';

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

  private get applyDeps() {
    return {
      prisma: this.prisma,
      shared: this.shared,
      dates: this.dates,
      notifications: this.notifications,
    };
  }

  async dispose(
    entryId: string,
    dto: DailyLogDispositionDto,
    user: CurrentUserPayload,
  ) {
    const entry = await this.dailyLog.findOne(entryId, user, {
      includeDeleted: false,
    });
    if (entry.status !== 'PENDING') {
      throw new BadRequestException('Disposition je moguć samo za PENDING zapise.');
    }
    if (!entry.reservationId) {
      throw new BadRequestException('Zapis nije vezan za rezervaciju.');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: entry.reservationId },
      include: { items: { select: { serviceId: true } } },
    });
    if (!reservation) {
      throw new NotFoundException('Rezervacija nije pronađena.');
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
    if (!isAdmin) {
      const stylistProfileId =
        await this.shared.getStylistProfileIdByUserId(user.sub);
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
        throw new BadRequestException(
          'Vrijeme završetka mora biti nakon početka.',
        );
      }
      await assertReorderSlotFree(this.applyDeps, reservation, {
        targetDate: dto.targetDate,
        targetStartTime: dto.targetStartTime,
        targetEndTime: dto.targetEndTime,
      });
      const serviceIds =
        reservation.items.length > 0
          ? reservation.items.map((item) => item.serviceId)
          : [reservation.serviceId];
      await assertClientDayBookingAllowed({
        prisma: this.prisma,
        clientId: reservation.clientId,
        reservationDate: dto.targetDate ?? reservation.reservationDate,
        startTime: dto.targetStartTime,
        endTime: dto.targetEndTime,
        serviceIds,
        excludeReservationId: reservation.id,
      });
    }

    await this.dailyLogAdmin.softDelete(entryId, { reason }, user);

    switch (dto.action) {
      case 'discard':
      case 'cancel_as_stylist':
        await applyStylistCancel(this.applyDeps, reservation.id, reason);
        break;
      case 'cancel_as_client':
        await applyClientCancel(this.applyDeps, reservation.id, reason);
        break;
      case 'no_show':
        await applyNoShow(
          this.applyDeps,
          reservation.id,
          reason,
          dto.applyPenalty !== false,
        );
        break;
      case 'reorder':
        await applyDirectReorder(this.applyDeps, reservation, {
          targetDate: dto.targetDate,
          targetStartTime: dto.targetStartTime!,
          targetEndTime: dto.targetEndTime!,
        });
        await this.reservationNotify.notifyClientTimeChanged({
          clientId: reservation.clientId,
          reservationId: reservation.id,
          date:
            dto.targetDate ??
            this.dates.toLocalDateOnlyString(reservation.reservationDate),
          startTime: dto.targetStartTime!,
          endTime: dto.targetEndTime!,
          publicReferenceCode: reservation.publicReferenceCode,
          clientViewToken: reservation.clientViewToken,
        });
        break;
    }

    const updated = reservation.id
      ? await this.queries.findOne(reservation.id, user).catch(() => null)
      : null;
    if (updated) {
      this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, updated);
      this.events.emitToUser(
        reservation.clientId,
        SOCKET_EVENTS.RESERVATION_UPDATED,
        updated,
      );
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: reservation.serviceId,
        date: updated.reservationDate ?? reservation.reservationDate,
      });
    }
    return { ok: true, reservation: updated };
  }
}
