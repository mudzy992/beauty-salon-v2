import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationNotifyService } from './reservation-notify.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';

@Injectable()
export class ReservationRescheduleClientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly notify: ReservationNotifyService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async acceptReschedule(reservationId: string, userId: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.clientId !== userId)
      throw new ForbiddenException('Nemate pristup ovoj rezervaciji.');
    if (r.rescheduleStatus !== 'PENDING')
      throw new BadRequestException(
        'Nema aktivnog zahtjeva za potvrdu termina.',
      );
    if (
      !r.rescheduleProposedStartTime ||
      !r.rescheduleProposedEndTime
    ) {
      throw new BadRequestException(
        'Nedostaju predloženi podaci za novi termin.',
      );
    }
    const dayStart = this.dates.parseDateOnly(r.reservationDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const conflicts = await this.prisma.reservation.findFirst({
      where: {
        id: { not: r.id },
        confirmedStylistId: r.confirmedStylistId,
        reservationDate: { gte: dayStart, lte: dayEnd },
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
            RESERVATION_STATUS.IN_PROGRESS,
          ] as any,
        },
        OR: [
          {
            AND: [
              { startTime: { lt: r.rescheduleProposedEndTime } },
              { endTime: { gt: r.rescheduleProposedStartTime } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    if (conflicts) {
      throw new BadRequestException(
        'Novi termin više nije dostupan zbog preklapanja. Pokušajte ponovo.',
      );
    }
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        startTime: r.rescheduleProposedStartTime,
        endTime: r.rescheduleProposedEndTime,
        rescheduleStatus: 'ACCEPTED',
        rescheduleProposedStartTime: null,
        rescheduleProposedEndTime: null,
      },
    });
    await this.notify.notifyStylistAboutClientDecision(
      reservationId,
      'accepted',
    );
    return this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
  }

  async declineReschedule(reservationId: string, userId: string) {
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.clientId !== userId)
      throw new ForbiddenException('Nemate pristup ovoj rezervaciji.');
    if (r.rescheduleStatus !== 'PENDING')
      throw new BadRequestException(
        'Nema aktivnog zahtjeva za potvrdu termina.',
      );
    const pendingKind = await this.notify.getPendingRescheduleKind(
      reservationId,
    );
    const isReorder = pendingKind === 'reservation_reorder';
    const cancelStatus = !isReorder
      ? this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.CANCELLED_BY_CLIENT,
        )
      : null;
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: isReorder
        ? {
            rescheduleStatus: 'DECLINED',
            rescheduleProposedStartTime: null,
            rescheduleProposedEndTime: null,
          }
        : {
            status: cancelStatus!,
            cancelledAt: new Date(),
            cancelReason: 'Odbijena izmjena termina',
            rescheduleStatus: 'DECLINED',
            rescheduleProposedStartTime: null,
            rescheduleProposedEndTime: null,
          },
    });
    const updated = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['CLIENT'],
      username: '',
      email: '',
    });
    if (isReorder) {
      this.events.emitToAdmins(
        SOCKET_EVENTS.RESERVATION_UPDATED,
        updated,
      );
    } else {
      this.events.emitToAdmins(
        SOCKET_EVENTS.RESERVATION_CANCELLED,
        updated,
      );
      this.events.emitToAll(SOCKET_EVENTS.AVAILABILITY_CHANGED, {
        serviceId: r.serviceId,
        date: r.reservationDate,
      });
    }
    await this.notify.notifyStylistAboutClientDecision(
      reservationId,
      'declined',
    );
    return updated;
  }
}
