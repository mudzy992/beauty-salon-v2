import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ReservationDateService } from './reservation-date.service';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS } from './constants';
import { timeToMinutes } from './utils/time-slot.utils';

@Injectable()
export class ReservationReorderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async requestReorder(
    reservationId: string,
    userId: string,
    dto: { targetStartTime: string; targetEndTime: string },
  ) {
    const stylistProfileId =
      await this.shared.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const reservation = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        clientId: true,
        confirmedStylistId: true,
        reservationDate: true,
        startTime: true,
        endTime: true,
        status: true,
        serviceId: true,
        rescheduleStatus: true,
        rescheduleProposedStartTime: true,
        rescheduleProposedEndTime: true,
      },
    });
    if (!reservation)
      throw new NotFoundException('Rezervacija nije pronađena.');
    if (reservation.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može predložiti pomjeranje termina.',
      );
    }
    if (
      reservation.status !== RESERVATION_STATUS.CONFIRMED &&
      reservation.status !== RESERVATION_STATUS.ATTENDANCE_CONFIRMED
    ) {
      throw new BadRequestException(
        'Pomjeranje je moguće samo za potvrđene buduće termine.',
      );
    }
    const originalDuration =
      timeToMinutes(reservation.endTime) -
      timeToMinutes(reservation.startTime);
    const newDuration =
      timeToMinutes(dto.targetEndTime) -
      timeToMinutes(dto.targetStartTime);
    if (originalDuration !== newDuration) {
      throw new BadRequestException(
        'Pomjeranje je dozvoljeno samo na termin istog trajanja.',
      );
    }
    if (this.shared.isReservationBlocked(reservation)) {
      throw new BadRequestException(
        'Rezervacija već čeka potvrdu prethodne promjene.',
      );
    }
    const dayStart = this.dates.parseDateOnly(
      reservation.reservationDate,
    );
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const conflict = await this.prisma.reservation.findFirst({
      where: {
        id: { not: reservation.id },
        confirmedStylistId: stylistProfileId,
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
              { startTime: { lt: dto.targetEndTime } },
              { endTime: { gt: dto.targetStartTime } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    if (conflict)
      throw new BadRequestException('Odabrani termin je zauzet.');
    await this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        rescheduleProposedStartTime: dto.targetStartTime,
        rescheduleProposedEndTime: dto.targetEndTime,
        rescheduleStatus: 'PENDING',
      },
    });
    const sentAt = new Date();
    const confirmIn = this.shared.computeRescheduleDeadlineMinutes(
      sentAt,
      dto.targetStartTime,
      reservation.reservationDate,
    );
    await this.notifications.send({
      userId: reservation.clientId,
      title: 'Prijedlog pomjeranja termina',
      body: `Stilist predlaže novi termin ${dto.targetStartTime}–${dto.targetEndTime}. Potvrdite u narednih ${confirmIn} min.`,
      type: 'reservation_reminder',
      data: {
        kind: 'reservation_reorder',
        reservationId: reservation.id,
        confirmationDeadlineMinutes: confirmIn,
        createdAt: sentAt.toISOString(),
      },
      channel: 'PUSH',
    });
    return this.queries.findOne(reservation.id, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
  }
}
