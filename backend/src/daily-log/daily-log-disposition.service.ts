import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import { DailyLogAdminService } from './daily-log-admin.service';
import { DailyLogService } from './daily-log.service';
import { ReservationSharedService } from '../reservations/reservation-shared.service';
import { ReservationReorderService } from '../reservations/reservation-reorder.service';
import { ReservationQueriesService } from '../reservations/reservation-queries.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RESERVATION_STATUS } from '../reservations/constants';
import type { DailyLogDispositionDto } from './dto/daily-log-disposition.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class DailyLogDispositionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dailyLog: DailyLogService,
    private readonly dailyLogAdmin: DailyLogAdminService,
    private readonly shared: ReservationSharedService,
    @Inject(forwardRef(() => ReservationReorderService))
    private readonly reorder: ReservationReorderService,
    private readonly queries: ReservationQueriesService,
    private readonly notifications: NotificationsService,
    private readonly events: EventsGateway,
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
      throw new BadRequestException('Disposition je moguć samo za PENDING zapise.');
    }
    if (!entry.reservationId) {
      throw new BadRequestException('Zapis nije vezan za rezervaciju.');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: entry.reservationId },
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
    }

    await this.dailyLogAdmin.softDelete(entryId, { reason }, user);

    switch (dto.action) {
      case 'discard':
        await this.applyStylistCancel(reservation.id, reason, user.sub);
        break;
      case 'cancel_as_stylist':
        await this.applyStylistCancel(reservation.id, reason, user.sub);
        break;
      case 'cancel_as_client':
        await this.applyClientCancel(reservation.id, reason);
        break;
      case 'no_show':
        await this.applyNoShow(reservation.id, reason, dto.applyPenalty !== false);
        break;
      case 'reorder':
        await this.prisma.reservation.update({
          where: { id: reservation.id },
          data: {
            status: this.shared.transitionTo(
              reservation.status,
              RESERVATION_STATUS.CONFIRMED,
            ),
          },
        });
        await this.reorder.requestReorder(reservation.id, user.sub, {
          targetStartTime: dto.targetStartTime!,
          targetEndTime: dto.targetEndTime!,
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
        date: reservation.reservationDate,
      });
    }
    return { ok: true, reservation: updated };
  }

  private async applyStylistCancel(
    reservationId: string,
    reason: string,
    userId: string,
  ) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.CANCELLED_BY_STYLISTS,
        ),
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
    await this.notifyClientCancelled(reservationId, r.clientId, reason);
  }

  private async applyClientCancel(reservationId: string, reason: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.CANCELLED_BY_CLIENT,
        ),
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    });
    const salon = await this.prisma.salonSettings.findFirst();
    if (salon) {
      await this.shared.incrementCancellationCount(r.clientId, {
        maxCancellationsBeforePenalty: salon.maxCancellationsBeforePenalty,
        penaltyDurationDays: salon.penaltyDurationDays,
      });
    }
    await this.notifyClientCancelled(reservationId, r.clientId, reason);
  }

  private async applyNoShow(
    reservationId: string,
    reason: string,
    applyPenalty: boolean,
  ) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: this.shared.transitionTo(r.status, RESERVATION_STATUS.NO_SHOW),
        cancelledAt: new Date(),
        cancelReason: reason,
        rescheduleStatus: null,
        rescheduleProposedStartTime: null,
        rescheduleProposedEndTime: null,
      },
    });
    if (applyPenalty) {
      const salon = await this.prisma.salonSettings.findFirst();
      if (salon) {
        await this.shared.incrementCancellationCount(r.clientId, {
          maxCancellationsBeforePenalty: salon.maxCancellationsBeforePenalty,
          penaltyDurationDays: salon.penaltyDurationDays,
        });
      }
    }
    await this.notifications.send({
      userId: r.clientId,
      title: 'No-show',
      body: 'Rezervacija je označena kao "nije se pojavio/la". Ako je greška, kontaktirajte salon.',
      type: 'reservation_cancelled',
      data: { reservationId, kind: 'reservation_cancelled' },
      channel: 'PUSH',
    });
  }

  private async notifyClientCancelled(
    reservationId: string,
    clientId: string,
    reason: string,
  ) {
    const resWithClient = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        publicReferenceCode: true,
        clientViewToken: true,
      },
    });
    await this.notifications.send({
      userId: clientId,
      title: 'Rezervacija otkazana',
      body: reason,
      type: 'reservation_cancelled',
      data: {
        reservationId,
        kind: 'reservation_cancelled',
        publicReferenceCode: resWithClient?.publicReferenceCode,
        clientViewToken: resWithClient?.clientViewToken,
      },
      channel: 'PUSH',
    });
  }
}
