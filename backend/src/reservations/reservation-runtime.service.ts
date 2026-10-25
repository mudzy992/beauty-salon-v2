import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ReservationDateService } from './reservation-date.service';
import { getDateOnlyDayBounds } from '../common/utils/date-only';
import { ReservationSharedService } from './reservation-shared.service';
import { ReservationQueriesService } from './reservation-queries.service';
import { RESERVATION_STATUS } from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { canStartReservation } from './reservation-policy';

@Injectable()
export class ReservationRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async stylistMarkComplete(reservationId: string, userId: string) {
    const stylistProfileId =
      await this.shared.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, confirmedStylistId: true, status: true },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može označiti rezervaciju kao završenu.',
      );
    }
    throw new BadRequestException(
      'Rezervacija se završava isključivo preko dnevne knjige (unos iz rezervacije, zatim kompletiranje).',
    );
  }

  async stylistStart(reservationId: string, userId: string) {
    const stylistProfileId =
      await this.shared.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može startovati ovu rezervaciju.',
      );
    }
    if (!canStartReservation(r)) {
      throw new BadRequestException(
        'Rezervacija još ne ispunjava uslove za start.',
      );
    }
    const now = new Date();
    const plannedStart = this.dates.combineDateAndTime(
      r.reservationDate,
      r.startTime,
    );
    if (now.getTime() < plannedStart.getTime()) {
      throw new BadRequestException(
        'Termin još nije počeo. Start je dozvoljen tek od planiranog vremena početka.',
      );
    }
    const { gte, lt } = getDateOnlyDayBounds(
      this.dates.toDateOnlyString(r.reservationDate),
    );
    const earlierPending = await this.prisma.reservation.findFirst({
      where: {
        id: { not: r.id },
        confirmedStylistId: stylistProfileId,
        reservationDate: { gte, lt },
        startTime: { lt: r.startTime },
        status: {
          in: [
            RESERVATION_STATUS.CONFIRMED,
            RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
          ] as any,
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
      },
      orderBy: { startTime: 'asc' },
    });
    if (earlierPending) {
      throw new BadRequestException(
        `Postoji raniji termin (${earlierPending.startTime}–${earlierPending.endTime}) koji prvo morate obraditi.`,
      );
    }
    if (this.shared.isReservationBlocked(r)) {
      throw new BadRequestException(
        'Rezervacija čeka potvrdu klijenta za novi termin. Start nije dozvoljen dok se zahtjev ne riješi.',
      );
    }
    const plannedEnd = this.dates.combineDateAndTime(
      r.reservationDate,
      r.endTime,
    );
    const latestStart = new Date(plannedEnd.getTime() + 60 * 60 * 1000);
    if (now.getTime() > latestStart.getTime()) {
      throw new BadRequestException(
        'Termin je probijen. Prvo odaberite akciju kašnjenja (rekalkulacija ili korištenje pauze).',
      );
    }
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.IN_PROGRESS,
        ),
        startedAt: now,
      },
    });
    const updated = await this.queries.findOne(reservationId, {
      sub: userId,
      roles: ['STYLIST'],
      username: '',
      email: '',
    });
    this.events.emitToAdmins(
      SOCKET_EVENTS.RESERVATION_UPDATED,
      updated,
    );
    this.events.emitToUser(
      r.clientId,
      SOCKET_EVENTS.RESERVATION_UPDATED,
      updated,
    );
    return updated;
  }

  async setUseBreakAfterOverrun(
    reservationId: string,
    userId: string,
    useBreak: boolean,
  ) {
    const stylistProfileId =
      await this.shared.getStylistProfileIdByUserId(userId);
    if (!stylistProfileId)
      throw new ForbiddenException('Nemate profil stilista.');
    const r = await this.prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, confirmedStylistId: true, status: true },
    });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (r.confirmedStylistId !== stylistProfileId) {
      throw new ForbiddenException(
        'Samo potvrđeni stilist može označiti korištenje pauze.',
      );
    }
    if (r.status !== RESERVATION_STATUS.IN_PROGRESS) {
      throw new BadRequestException(
        'Pauzu možete označiti samo dok je termin u toku.',
      );
    }
    await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        useBreakAfterOverrun: useBreak,
        useBreakDecidedAt: new Date(),
      },
    });
    return { ok: true };
  }
}
