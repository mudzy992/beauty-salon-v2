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
import { apiError } from '../common/errors/api-error-codes';

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
    if (!r) throw new NotFoundException(apiError('MY_RESERVATIONS_NOT_FOUND'));
    if (!canStaffConfirmAttendance(r)) {
      throw new BadRequestException(apiError('RESERVATIONS_ATTENDANCE_REQUIRES_CONFIRMATION'),
      );
    }
    const isAdmin =
      user.roles.includes('SYSTEM_ADMIN') || user.roles.includes('OWNER');
    if (!isAdmin) {
      const profileId = await this.shared.getStylistProfileIdByUserId(user.sub);
      if (!profileId || profileId !== r.confirmedStylistId) {
        throw new ForbiddenException(apiError('RESERVATIONS_ATTENDANCE_PERMISSION'),
        );
      }
    }
    const startAt = this.dates.combineDateAndTime(
      r.reservationDate,
      r.startTime,
    );
    const now = new Date();
    if (now.getTime() >= startAt.getTime()) {
      throw new BadRequestException(apiError('RESERVATIONS_STAFF_ATTENDANCE_DEADLINE'),
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
