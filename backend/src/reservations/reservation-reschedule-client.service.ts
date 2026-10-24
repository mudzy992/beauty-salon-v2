import {
  BadRequestException,
  ConflictException,
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
import {
  RESERVATION_STATUS,
  SLOT_OCCUPYING_STATUSES,
} from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { assertClientDayBookingAllowed } from './utils/assert-client-day-booking';
import { acquireReservationDayLock } from './utils/booking-advisory-lock';

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
    const snapshot = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { items: { select: { serviceId: true } } },
    });
    if (!snapshot) throw new NotFoundException('Rezervacija nije pronađena.');
    if (snapshot.clientId !== userId)
      throw new ForbiddenException('Nemate pristup ovoj rezervaciji.');
    if (snapshot.rescheduleStatus !== 'PENDING')
      throw new BadRequestException(
        'Nema aktivnog zahtjeva za potvrdu termina.',
      );
    if (
      !snapshot.rescheduleProposedStartTime ||
      !snapshot.rescheduleProposedEndTime
    ) {
      throw new BadRequestException(
        'Nedostaju predloženi podaci za novi termin.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await acquireReservationDayLock(tx, snapshot.reservationDate);
      const current = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { items: { select: { serviceId: true } } },
      });
      if (!current) throw new NotFoundException('Rezervacija nije pronađena.');
      if (current.clientId !== userId)
        throw new ForbiddenException('Nemate pristup ovoj rezervaciji.');
      if (
        current.reservationDate.getTime() !== snapshot.reservationDate.getTime()
      ) {
        throw new ConflictException(
          'Rezervacija je istovremeno pomjerena. Osvježite termin i pokušajte ponovo.',
        );
      }
      if (current.rescheduleStatus !== 'PENDING')
        throw new BadRequestException(
          'Nema aktivnog zahtjeva za potvrdu termina.',
        );
      const nextStart = current.rescheduleProposedStartTime;
      const nextEnd = current.rescheduleProposedEndTime;
      if (!nextStart || !nextEnd) {
        throw new BadRequestException(
          'Nedostaju predloženi podaci za novi termin.',
        );
      }

      if (current.confirmedStylistId) {
        const dayStart = this.dates.parseDateOnly(current.reservationDate);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCHours(23, 59, 59, 999);
        const conflict = await tx.reservation.findFirst({
          where: {
            id: { not: current.id },
            confirmedStylistId: current.confirmedStylistId,
            reservationDate: { gte: dayStart, lte: dayEnd },
            status: { in: [...SLOT_OCCUPYING_STATUSES] as any },
            startTime: { lt: nextEnd },
            endTime: { gt: nextStart },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new BadRequestException(
            'Novi termin više nije dostupan zbog preklapanja. Pokušajte ponovo.',
          );
        }
      }

      const serviceIds =
        current.items.length > 0
          ? current.items.map((item) => item.serviceId)
          : [current.serviceId];
      await assertClientDayBookingAllowed({
        prisma: tx,
        clientId: current.clientId,
        reservationDate: current.reservationDate,
        startTime: nextStart,
        endTime: nextEnd,
        serviceIds,
        excludeReservationId: current.id,
      });

      const updated = await tx.reservation.updateMany({
        where: {
          id: current.id,
          clientId: userId,
          rescheduleStatus: 'PENDING',
          rescheduleProposedStartTime: nextStart,
          rescheduleProposedEndTime: nextEnd,
        },
        data: {
          startTime: nextStart,
          endTime: nextEnd,
          rescheduleStatus: 'ACCEPTED',
          rescheduleProposedStartTime: null,
          rescheduleProposedEndTime: null,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'Zahtjev za promjenu termina je već obrađen. Osvježite rezervaciju.',
        );
      }
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
