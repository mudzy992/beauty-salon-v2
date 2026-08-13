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
import { ReservationQueriesService } from './reservation-queries.service';
import {
  ATTENDANCE_CONFIRMED_BY,
  RESERVATION_STATUS,
} from './constants';
import { SOCKET_EVENTS } from '../events/socket-events';
import { canStaffConfirmAttendance } from './reservation-policy';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class ReservationStaffAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly dates: ReservationDateService,
    private readonly shared: ReservationSharedService,
    private readonly queries: ReservationQueriesService,
  ) {}

  async confirmAttendanceByStaff(id: string, user: CurrentUserPayload) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rezervacija nije pronađena.');
    if (!canStaffConfirmAttendance(r)) {
      throw new BadRequestException(
        'Rezervacija mora biti potvrđena i zahtijevati potvrdu dolaska klijenta.',
      );
    }
    const isAdmin =
      user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('OWNER');
    if (!isAdmin) {
      const profileId = await this.shared.getStylistProfileIdByUserId(user.sub);
      if (!profileId || profileId !== r.confirmedStylistId) {
        throw new ForbiddenException(
          'Samo dodijeljeni stilist ili admin može potvrditi dolazak.',
        );
      }
    }
    const startAt = this.dates.combineDateAndTime(
      r.reservationDate,
      r.startTime,
    );
    const now = new Date();
    if (now.getTime() >= startAt.getTime()) {
      throw new BadRequestException(
        'Rok za staff potvrdu dolaska je početak termina.',
      );
    }
    await this.prisma.reservation.update({
      where: { id },
      data: {
        status: this.shared.transitionTo(
          r.status,
          RESERVATION_STATUS.ATTENDANCE_CONFIRMED,
        ),
        attendanceConfirmedAt: now,
        attendanceConfirmedBy: ATTENDANCE_CONFIRMED_BY.STAFF,
      },
    });
    const confirmed = await this.queries.findOne(id, user);
    this.events.emitToAdmins(SOCKET_EVENTS.RESERVATION_UPDATED, confirmed);
    this.events.emitToStylists(SOCKET_EVENTS.RESERVATION_UPDATED, confirmed);
    this.events.emitToUser(
      r.clientId,
      SOCKET_EVENTS.RESERVATION_UPDATED,
      confirmed,
    );
    return confirmed;
  }
}
